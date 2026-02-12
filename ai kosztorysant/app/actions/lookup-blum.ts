'use server';

import { findBlumMaterial, BlumLookupResult } from '@/lib/blum-prices';

/**
 * Server Action: wyszukaj okucia Blum po SKU
 * Używane z data-table.tsx gdy standardowy katalog (Egger) nie znajdzie materiału
 */
export async function lookupBlumAction(sku: string): Promise<BlumLookupResult> {
    return findBlumMaterial(sku);
}
