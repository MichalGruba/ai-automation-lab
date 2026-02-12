import { readFileSync } from 'fs';
import { join } from 'path';

interface BlumMaterial {
    symbol: string;
    id: string;
    pricePerUnit: number;
    minOrder: number;
    description: string;
    group: string;
}

let blumCatalogCache: Map<string, BlumMaterial> | null = null;

function parseBlumCatalog(): Map<string, BlumMaterial> {
    if (blumCatalogCache) {
        return blumCatalogCache;
    }

    const catalog = new Map<string, BlumMaterial>();

    try {
        const csvPath = join(process.cwd(), 'Database', 'Cennik blum.csv');
        const content = readFileSync(csvPath, 'utf-8');
        const lines = content.split('\n');

        // Skip header lines (first 7 lines are header/info)
        for (let i = 7; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Parse CSV (handle commas in quotes)
            const parts = line.match(/("([^"]*)"|[^,]+)/g);
            if (!parts || parts.length < 10) continue;

            const cleanParts = parts.map(p => p.replace(/^"|"$/g, '').trim());

            const [group, symbol, id, , priceStr, minOrderStr, , , , description] = cleanParts;

            if (!symbol || !id) continue;

            // Normalize symbol for lookup
            const normalizedSymbol = symbol.replace(/\s+/g, ' ').trim();

            // Parse price (Polish format: "11,48" -> 11.48)
            const price = parseFloat((priceStr || '0').replace(',', '.')) || 0;
            const minOrder = parseInt(minOrderStr) || 1;

            const material: BlumMaterial = {
                symbol: normalizedSymbol,
                id: id,
                pricePerUnit: price,
                minOrder: minOrder,
                description: description || '',
                group: group || ''
            };

            // Index by ID (primary)
            catalog.set(id, material);

            // Also index by normalized symbol for flexible lookup
            // Extract key parts from symbol for pattern matching
            const symbolParts = normalizedSymbol.split(/\s+/);
            if (symbolParts.length > 0) {
                catalog.set(symbolParts[0], material);
            }
        }

        console.log(`Blum catalog loaded: ${catalog.size} items`);
        blumCatalogCache = catalog;
    } catch (error) {
        console.error('Failed to load Blum catalog:', error);
    }

    return catalog;
}

export interface BlumLookupResult {
    found: boolean;
    symbol?: string;
    id?: string;
    price?: number;
    description?: string;
    group?: string;
}

export function findBlumMaterial(sku: string): BlumLookupResult {
    if (!sku) return { found: false };

    const catalog = parseBlumCatalog();
    const normalizedSku = sku.replace(/\s+/g, ' ').trim().toUpperCase();

    // Try exact match first
    if (catalog.has(normalizedSku)) {
        const mat = catalog.get(normalizedSku)!;
        return {
            found: true,
            symbol: mat.symbol,
            id: mat.id,
            price: mat.pricePerUnit,
            description: mat.description,
            group: mat.group
        };
    }

    // Try partial match (check if sku starts with any catalog key)
    for (const [key, mat] of catalog.entries()) {
        if (key.toUpperCase().startsWith(normalizedSku) || normalizedSku.startsWith(key.toUpperCase())) {
            return {
                found: true,
                symbol: mat.symbol,
                id: mat.id,
                price: mat.pricePerUnit,
                description: mat.description,
                group: mat.group
            };
        }
        // Also check if the ID matches
        if (mat.id === normalizedSku || mat.id.startsWith(normalizedSku)) {
            return {
                found: true,
                symbol: mat.symbol,
                id: mat.id,
                price: mat.pricePerUnit,
                description: mat.description,
                group: mat.group
            };
        }
    }

    // Try fuzzy match on symbol
    const skuParts = normalizedSku.split(/[\s.]+/);
    if (skuParts.length > 0) {
        for (const [, mat] of catalog.entries()) {
            const symbolParts = mat.symbol.toUpperCase().split(/[\s.]+/);
            // Check if first part matches
            if (symbolParts[0] === skuParts[0]) {
                return {
                    found: true,
                    symbol: mat.symbol,
                    id: mat.id,
                    price: mat.pricePerUnit,
                    description: mat.description,
                    group: mat.group
                };
            }
        }
    }

    return { found: false };
}
