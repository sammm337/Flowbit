// src/types.ts

// 1. Input Data Structures (From the Extractor)
export interface LineItem {
    sku: string | null;
    description?: string;
    qty: number;
    unitPrice: number;
    qtyDelivered?: number;
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
    vatIncluded?: boolean;
    paymentTerms?: string | null;
}

export interface ExtractedInvoice {
    invoiceId: string;
    vendor: string;
    fields: InvoiceFields;
    confidence: number;
    rawText: string;
}

// 2. Enhanced Memory Structures
export type MemoryType = 'vendor-pattern' | 'correction' | 'resolution';

export interface MemoryPattern {
    type: 'regex' | 'static' | 'rule';
    value: string | RegexPattern | Rule;
}

export interface RegexPattern {
    pattern: string;
    flags?: string;
    captureGroup?: number;
    transform?: string; // e.g., 'parseGermanDate', 'uppercase'
}

export interface Rule {
    condition: string;
    action: string;
    params?: any;
}

export interface Memory {
    id: string;
    type: MemoryType;
    vendor: string;
    key: string;
    pattern: MemoryPattern;
    confidence: number;
    lastUsed: string;
    hitCount: number;
    successCount: number;
    failureCount: number;
    metadata?: {
        createdFrom?: string; // invoiceId that created this memory
        humanVerified?: boolean;
        notes?: string;
    };
}

// 3. Output Contract
export interface ProcessingResult {
    invoiceId: string;
    normalizedInvoice: InvoiceFields;
    proposedCorrections: string[];
    requiresHumanReview: boolean;
    reasoning: string;
    confidenceScore: number;
    memoryUpdates: string[];
    auditTrail: AuditLog[];
}

export interface AuditLog {
    step: 'recall' | 'apply' | 'decide' | 'learn';
    timestamp: string;
    details: string;
}

// 4. Human Correction Input
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

// 5. Decision thresholds
export const THRESHOLDS = {
    AUTO_APPROVE: 0.85,
    AUTO_CORRECT: 0.70,
    MEMORY_APPLICATION: 0.70,
    MEMORY_DECAY_RATE: 0.05
};