// src/db.ts
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import type { Memory } from './types';

// 1. Update Data interface to include invoices
interface Data {
    memories: Memory[];
    invoices: Array<{ invoiceId: string; vendor: string; invoiceDate: string }>;
}

// 2. Initialize DB with both arrays
const adapter = new JSONFile<Data>('db.json');
const db = new Low<Data>(adapter, { memories: [], invoices: [] });

export const initDB = async () => {
    await db.read();
    db.data ||= { memories: [], invoices: [] };
    db.data.memories ||= [];
    db.data.invoices ||= []; // Ensure invoices array exists
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
        db.data!.memories[index] = newMemory;
    } else {
        db.data!.memories.push(newMemory);
    }
    await db.write();
};

export const getAllMemories = async () => {
    await db.read();
    return db.data!.memories;
}

// 3. New methods for Invoice History
export const getInvoiceHistory = async () => {
    await db.read();
    return db.data!.invoices;
};

export const saveProcessedInvoice = async (invoice: { invoiceId: string; vendor: string; invoiceDate: string }) => {
    await db.read();
    // Prevent saving exact duplicates twice
    const exists = db.data!.invoices.some(i => i.invoiceId === invoice.invoiceId && i.vendor === invoice.vendor);
    if (!exists) {
        db.data!.invoices.push(invoice);
        await db.write();
    }
};