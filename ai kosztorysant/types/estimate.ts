export interface FurnitureElement {
    name: string;
    width: number;
    height: number;
    qty: number;
    box_2d?: number[];
}

export interface SheetResult {
    sku: string;
    elements: FurnitureElement[];
    totalAreaMm2: number;
    sheetsNeeded: number;
    unitPrice?: number | null;
    isHardware?: boolean;
    materialName?: string;
}

export interface EstimateItem {
    name: string;
    qty: number;
    price: number | null;
    total: number | null;
    sku?: string;
}
