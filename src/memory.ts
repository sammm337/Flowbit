// src/memory.ts
import { getMemories, saveMemory } from './db';
import { extractWithRegex, calculateTaxInclusive } from './utils';
import type { 
    ExtractedInvoice, 
    ProcessingResult, 
    InvoiceFields, 
    Memory, 
    AuditLog 
} from './types';
import { THRESHOLDS } from './types';
import _ from 'lodash';

export const recallMemories = async (vendor: string): Promise<Memory[]> => {
    return await getMemories(vendor);
};

export const applyMemories = (
    invoice: ExtractedInvoice,
    memories: Memory[]
): ProcessingResult => {
    const normalizedInvoice: InvoiceFields = _.cloneDeep(invoice.fields);
    const proposedCorrections: string[] = [];
    const memoryUpdates: string[] = [];
    const auditTrail: AuditLog[] = [];
    let confidenceScore = invoice.confidence;

    auditTrail.push({
        step: 'recall',
        timestamp: new Date().toISOString(),
        details: `Fetched ${memories.length} memories for vendor: ${invoice.vendor}`
    });

    // Sort by confidence (highest first)
    const sortedMemories = memories.sort((a, b) => b.confidence - a.confidence);

    for (const memory of sortedMemories) {
        // Only apply high-confidence memories
        if (memory.confidence < THRESHOLDS.MEMORY_APPLICATION) {
            continue;
        }

        let applied = false;
        let extracted: any = null;

        // Apply based on memory key and pattern type
        switch (memory.key) {
            case 'serviceDate_extraction':
                if (!normalizedInvoice.serviceDate && memory.pattern.type === 'regex') {
                    extracted = extractWithRegex(invoice.rawText, memory.pattern.value as any);
                    if (extracted) {
                        normalizedInvoice.serviceDate = extracted;
                        proposedCorrections.push(
                            `Extracted Service Date: ${extracted} (from Leistungsdatum pattern)`
                        );
                        applied = true;
                    }
                }
                break;

            case 'currency_recovery':
                if (!normalizedInvoice.currency && memory.pattern.type === 'regex') {
                    extracted = extractWithRegex(invoice.rawText, memory.pattern.value as any);
                    if (extracted) {
                        normalizedInvoice.currency = extracted;
                        proposedCorrections.push(`Recovered Currency: ${extracted}`);
                        applied = true;
                    }
                }
                break;

            case 'vat_included_detection':
                if (memory.pattern.type === 'regex') {
                    const match = new RegExp((memory.pattern.value as any).pattern, 'i').test(invoice.rawText);
                    if (match) {
                        normalizedInvoice.vatIncluded = true;
                        const recalc = calculateTaxInclusive(
                            normalizedInvoice.grossTotal,
                            normalizedInvoice.taxRate
                        );
                        normalizedInvoice.netTotal = recalc.netTotal;
                        normalizedInvoice.taxTotal = recalc.taxTotal;
                        proposedCorrections.push(
                            `Detected VAT-inclusive pricing. Recalculated: Net=${recalc.netTotal}, Tax=${recalc.taxTotal}`
                        );
                        applied = true;
                    }
                }
                break;

            case 'po_matching':
                if (!normalizedInvoice.poNumber && memory.pattern.type === 'regex') {
                    extracted = extractWithRegex(invoice.rawText, memory.pattern.value as any);
                    if (extracted) {
                        normalizedInvoice.poNumber = extracted;
                        proposedCorrections.push(`Matched PO Number: ${extracted}`);
                        applied = true;
                    }
                }
                break;

            case 'skonto_terms':
                if (memory.pattern.type === 'regex') {
                    extracted = extractWithRegex(invoice.rawText, memory.pattern.value as any);
                    if (extracted) {
                        normalizedInvoice.paymentTerms = extracted;
                        proposedCorrections.push(`Detected Skonto terms: ${extracted}`);
                        applied = true;
                    }
                }
                break;

            case 'sku_mapping':
                // Map description to SKU for line items
                if (memory.pattern.type === 'rule') {
                    const rule = memory.pattern.value as any;
                    normalizedInvoice.lineItems.forEach(item => {
                        if (!item.sku && item.description?.toLowerCase().includes(rule.keyword)) {
                            item.sku = rule.mappedSku;
                            proposedCorrections.push(
                                `Mapped "${item.description}" to SKU: ${rule.mappedSku}`
                            );
                            applied = true;
                        }
                    });
                }
                break;
        }

        if (applied) {
            // Update memory statistics
            memory.successCount++;
            memory.lastUsed = new Date().toISOString();
            memory.hitCount++;
            
            // Boost confidence slightly on successful application
            memory.confidence = Math.min(1.0, memory.confidence + 0.02);
            
            saveMemory(memory); // Save updated stats
            
            memoryUpdates.push(
                `Applied memory [${memory.key}] with confidence ${memory.confidence.toFixed(2)}`
            );
            
            auditTrail.push({
                step: 'apply',
                timestamp: new Date().toISOString(),
                details: `Applied memory [${memory.key}]: ${proposedCorrections[proposedCorrections.length - 1]}`
            });

            // Boost overall confidence when we successfully apply memories
            confidenceScore = Math.min(1.0, confidenceScore + 0.03);
        }
    }

    // Decision logic
    const requiresHumanReview = decideReviewNeed(
        normalizedInvoice,
        confidenceScore,
        proposedCorrections.length
    );

    auditTrail.push({
        step: 'decide',
        timestamp: new Date().toISOString(),
        details: requiresHumanReview 
            ? `Flagged for review. Confidence: ${confidenceScore.toFixed(2)}`
            : `Auto-approved. Confidence: ${confidenceScore.toFixed(2)}`
    });

    const reasoning = generateReasoning(
        proposedCorrections,
        confidenceScore,
        requiresHumanReview
    );

    return {
        invoiceId: invoice.invoiceId,
        normalizedInvoice,
        proposedCorrections,
        requiresHumanReview,
        reasoning,
        confidenceScore,
        memoryUpdates,
        auditTrail
    };
};

const decideReviewNeed = (
    invoice: InvoiceFields,
    confidence: number,
    correctionCount: number
): boolean => {
    // Auto-approve if high confidence and all critical fields present
    if (confidence >= THRESHOLDS.AUTO_APPROVE && 
        invoice.invoiceNumber &&
        invoice.currency &&
        invoice.grossTotal > 0) {
        return false;
    }

    // Auto-correct zone: medium confidence with known patterns
    if (confidence >= THRESHOLDS.AUTO_CORRECT && correctionCount > 0 && correctionCount <= 2) {
        return false;
    }

    // Otherwise, needs review
    return true;
};

const generateReasoning = (
    corrections: string[],
    confidence: number,
    needsReview: boolean
): string => {
    if (corrections.length === 0) {
        return `No vendor-specific patterns applied. Confidence: ${(confidence * 100).toFixed(1)}%. ${needsReview ? 'Requires review due to missing critical fields.' : 'Auto-approved.'}`;
    }

    const correctionSummary = corrections.length === 1 
        ? '1 correction' 
        : `${corrections.length} corrections`;

    return `Applied ${correctionSummary} based on learned vendor patterns. Confidence: ${(confidence * 100).toFixed(1)}%. ${needsReview ? 'Flagged for human verification.' : 'Auto-approved based on high confidence.'}`;
};