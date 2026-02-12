'use client';

import { create } from 'zustand';

// Product types available in the catalog
export type ProductType = 'plate_18mm' | 'plate_fireproof' | 'laminate';

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
    plate_18mm: 'Płyta 18mm',
    plate_fireproof: 'Płyta Trudnozapalna',
    laminate: 'Laminat 2800x1310',
};

// Sheet requirement per material
export interface SheetItem {
    id: string;
    sku: string;
    materialName: string;
    productType: ProductType;
    sheetsNeeded: number;
    unitPrice: number | null;
    totalAreaMm2: number;
    elements: { width: number; height: number; qty: number }[];
    error: string | null;
    isHardware?: boolean;  // True for Blum hardware (counted in pieces)
}

// Catalog entry from the database
export interface CatalogEntry {
    sku: string;
    structure: string;
    name: string;
    prices: {
        plate_18mm: number | null;
        plate_fireproof: number | null;
        laminate: number | null;
    };
}

interface EstimateStore {
    sheets: SheetItem[];
    catalog: CatalogEntry[];
    catalogLoaded: boolean;
    catalogLastUpdated: string;
    status: 'idle' | 'processing' | 'done' | 'error';
    errorMessage: string | null;
    viewMode: 'edit' | 'client'; // Current estimate panel view
    markup: number; // Markup percentage on materials
    assembly: number; // Assembly percentage on (materials + markup)

    // Catalog actions
    setCatalog: (catalog: CatalogEntry[], lastUpdated: string) => void;

    // Sheet actions
    addSheet: (sheet: SheetItem) => void;
    updateSheet: (id: string, updates: Partial<SheetItem>) => void;
    removeSheet: (id: string) => void;
    setSheets: (sheets: SheetItem[]) => void;

    // Utility actions
    setStatus: (status: EstimateStore['status']) => void;
    setErrorMessage: (message: string | null) => void;
    setMarkup: (markup: number) => void;
    setAssembly: (assembly: number) => void;
    setViewMode: (mode: 'edit' | 'client') => void;
    clearAll: () => void;

    // Calculations - FIXED
    getMaterialsTotal: () => number; // Raw materials cost
    getMarkupAmount: () => number; // Markup on materials
    getSubtotalWithMarkup: () => number; // Materials + Markup
    getAssemblyAmount: () => number; // Assembly on (Materials + Markup)
    getGrandTotal: () => number; // Final total
    getTotalSheets: () => number;   // Total sheets (materials only)
    getTotalPieces: () => number;   // Total hardware pieces

    // Catalog search
    findMaterial: (sku: string) => CatalogEntry | null;
}

export const useEstimateStore = create<EstimateStore>((set, get) => ({
    sheets: [],
    catalog: [],
    catalogLoaded: false,
    catalogLastUpdated: '',
    status: 'idle',
    errorMessage: null,
    viewMode: 'edit',
    markup: 0,
    assembly: 0,

    setCatalog: (catalog, lastUpdated) =>
        set({
            catalog,
            catalogLoaded: true,
            catalogLastUpdated: lastUpdated,
        }),

    addSheet: (sheet) =>
        set((state) => ({
            sheets: [...state.sheets, sheet],
        })),

    updateSheet: (id, updates) =>
        set((state) => ({
            sheets: state.sheets.map((sheet) =>
                sheet.id === id ? { ...sheet, ...updates } : sheet
            ),
        })),

    removeSheet: (id) =>
        set((state) => ({
            sheets: state.sheets.filter((sheet) => sheet.id !== id),
        })),

    setSheets: (sheets) => set({ sheets }),

    setStatus: (status) => set({ status }),

    setErrorMessage: (message) => set({ errorMessage: message }),

    setMarkup: (markup) => set({ markup }),

    setAssembly: (assembly) => set({ assembly }),

    setViewMode: (viewMode) => set({ viewMode }),

    clearAll: () =>
        set({
            sheets: [],
            status: 'idle',
            errorMessage: null,
        }),

    // Raw materials cost (no markup)
    getMaterialsTotal: () => {
        return get().sheets.reduce((sum, sheet) => {
            if (sheet.unitPrice === null || sheet.error) return sum;
            return sum + sheet.unitPrice * sheet.sheetsNeeded;
        }, 0);
    },

    // Markup amount calculated on materials total
    getMarkupAmount: () => {
        const materialsTotal = get().getMaterialsTotal();
        const markup = get().markup;
        return materialsTotal * (markup / 100);
    },

    // Materials + Markup
    getSubtotalWithMarkup: () => {
        return get().getMaterialsTotal() + get().getMarkupAmount();
    },

    // Assembly calculated on (Materials + Markup)
    getAssemblyAmount: () => {
        const subtotal = get().getSubtotalWithMarkup();
        const assembly = get().assembly;
        return subtotal * (assembly / 100);
    },

    // Final grand total
    getGrandTotal: () => {
        return get().getSubtotalWithMarkup() + get().getAssemblyAmount();
    },

    getTotalSheets: () => {
        // Only count sheets (materials), not hardware
        return get().sheets
            .filter(sheet => !sheet.isHardware)
            .reduce((sum, sheet) => sum + sheet.sheetsNeeded, 0);
    },

    getTotalPieces: () => {
        // Count hardware pieces
        return get().sheets
            .filter(sheet => sheet.isHardware)
            .reduce((sum, sheet) => sum + sheet.sheetsNeeded, 0);
    },

    findMaterial: (sku) => {
        const catalog = get().catalog;
        const skuUpper = sku.toUpperCase().trim();
        return catalog.find((entry) => entry.sku.toUpperCase() === skuUpper) || null;
    },
}));
