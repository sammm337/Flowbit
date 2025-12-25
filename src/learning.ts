// src/learning.ts
import { saveMemory, getMemories } from './db';
import type { HumanCorrection, Memory, MemoryPattern, RegexPattern } from './types';

export const learnFromCorrection = async (correction: HumanCorrection) => {
    console.log(`\n🧠 Learning from correction for ${correction.vendor}...`);
    
    const existingMemories = await getMemories(correction.vendor);

    // Store resolution decision
    await storeResolutionMemory(correction, existingMemories);

    // Learn from specific corrections
    for (const item of correction.corrections) {
        await processCorrection(item, correction, existingMemories);
    }
};

const storeResolutionMemory = async (
    correction: HumanCorrection,
    existingMemories: Memory[]
) => {
    const resolutionKey = `resolution_${correction.finalDecision}`;
    let resolutionMemory = existingMemories.find(
        m => m.type === 'resolution' && m.key === resolutionKey
    );

    if (resolutionMemory) {
        resolutionMemory.hitCount++;
        resolutionMemory.lastUsed = new Date().toISOString();
        await saveMemory(resolutionMemory);
    } else {
        const newResolution: Memory = {
            id: generateId(),
            type: 'resolution',
            vendor: correction.vendor,
            key: resolutionKey,
            pattern: {
                type: 'static',
                value: correction.finalDecision
            },
            confidence: 0.5,
            lastUsed: new Date().toISOString(),
            hitCount: 1,
            successCount: 0,
            failureCount: 0,
            metadata: {
                createdFrom: correction.invoiceId
            }
        };
        await saveMemory(newResolution);
        console.log(`   ✨ Created resolution memory: ${resolutionKey}`);
    }
};

const processCorrection = async (
    item: any,
    correction: HumanCorrection,
    existingMemories: Memory[]
) => {
    const memoryKey = mapFieldToMemoryKey(item.field, item.reason);
    
    if (!memoryKey) {
        console.log(`   ⚠️ Skipping unknown field: ${item.field}`);
        return;
    }

    const pattern = inferPattern(item, correction);
    const existingMemory = existingMemories.find(m => m.key === memoryKey);

    if (existingMemory) {
        // Reinforcement
        existingMemory.pattern = pattern;
        existingMemory.confidence = Math.min(1.0, existingMemory.confidence + 0.1);
        existingMemory.lastUsed = new Date().toISOString();
        existingMemory.hitCount++;
        existingMemory.metadata = {
            ...existingMemory.metadata,
            humanVerified: true
        };
        
        await saveMemory(existingMemory);
        console.log(`   ✅ Reinforced memory [${memoryKey}]. New confidence: ${existingMemory.confidence.toFixed(2)}`);
    } else {
        // New learning
        const newMemory: Memory = {
            id: generateId(),
            type: determineMemoryType(memoryKey),
            vendor: correction.vendor,
            key: memoryKey,
            pattern,
            confidence: 0.65,
            lastUsed: new Date().toISOString(),
            hitCount: 1,
            successCount: 0,
            failureCount: 0,
            metadata: {
                createdFrom: correction.invoiceId,
                humanVerified: true,
                notes: item.reason
            }
        };
        
        await saveMemory(newMemory);
        console.log(`   ✨ Created NEW memory [${memoryKey}] (type: ${newMemory.type})`);
    }
};

const mapFieldToMemoryKey = (field: string, reason: string): string | null => {
    const reasonLower = reason.toLowerCase();
    
    if (field === 'serviceDate' && reasonLower.includes('leistungsdatum')) {
        return 'serviceDate_extraction';
    }
    if (field === 'currency') {
        return 'currency_recovery';
    }
    if (field === 'taxRate' || field === 'netTotal' || field === 'taxTotal') {
        if (reasonLower.includes('inkl') || reasonLower.includes('included')) {
            return 'vat_included_detection';
        }
    }
    if (field === 'poNumber') {
        return 'po_matching';
    }
    if (field === 'paymentTerms' && reasonLower.includes('skonto')) {
        return 'skonto_terms';
    }
    if (field === 'sku' || (field === 'lineItems' && reasonLower.includes('sku'))) {
        return 'sku_mapping';
    }
    
    return null;
};

const inferPattern = (item: any, correction: HumanCorrection): MemoryPattern => {
    const reason = item.reason.toLowerCase();
    
    // Service Date extraction (Leistungsdatum)
    if (item.field === 'serviceDate' && reason.includes('leistungsdatum')) {
        return {
            type: 'regex',
            value: {
                pattern: 'Leistungsdatum:?\\s*(\\d{2}\\.\\d{2}\\.\\d{4})',
                flags: 'i',
                captureGroup: 1,
                transform: 'parseGermanDate'
            } as RegexPattern
        };
    }
    
    // Currency recovery
    if (item.field === 'currency') {
        return {
            type: 'regex',
            value: {
                pattern: '(EUR|USD|GBP|CHF)',
                flags: 'i',
                captureGroup: 1,
                transform: 'uppercase'
            } as RegexPattern
        };
    }
    
    // VAT included detection
    if (reason.includes('inkl') || reason.includes('included')) {
        return {
            type: 'regex',
            value: {
                pattern: '(MwSt\\.?\\s*inkl|VAT\\s*incl|prices?\\s*incl)',
                flags: 'i',
                captureGroup: 0
            } as RegexPattern
        };
    }
    
    // PO matching
    if (item.field === 'poNumber') {
        return {
            type: 'regex',
            value: {
                pattern: 'PO[\\s-]?([A-Z]-\\d{3})',
                flags: 'i',
                captureGroup: 1
            } as RegexPattern
        };
    }
    
    // Skonto terms
    if (reason.includes('skonto')) {
        return {
            type: 'regex',
            value: {
                pattern: '(\\d+%\\s*Skonto.*?\\d+\\s*Tage)',
                flags: 'i',
                captureGroup: 1
            } as RegexPattern
        };
    }
    
    // SKU mapping
    if (item.field === 'sku' || reason.includes('mapping')) {
        return {
            type: 'rule',
            value: {
                keyword: item.from?.description?.toLowerCase() || 'freight',
                mappedSku: item.to
            }
        };
    }
    
    // Fallback: static value
    return {
        type: 'static',
        value: item.to
    };
};

const determineMemoryType = (key: string): Memory['type'] => {
    if (key.includes('extraction') || key.includes('recovery') || key.includes('detection')) {
        return 'vendor-pattern';
    }
    return 'correction';
};

const generateId = (): string => {
    return `mem-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};