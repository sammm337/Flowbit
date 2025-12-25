// src/data.ts
import type { ExtractedInvoice, HumanCorrection } from './types';

// ============================================
// SUPPLIER GMBH - Service Date Extraction
// ============================================
export const invoiceA1: ExtractedInvoice = {
    invoiceId: 'INV-A-001',
    vendor: 'Supplier GmbH',
    confidence: 0.78,
    rawText: 'Rechnung INV-2024-001\nDatum: 12.01.2024\nLeistungsdatum: 01.01.2024\nBetrag: 2975.00 EUR',
    fields: {
        invoiceNumber: 'INV-2024-001',
        invoiceDate: '2024-01-12',
        serviceDate: null, // Missing
        currency: 'EUR',
        netTotal: 2500.0,
        taxRate: 0.19,
        taxTotal: 475.0,
        grossTotal: 2975.0,
        lineItems: []
    }
};

export const correctionA1: HumanCorrection = {
    invoiceId: 'INV-A-001',
    vendor: 'Supplier GmbH',
    corrections: [
        {
            field: 'serviceDate',
            from: null,
            to: '2024-01-01',
            reason: 'Leistungsdatum found in raw text'
        }
    ],
    finalDecision: 'approved'
};

export const invoiceA2: ExtractedInvoice = {
    invoiceId: 'INV-A-002',
    vendor: 'Supplier GmbH',
    confidence: 0.82,
    rawText: 'Rechnung INV-2024-002\nDatum: 18.01.2024\nLeistungsdatum: 15.01.2024\nBetrag: 1190.00 EUR',
    fields: {
        invoiceNumber: 'INV-2024-002',
        invoiceDate: '2024-01-18',
        serviceDate: null, // Should auto-fix
        currency: 'EUR',
        netTotal: 1000.0,
        taxRate: 0.19,
        taxTotal: 190.0,
        grossTotal: 1190.0,
        lineItems: []
    }
};

export const invoiceA3: ExtractedInvoice = {
    invoiceId: 'INV-A-003',
    vendor: 'Supplier GmbH',
    confidence: 0.75,
    rawText: 'Rechnung INV-2024-003\nDatum: 20.01.2024\nLeistungsdatum: 18.01.2024\nPO-A-051\nBetrag: 5950.00 EUR',
    fields: {
        invoiceNumber: 'INV-2024-003',
        invoiceDate: '2024-01-20',
        serviceDate: null,
        currency: 'EUR',
        poNumber: null, // Should match PO
        netTotal: 5000.0,
        taxRate: 0.19,
        taxTotal: 950.0,
        grossTotal: 5950.0,
        lineItems: [
            { sku: 'WIDGET-A', description: 'Premium Widget', qty: 10, unitPrice: 500 }
        ]
    }
};

export const correctionA3: HumanCorrection = {
    invoiceId: 'INV-A-003',
    vendor: 'Supplier GmbH',
    corrections: [
        {
            field: 'poNumber',
            from: null,
            to: 'PO-A-051',
            reason: 'PO number found in invoice text'
        }
    ],
    finalDecision: 'approved'
};

// ============================================
// PARTS AG - VAT Included Issues
// ============================================
export const invoiceB1: ExtractedInvoice = {
    invoiceId: 'INV-B-001',
    vendor: 'Parts AG',
    confidence: 0.80,
    rawText: 'Invoice B-001\nDate: 2024-01-10\nPrices incl. VAT 19%\nTotal: 1190.00',
    fields: {
        invoiceNumber: 'B-001',
        invoiceDate: '2024-01-10',
        serviceDate: '2024-01-10',
        currency: null, // Missing
        netTotal: 1190.0, // Wrong - should be calculated
        taxRate: 0.19,
        taxTotal: 0, // Wrong
        grossTotal: 1190.0,
        lineItems: [],
        vatIncluded: undefined
    }
};

export const correctionB1: HumanCorrection = {
    invoiceId: 'INV-B-001',
    vendor: 'Parts AG',
    corrections: [
        {
            field: 'currency',
            from: null,
            to: 'EUR',
            reason: 'Currency inferred from vendor location'
        },
        {
            field: 'netTotal',
            from: 1190.0,
            to: 1000.0,
            reason: 'VAT included - recalculated net amount'
        },
        {
            field: 'taxTotal',
            from: 0,
            to: 190.0,
            reason: 'VAT included - recalculated tax'
        }
    ],
    finalDecision: 'approved'
};

export const invoiceB2: ExtractedInvoice = {
    invoiceId: 'INV-B-002',
    vendor: 'Parts AG',
    confidence: 0.83,
    rawText: 'Invoice B-002\nDate: 2024-01-15\nMwSt. inkl. 19%\nTotal: 2380.00 EUR',
    fields: {
        invoiceNumber: 'B-002',
        invoiceDate: '2024-01-15',
        serviceDate: '2024-01-15',
        currency: null,
        netTotal: 2380.0,
        taxRate: 0.19,
        taxTotal: 0,
        grossTotal: 2380.0,
        lineItems: []
    }
};

// ============================================
// FREIGHT & CO - Skonto and SKU Mapping
// ============================================
export const invoiceC1: ExtractedInvoice = {
    invoiceId: 'INV-C-001',
    vendor: 'Freight & Co',
    confidence: 0.77,
    rawText: 'Invoice C-001\nDate: 2024-01-12\n2% Skonto bei Zahlung innerhalb 10 Tage\nSeefracht Hamburg-Shanghai\nAmount: 850.00 EUR',
    fields: {
        invoiceNumber: 'C-001',
        invoiceDate: '2024-01-12',
        serviceDate: '2024-01-12',
        currency: 'EUR',
        netTotal: 850.0,
        taxRate: 0.0,
        taxTotal: 0,
        grossTotal: 850.0,
        paymentTerms: null,
        lineItems: [
            { sku: null, description: 'Seefracht Hamburg-Shanghai', qty: 1, unitPrice: 850 }
        ]
    }
};

export const correctionC1: HumanCorrection = {
    invoiceId: 'INV-C-001',
    vendor: 'Freight & Co',
    corrections: [
        {
            field: 'paymentTerms',
            from: null,
            to: '2% Skonto bei Zahlung innerhalb 10 Tage',
            reason: 'Skonto terms found in invoice'
        },
        {
            field: 'sku',
            from: { description: 'Seefracht Hamburg-Shanghai', sku: null },
            to: 'FREIGHT',
            reason: 'Seefracht/Shipping description maps to SKU FREIGHT'
        }
    ],
    finalDecision: 'approved'
};

export const invoiceC2: ExtractedInvoice = {
    invoiceId: 'INV-C-002',
    vendor: 'Freight & Co',
    confidence: 0.79,
    rawText: 'Invoice C-002\nDate: 2024-01-20\n2% Skonto innerhalb 10 Tage\nShipping Services\nAmount: 1200.00 EUR',
    fields: {
        invoiceNumber: 'C-002',
        invoiceDate: '2024-01-20',
        serviceDate: '2024-01-20',
        currency: 'EUR',
        netTotal: 1200.0,
        taxRate: 0.0,
        taxTotal: 0,
        grossTotal: 1200.0,
        paymentTerms: null,
        lineItems: [
            { sku: null, description: 'Shipping Services', qty: 1, unitPrice: 1200 }
        ]
    }
};

// ============================================
// DUPLICATE DETECTION
// ============================================
export const invoiceA4: ExtractedInvoice = {
    invoiceId: 'INV-A-004',
    vendor: 'Supplier GmbH',
    confidence: 0.81,
    rawText: 'Rechnung INV-2024-004\nDatum: 25.01.2024\nLeistungsdatum: 23.01.2024\nBetrag: 2975.00 EUR',
    fields: {
        invoiceNumber: 'INV-2024-004',
        invoiceDate: '2024-01-25',
        serviceDate: null,
        currency: 'EUR',
        netTotal: 2500.0,
        taxRate: 0.19,
        taxTotal: 475.0,
        grossTotal: 2975.0,
        lineItems: []
    }
};

export const invoiceB4: ExtractedInvoice = {
    invoiceId: 'INV-A-004', // Same number!
    vendor: 'Supplier GmbH', // Same vendor!
    confidence: 0.80,
    rawText: 'Rechnung INV-2024-004\nDatum: 26.01.2024\nLeistungsdatum: 23.01.2024\nBetrag: 2975.00 EUR',
    fields: {
        invoiceNumber: 'INV-2024-004',
        invoiceDate: '2024-01-26', // Within 7 days
        serviceDate: null,
        currency: 'EUR',
        netTotal: 2500.0,
        taxRate: 0.19,
        taxTotal: 475.0,
        grossTotal: 2975.0,
        lineItems: []
    }
};