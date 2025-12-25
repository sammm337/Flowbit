// src/index.ts
import { writeFile } from 'fs/promises'; // Import file writer
import { initDB, getAllMemories, getInvoiceHistory, saveProcessedInvoice } from './db';
import { recallMemories, applyMemories } from './memory';
import { findDuplicateInvoice } from './utils';
import { learnFromCorrection } from './learning';
import {
    invoiceA1, correctionA1, invoiceA2, invoiceA3, correctionA3,
    invoiceB1, correctionB1, invoiceB2,
    invoiceC1, correctionC1, invoiceC2,
    invoiceA4, invoiceB4
} from './data';
import type { ExtractedInvoice, ProcessingResult } from './types';

const processInvoice = async (
    invoice: ExtractedInvoice,
    stepName: string
): Promise<ProcessingResult> => {
    // 1. Recall Memories
    const memories = await recallMemories(invoice.vendor);

    // 2. Apply Memories
    let result = applyMemories(invoice, memories);

    // 3. DUPLICATE DETECTION
    const history = await getInvoiceHistory();
    const duplicateId = findDuplicateInvoice(
        invoice.invoiceId, 
        invoice.vendor, 
        invoice.fields.invoiceDate, 
        history
    );

    if (duplicateId) {
        result.requiresHumanReview = true;
        result.proposedCorrections.push(`FLAG_DUPLICATE: Possible duplicate of ${duplicateId}`);
        result.reasoning = `Flagged for review: High similarity to processed invoice ${duplicateId} from same vendor within 7 days.`;
        result.confidenceScore = 0.0; // Drop confidence to 0 for duplicates
        
        result.auditTrail.push({
            step: 'decide',
            timestamp: new Date().toISOString(),
            details: `Duplicate detected matching ${duplicateId}`
        });
    }

    // 4. Save to History (if not a duplicate)
    if (!duplicateId) {
        await saveProcessedInvoice({
            invoiceId: invoice.invoiceId,
            vendor: invoice.vendor,
            invoiceDate: invoice.fields.invoiceDate
        });
    }

    // REMOVED: console.log(JSON.stringify(result, null, 2));
    // Instead, we just return the result to be collected.
    console.log(`[Step ${stepName}] Processed ${invoice.invoiceId}`);
    
    return result;
};

// Helper to simulate human review in the console (logs only)
const simulateHumanReview = (invoiceId: string, corrections: any[]) => {
    console.error(`\n[Human Review Simulation for ${invoiceId}]`);
    corrections.forEach(c => {
        console.error(`  - Fixing ${c.field}: ${c.reason}`);
    });
};

const printMemorySummary = async () => {
    const allMemories = await getAllMemories();
    console.error(`\n[Memory DB Summary: ${allMemories.length} records]`);
};

const runDemo = async () => {
    console.error('\n--- STARTING DEMO ---\n');
    await initDB();

    // Collection array for all outputs
    const allResults: ProcessingResult[] = [];

    // SCENARIO 1: Supplier GmbH
    console.error('\n# Scenario 1: Learning Service Date');
    allResults.push(await processInvoice(invoiceA1, '1.1'));
    
    simulateHumanReview('INV-A-001', correctionA1.corrections);
    await learnFromCorrection(correctionA1);
    
    allResults.push(await processInvoice(invoiceA2, '1.2'));

    // SCENARIO 2: PO Matching
    console.error('\n# Scenario 2: PO Matching');
    allResults.push(await processInvoice(invoiceA3, '2.1'));
    
    simulateHumanReview('INV-A-003', correctionA3.corrections);
    await learnFromCorrection(correctionA3);

    // SCENARIO 3: VAT Included
    console.error('\n# Scenario 3: VAT Calculation');
    allResults.push(await processInvoice(invoiceB1, '3.1'));
    
    simulateHumanReview('INV-B-001', correctionB1.corrections);
    await learnFromCorrection(correctionB1);
    
    allResults.push(await processInvoice(invoiceB2, '3.2'));

    // SCENARIO 4: Skonto & SKU
    console.error('\n# Scenario 4: Skonto & SKU');
    allResults.push(await processInvoice(invoiceC1, '4.1'));
    
    simulateHumanReview('INV-C-001', correctionC1.corrections);
    await learnFromCorrection(correctionC1);
    
    allResults.push(await processInvoice(invoiceC2, '4.2'));

    // SCENARIO 5: Duplicates
    console.error('\n# Scenario 5: Duplicate Detection');
    allResults.push(await processInvoice(invoiceA4, '5.1')); 
    allResults.push(await processInvoice(invoiceB4, '5.2')); // Should flag as duplicate

    await printMemorySummary();

    // WRITE OUTPUT TO FILE
    console.error('\nWriting results to output.json...');
    await writeFile('output.json', JSON.stringify(allResults, null, 2));
    console.error('Done! Check output.json for the full report.');
    
    console.error('\n--- DEMO COMPLETE ---');
};

runDemo().catch(console.error);