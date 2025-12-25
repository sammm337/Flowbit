// src/data.ts
import type { ExtractedInvoice, HumanCorrection } from './types';

// SCENARIO 1: Supplier GmbH (Missing Service Date)
// Invoice 1: The agent sees this for the first time.
export const invoiceA1: ExtractedInvoice = {
    invoiceId: 'INV-A-001',
    vendor: 'Supplier GmbH',
    confidence: 0.78,
    rawText: 'Rechnungsnr: INV-2024-001\nLeistungsdatum: 01.01.2024',
    fields: {
        invoiceNumber: 'INV-2024-001',
        invoiceDate: '12.01.2024',
        serviceDate: null, // <--- ERROR: Extractor missed this
        currency: 'EUR',
        netTotal: 2500.0,
        taxRate: 0.19,
        taxTotal: 475.0,
        grossTotal: 2975.0,
        lineItems: []
    }
};

// The human correction for Invoice 1
export const correctionA1: HumanCorrection = {
    invoiceId: 'INV-A-001',
    vendor: 'Supplier GmbH',
    finalDecision: 'approved',
    corrections: [
        {
            field: 'serviceDate',
            from: null,
            to: '2024-01-01', // Human finds it in raw text
            reason: 'Leistungsdatum found in raw text'
        }
    ]
};

// Invoice 2: Comes in later. Same vendor. Also missing Service Date.
// The agent should AUTO-FIX this one using memory from A1.
export const invoiceA2: ExtractedInvoice = {
    invoiceId: 'INV-A-002',
    vendor: 'Supplier GmbH',
    confidence: 0.82,
    rawText: 'Rechnungsnr: INV-2024-002\nLeistungsdatum: 15.01.2024',
    fields: {
        invoiceNumber: 'INV-2024-002',
        invoiceDate: '18.01.2024',
        serviceDate: null, // <--- ERROR again
        currency: 'EUR',
        netTotal: 1000.0,
        taxRate: 0.19,
        taxTotal: 190.0,
        grossTotal: 1190.0,
        lineItems: []
    }
};