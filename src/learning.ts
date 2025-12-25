// src/learning.ts
import { saveMemory, getMemories } from './db.js';
import type { HumanCorrection, Memory } from './types.js';

export const learnFromCorrection = async (correction: HumanCorrection) => {
    console.log(`🧠 Learning process started for vendor: ${correction.vendor}`);
    
    // 1. Get existing knowledge about this vendor
    const existingMemories = await getMemories(correction.vendor);

    // 2. Loop through each specific correction the human made
    for (const item of correction.corrections) {
        let memoryKey = '';
        
        // Map the corrected field to a specific "Memory Key"
        // In a real system, this would be more dynamic, but simple maps work for now.
        if (item.field === 'currency') memoryKey = 'currency_fix';
        if (item.field === 'serviceDate') memoryKey = 'serviceDate_fill';
        if (item.field === 'taxRate') memoryKey = 'taxRate_fix';

        if (!memoryKey) {
            console.log(`   Skipping unknown field: ${item.field}`);
            continue;
        }

        // 3. Check if we already knew this
        const knownMemory = existingMemories.find(m => m.key === memoryKey);

        if (knownMemory) {
            // REINFORCEMENT: We knew this, but maybe the value changed or we just need to be more confident.
            // If the human's value matches our memory, boost confidence!
            // If it's different, overwrite it (correction).
            knownMemory.value = item.to;
            knownMemory.confidence = Math.min(1.0, knownMemory.confidence + 0.1); // Boost confidence
            knownMemory.lastUsed = new Date().toISOString();
            knownMemory.hitCount += 1;
            
            await saveMemory(knownMemory);
            console.log(`   ✅ Updated existing memory for '${memoryKey}'. New Confidence: ${knownMemory.confidence}`);
        } else {
            // NEW LEARNING: We didn't know this pattern existed. Create it.
            const newMemory: Memory = {
                id: `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // Simple unique ID
                type: 'correction',
                vendor: correction.vendor,
                key: memoryKey,
                value: item.to,
                confidence: 0.6, // Start with moderate confidence
                lastUsed: new Date().toISOString(),
                hitCount: 1
            };

            await saveMemory(newMemory);
            console.log(`   ✨ Created NEW memory for '${memoryKey}'`);
        }
    }
};