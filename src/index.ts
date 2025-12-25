// src/index.ts
import { initDB, getAllMemories } from './db';
import { recallMemories, applyMemories } from './memory';
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
    console.log(`\n${'='.repeat(70)}`);
    console.log(`STEP ${stepName}: Processing ${invoice.invoiceId} (${invoice.vendor})`);
    console.log('='.repeat(70));

    const memories = await recallMemories(invoice.vendor);
    console.log(`Recall: Found ${memories.length} relevant memories`);

    const result = applyMemories(invoice, memories);
    console.log(`\nStatus: ${result.requiresHumanReview ? 'NEEDS REVIEW' : 'AUTO-APPROVED'}`);
    console.log(`Confidence: ${(result.confidenceScore * 100).toFixed(1)}%`);

    if (result.proposedCorrections.length > 0) {
        console.log(`\nProposed Corrections:`);
        result.proposedCorrections.forEach(c => console.log(`  - ${c}`));
    }

    if (result.memoryUpdates.length > 0) {
        console.log(`\nMemory Updates:`);
        result.memoryUpdates.forEach(u => console.log(`  - ${u}`));
    }

    console.log(`\nReasoning: ${result.reasoning}`);
    return result;
};

const simulateHumanReview = (invoiceId: string, corrections: any[]) => {
    console.log(`\n${'~'.repeat(70)}`);
    console.log(`HUMAN REVIEW: ${invoiceId}`);
    console.log('~'.repeat(70));
    console.log('Human corrections applied:');
    corrections.forEach(c => {
        console.log(`  - ${c.field}: ${c.from} → ${c.to}`);
        console.log(`    Reason: ${c.reason}`);
    });
};

const printMemorySummary = async () => {
    const allMemories = await getAllMemories();
    console.log(`\n${'='.repeat(70)}`);
    console.log('MEMORY DATABASE SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Memories: ${allMemories.length}\n`);

    const byVendor = allMemories.reduce((acc, m) => {
        acc[m.vendor] = (acc[m.vendor] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    Object.entries(byVendor).forEach(([vendor, count]) => {
        console.log(`${vendor}: ${count} memories`);
        const vendorMems = allMemories.filter(m => m.vendor === vendor);
        vendorMems.forEach(m => {
            console.log(`  - [${m.type}] ${m.key} (conf: ${m.confidence.toFixed(2)}, hits: ${m.hitCount})`);
        });
    });
};

const runDemo = async () => {
    console.log('\n');
    console.log('*'.repeat(70));
    console.log('*' + ' '.repeat(68) + '*');
    console.log('*' + '  AI AGENT WITH ADAPTIVE MEMORY - COMPREHENSIVE DEMO'.padEnd(68) + '*');
    console.log('*' + ' '.repeat(68) + '*');
    console.log('*'.repeat(70));

    await initDB();

    // ========================================
    // SCENARIO 1: Supplier GmbH - Service Date
    // ========================================
    console.log('\n\n');
    console.log('#'.repeat(70));
    console.log('# SCENARIO 1: Supplier GmbH - Service Date Extraction Learning');
    console.log('#'.repeat(70));

    await processInvoice(invoiceA1, '1.1');
    simulateHumanReview('INV-A-001', correctionA1.corrections);
    await learnFromCorrection(correctionA1);

    await processInvoice(invoiceA2, '1.2');
    console.log('\nEXPECTED: Service Date should be auto-extracted using learned pattern');

    // ========================================
    // SCENARIO 2: Supplier GmbH - PO Matching
    // ========================================
    console.log('\n\n');
    console.log('#'.repeat(70));
    console.log('# SCENARIO 2: Supplier GmbH - PO Number Matching');
    console.log('#'.repeat(70));

    await processInvoice(invoiceA3, '2.1');
    simulateHumanReview('INV-A-003', correctionA3.corrections);
    await learnFromCorrection(correctionA3);

    // ========================================
    // SCENARIO 3: Parts AG - VAT Included
    // ========================================
    console.log('\n\n');
    console.log('#'.repeat(70));
    console.log('# SCENARIO 3: Parts AG - VAT Included Recalculation');
    console.log('#'.repeat(70));

    await processInvoice(invoiceB1, '3.1');
    simulateHumanReview('INV-B-001', correctionB1.corrections);
    await learnFromCorrection(correctionB1);

    await processInvoice(invoiceB2, '3.2');
    console.log('\nEXPECTED: VAT should be detected and recalculated, currency recovered');

    // ========================================
    // SCENARIO 4: Freight & Co - Skonto & SKU
    // ========================================
    console.log('\n\n');
    console.log('#'.repeat(70));
    console.log('# SCENARIO 4: Freight & Co - Skonto Terms and SKU Mapping');
    console.log('#'.repeat(70));

    await processInvoice(invoiceC1, '4.1');
    simulateHumanReview('INV-C-001', correctionC1.corrections);
    await learnFromCorrection(correctionC1);

    await processInvoice(invoiceC2, '4.2');
    console.log('\nEXPECTED: Skonto terms detected, shipping description mapped to FREIGHT SKU');

    // ========================================
    // SCENARIO 5: Duplicate Detection
    // ========================================
    console.log('\n\n');
    console.log('#'.repeat(70));
    console.log('# SCENARIO 5: Duplicate Invoice Detection');
    console.log('#'.repeat(70));

    await processInvoice(invoiceA4, '5.1');
    const result = await processInvoice(invoiceB4, '5.2');

    if (invoiceA4.invoiceId === invoiceB4.invoiceId &&
        invoiceA4.vendor === invoiceB4.vendor) {
        console.log('\nWARNING: Potential duplicate detected!');
        console.log(`Invoice ${invoiceB4.invoiceId} from ${invoiceB4.vendor} may be a duplicate`);
    }

    // ========================================
    // FINAL SUMMARY
    // ========================================
    await printMemorySummary();

    console.log('\n\n');
    console.log('*'.repeat(70));
    console.log('*' + ' '.repeat(68) + '*');
    console.log('*' + '  DEMO COMPLETE - System has learned and applied patterns!'.padEnd(68) + '*');
    console.log('*' + ' '.repeat(68) + '*');
    console.log('*'.repeat(70));
    console.log('\n');
};

runDemo().catch(console.error);