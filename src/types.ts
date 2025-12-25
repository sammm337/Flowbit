// src/types.ts

// 1. Input Data Structures (From the Extractor)
export interface LineItem {
    sku: string | null;
    description?: string;
    qty: number;
    unitPrice: number;
    qtyDelivered?: number; // From delivery note
}

export interface InvoiceFields {
    invoiceNumber: string;
    invoiceDate: string;
    serviceDate: string | null;
    currency: string | null;
    poNumber?: string | null;
    netTotal: number;
    taxRate: number;
    taxTotal: number;
    grossTotal: number;
    lineItems: LineItem[];
}

export interface ExtractedInvoice {
    invoiceId: string;
    vendor: string;
    fields: InvoiceFields;
    confidence: number;
    rawText: string;
}

// 2. Memory Structures (The Brain)
export type MemoryType = 'vendor-pattern' | 'correction' | 'resolution';

export interface Memory {
    id: string;
    type: MemoryType;
    vendor: string; // Memories are usually tied to a specific vendor
    key: string;    // e.g., "serviceDate_extraction" or "tax_calculation"
    value: any;     // The learned value/rule (e.g., regex pattern, or specific SKU map)
    confidence: number; // 0.0 to 1.0 - How sure are we about this memory?
    lastUsed: string;   // ISO Date
    hitCount: number;   // How many times was this memory useful?
}

// 3. Output Contract (Required by Assignment)
export interface ProcessingResult {
    invoiceId: string;
    normalizedInvoice: InvoiceFields;
    proposedCorrections: string[];
    requiresHumanReview: boolean;
    reasoning: string;
    confidenceScore: number;
    memoryUpdates: string[]; // Descriptions of what we learned/updated
    auditTrail: AuditLog[];
}

export interface AuditLog {
    step: 'recall' | 'apply' | 'decide' | 'learn';
    timestamp: string;
    details: string;
}

// 4. Human Correction Input (For Training)
export interface HumanCorrection {
    invoiceId: string;
    vendor: string;
    corrections: {
        field: string;
        from: any;
        to: any;
        reason: string;
    }[];
    finalDecision: 'approved' | 'rejected';
}