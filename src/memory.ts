// src/memory.ts
import { getMemories } from './db';
import type { ExtractedInvoice, ProcessingResult, InvoiceFields, Memory, AuditLog } from './types';
import _ from 'lodash'; // Helpful for deep cloning objects

// 1. RECALL: Fetch relevant knowledge
export const recallMemories = async (vendor: string): Promise<Memory[]> => {
    return await getMemories(vendor);
};

// 2. APPLY: Use knowledge to fix the invoice
export const applyMemories = (
    invoice: ExtractedInvoice,
    memories: Memory[]
): ProcessingResult => {
    // Start with a clean clone of the extracted fields
    // We use cloneDeep so we don't accidentally mess up the original raw data
    const normalizedInvoice: InvoiceFields = _.cloneDeep(invoice.fields);
    
    const proposedCorrections: string[] = [];
    const auditTrail: AuditLog[] = [];
    let requiresHumanReview = false;
    let confidenceScore = invoice.confidence; // Start with the OCR confidence

    // Log the initial state
    auditTrail.push({
        step: 'recall',
        timestamp: new Date().toISOString(),
        details: `Fetched ${memories.length} memories for vendor: ${invoice.vendor}`
    });

    // Sort memories by confidence (highest first) so strong memories override weak ones
    const sortedMemories = memories.sort((a, b) => b.confidence - a.confidence);

    for (const memory of sortedMemories) {
        // We only apply memories if they are confident enough (e.g., > 70%)
        if (memory.confidence < 0.7) continue;

        let applied = false;

        // --- Logic for different Memory Keys ---
        
        // Example 1: The Vendor usually sends a specific Currency (e.g., "EUR")
        if (memory.key === 'currency_fix' && normalizedInvoice.currency !== memory.value) {
            const oldValue = normalizedInvoice.currency;
            normalizedInvoice.currency = memory.value;
            proposedCorrections.push(`Updated Currency from ${oldValue} to ${memory.value}`);
            applied = true;
        }

        // Example 2: The Vendor's "Service Date" is often missed by OCR
        if (memory.key === 'serviceDate_fill' && !normalizedInvoice.serviceDate) {
            // In a real app, 'value' might be a regex or a complex rule. 
            // For this demo, we assume the memory holds a hardcoded date or logic instruction.
            // Let's pretend the memory value is the date itself for simplicity in this step.
            normalizedInvoice.serviceDate = memory.value;
            proposedCorrections.push(`Filled missing Service Date with ${memory.value}`);
            applied = true;
        }

        // Example 3: Tax Rate Correction
        if (memory.key === 'taxRate_fix' && normalizedInvoice.taxRate !== memory.value) {
            normalizedInvoice.taxRate = memory.value;
            // Re-calculate tax total based on new rate
            const newTaxTotal = normalizedInvoice.netTotal * memory.value;
            proposedCorrections.push(`Adjusted Tax Rate to ${memory.value * 100}% and recalculated Tax Total`);
            normalizedInvoice.taxTotal = Number(newTaxTotal.toFixed(2));
            applied = true;
        }

        if (applied) {
            auditTrail.push({
                step: 'apply',
                timestamp: new Date().toISOString(),
                details: `Applied memory [${memory.key}]: ${proposedCorrections[proposedCorrections.length - 1]}`
            });
            // Slightly boost confidence if we successfully applied a trusted memory
            confidenceScore = Math.min(1.0, confidenceScore + 0.05);
        }
    }

    // Heuristic: If we made corrections, we might want a human to check it initially
    if (proposedCorrections.length > 0) {
        requiresHumanReview = true;
    }

    return {
        invoiceId: invoice.invoiceId,
        normalizedInvoice,
        proposedCorrections,
        requiresHumanReview,
        reasoning: proposedCorrections.length > 0 
            ? `Applied ${proposedCorrections.length} corrections based on past vendor behavior.` 
            : "No relevant memories found to improve extraction.",
        confidenceScore,
        memoryUpdates: [], // We will handle 'Learning' in Phase 3
        auditTrail
    };
};