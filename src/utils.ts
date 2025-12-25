// src/utils.ts
import type { RegexPattern } from './types';

export const parseGermanDate = (dateStr: string): string | null => {
    // Convert DD.MM.YYYY to YYYY-MM-DD
    const match = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (match) {
        const [_, day, month, year] = match;
        return `${year}-${month}-${day}`;
    }
    return null;
};

export const extractWithRegex = (
    text: string,
    regexPattern: RegexPattern
): string | null => {
    try {
        const regex = new RegExp(regexPattern.pattern, regexPattern.flags || '');
        const match = text.match(regex);
        
        if (!match) return null;
        
        const captureGroup = regexPattern.captureGroup || 1;
        let value = match[captureGroup];
        
        if (!value) return null;
        
        // Apply transformation if specified
        if (regexPattern.transform === 'parseGermanDate') {
            return parseGermanDate(value);
        }
        if (regexPattern.transform === 'uppercase') {
            return value.toUpperCase();
        }
        if (regexPattern.transform === 'trim') {
            return value.trim();
        }
        
        return value;
    } catch (error) {
        console.error('Regex extraction failed:', error);
        return null;
    }
};

export const calculateTaxInclusive = (gross: number, taxRate: number) => {
    // When VAT is included: net = gross / (1 + taxRate)
    const net = gross / (1 + taxRate);
    const tax = gross - net;
    return {
        netTotal: Number(net.toFixed(2)),
        taxTotal: Number(tax.toFixed(2))
    };
};

export const findDuplicateInvoice = (
    currentInvoice: string,
    currentVendor: string,
    currentDate: string,
    allInvoices: Array<{ invoiceId: string; vendor: string; invoiceDate: string }>
): string | null => {
    for (const inv of allInvoices) {
        if (
            inv.vendor === currentVendor &&
            inv.invoiceId === currentInvoice &&
            Math.abs(new Date(inv.invoiceDate).getTime() - new Date(currentDate).getTime()) < 7 * 24 * 60 * 60 * 1000
        ) {
            return inv.invoiceId;
        }
    }
    return null;
};