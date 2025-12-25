// src/db.ts
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import type { Memory } from './types';

// Define the structure of our database
interface Data {
    memories: Memory[];
}

// Initialize the database adapter
const adapter = new JSONFile<Data>('db.json');
const db = new Low<Data>(adapter, { memories: [] });

export const initDB = async () => {
    await db.read();
    db.data ||= { memories: [] }; // Set default data if file is empty
    await db.write();
};

export const getMemories = async (vendor: string): Promise<Memory[]> => {
    await db.read();
    return db.data!.memories.filter(m => m.vendor === vendor);
};

export const saveMemory = async (newMemory: Memory) => {
    await db.read();
    const index = db.data!.memories.findIndex(m => m.id === newMemory.id);
    
    if (index >= 0) {
        // Update existing memory
        db.data!.memories[index] = newMemory;
    } else {
        // Create new memory
        db.data!.memories.push(newMemory);
    }
    await db.write();
};

export const getAllMemories = async () => {
    await db.read();
    return db.data!.memories;
}