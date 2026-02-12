import fs from 'fs';
import path from 'path';

export interface CatalogEntry {
    sku: string;
    structure: string;
    name: string;
    source: 'EGGER' | 'WOODECO' | 'BLUM' | 'UNKNOWN';
    prices: {
        plate_18mm: number | null;
        plate_fireproof: number | null;
        laminate: number | null;
        unit_price: number | null; // For Blum products
    };
}

export interface PriceResult {
    success: boolean;
    unitPrice: number | null;
    total: number | null;
    materialName: string;
    error: string | null;
}

/**
 * Parse price string to number
 * Handles formats: "280 zł", "1 252zł", "322", "11,48", "XXX", "na zapytanie"
 */
export function parsePrice(priceStr: string): number | null {
    if (!priceStr || priceStr.trim() === '') return null;

    const cleaned = priceStr.trim().toUpperCase();

    // Check for unavailable prices
    if (cleaned === 'XXX' || cleaned === 'PALETOWE' || cleaned === 'NA ZAPYTANIE' || cleaned === '-') {
        return null;
    }

    // Remove "zł" suffix and whitespace, replace comma with dot
    const numericStr = priceStr
        .replace(/zł/gi, '')
        .replace(/\s/g, '')
        .replace(',', '.');

    const value = parseFloat(numericStr);
    return isNaN(value) || value === 0 ? null : value;
}

/**
 * Parse CSV line respecting quoted fields
 */
export function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if ((char === ',' || char === ';') && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

/**
 * Load EGGER price list
 * Format: Kod, Struktura, Nazwa Dekoru, Płyta 18mm, Trudnopalna, Laminat
 */
function loadEggerPriceList(filePath: string): CatalogEntry[] {
    if (!fs.existsSync(filePath)) {
        console.log(`EGGER file not found: ${filePath}`);
        return [];
    }

    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const lines = csvContent.split('\n').filter((line) => line.trim() !== '');
    const entries: CatalogEntry[] = [];

    // EGGER codes start with letters like W, H, U, F followed by numbers (e.g., W960, H3170)
    const eggerCodePattern = /^[A-Z]{1,2}\d{3,5}$/;

    for (let i = 0; i < lines.length; i++) {
        const columns = parseCSVLine(lines[i]);
        if (columns.length < 4) continue;

        const kod = columns[0]?.trim() || '';
        const struktura = columns[1]?.trim() || '';
        const nazwa = columns[2]?.trim() || '';
        const plyta18 = columns[3] || '';
        const trudno = columns[4] || '';
        const laminat = columns[5] || '';

        // Validate that this is a proper EGGER code
        if (!eggerCodePattern.test(kod)) continue;

        entries.push({
            sku: kod,
            structure: struktura,
            name: nazwa,
            source: 'EGGER',
            prices: {
                plate_18mm: parsePrice(plyta18),
                plate_fireproof: parsePrice(trudno),
                laminate: parsePrice(laminat),
                unit_price: null,
            },
        });
    }

    console.log(`Loaded ${entries.length} EGGER entries`);
    return entries;
}

/**
 * Load Woodeco price list
 * Format: Numer, Kod dekoru, Nazwa dekoru, Struktura, Cena 18mm
 */
function loadWoodecoPriceList(filePath: string): CatalogEntry[] {
    if (!fs.existsSync(filePath)) {
        console.log(`Woodeco file not found: ${filePath}`);
        return [];
    }

    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const lines = csvContent.split('\n').filter((line) => line.trim() !== '');
    const entries: CatalogEntry[] = [];

    // Find header row
    let headerIndex = -1;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i].toLowerCase();
        if (line.includes('dekoru') || line.includes('nazwa') || line.includes('numer')) {
            headerIndex = i;
            break;
        }
    }

    const startIndex = headerIndex >= 0 ? headerIndex + 1 : 1;

    for (let i = startIndex; i < lines.length; i++) {
        const columns = parseCSVLine(lines[i]);
        if (columns.length < 4) continue;

        // Woodeco format: Numer, Kod dekoru, Nazwa dekoru, Struktura, Cena
        const numer = columns[0];
        const kod = columns[1];
        const nazwa = columns[2];
        const struktura = columns[3];
        const cena = columns.length > 4 ? columns[4] : '';

        // Skip non-product rows
        if (!kod || kod.length < 2) continue;
        if (kod.toLowerCase().includes('kod') || kod.toLowerCase().includes('dekoru')) continue;
        // Skip legend entries
        if (numer.toLowerCase().includes('legenda') || nazwa.toLowerCase().includes('legenda')) continue;

        entries.push({
            sku: kod.trim(),
            structure: struktura.trim(),
            name: nazwa.trim(),
            source: 'WOODECO',
            prices: {
                plate_18mm: parsePrice(cena),
                plate_fireproof: null,
                laminate: null,
                unit_price: null,
            },
        });
    }

    console.log(`Loaded ${entries.length} Woodeco entries`);
    return entries;
}

/**
 * Load Blum price list
 * Format: Grupa, Symbol, ID Art., Cena, Min. Zam., EAN
 */
function loadBlumPriceList(filePath: string): CatalogEntry[] {
    if (!fs.existsSync(filePath)) {
        console.log(`Blum file not found: ${filePath}`);
        return [];
    }

    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const lines = csvContent.split('\n').filter((line) => line.trim() !== '');
    const entries: CatalogEntry[] = [];

    // Find header row
    let headerIndex = -1;
    for (let i = 0; i < Math.min(20, lines.length); i++) {
        const line = lines[i].toLowerCase();
        if (line.includes('symbol') || line.includes('cena') || line.includes('grupa')) {
            headerIndex = i;
            break;
        }
    }

    const startIndex = headerIndex >= 0 ? headerIndex + 1 : 1;

    for (let i = startIndex; i < lines.length; i++) {
        const columns = parseCSVLine(lines[i]);
        if (columns.length < 4) continue;

        // Blum format: Grupa, Symbol (name), Nr art. (SKU), Cena, Min. zam., EAN
        const grupa = columns[0];
        const symbol = columns[1]; // This is the product name/description
        const nrArt = columns[2];  // This is the SKU
        const cena = columns[3];

        // Skip non-product rows
        if (!nrArt || nrArt.length < 3) continue;
        if (nrArt.toLowerCase().includes('nr') || nrArt.toLowerCase().includes('art')) continue;
        // Skip empty group rows (usually headers or separators)
        if (!grupa && !symbol) continue;

        const price = parsePrice(cena);

        entries.push({
            sku: nrArt.trim(),
            structure: grupa.trim(),
            name: symbol.trim(),
            source: 'BLUM',
            prices: {
                plate_18mm: null,
                plate_fireproof: null,
                laminate: null,
                unit_price: price,
            },
        });
    }

    console.log(`Loaded ${entries.length} Blum entries`);
    return entries;
}

/**
 * Extract SKU from unstructured text line
 */
function extractSkuFromLine(line: string): string | null {
    // Look for patterns like "W980", "H3170", etc.
    const patterns = [
        /\b([A-Z]{1,2}\d{3,5})\b/,  // W980, H3170
        /\b(\d{7,})\b/,              // Long numeric codes (Blum)
    ];

    for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
            return match[1];
        }
    }

    return null;
}

/**
 * Parse technical catalog for additional product info
 */
function parseTechnicalCatalog(filePath: string): CatalogEntry[] {
    if (!fs.existsSync(filePath)) return [];

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const entries: CatalogEntry[] = [];

    for (const line of lines) {
        if (!line.trim()) continue;

        const sku = extractSkuFromLine(line);
        if (!sku) continue;

        const columns = parseCSVLine(line);
        let bestName = '';

        for (const col of columns) {
            if (col === sku) continue;
            if (col.length < 3) continue;
            if (['KOLOR', 'MATERIAŁ', 'NR ART.'].includes(col.toUpperCase())) continue;
            if (!isNaN(parseFloat(col))) continue;

            if (col.length > bestName.length) {
                bestName = col;
            }
        }

        const finalName = bestName || "Element katalogowy (brak nazwy)";

        entries.push({
            sku: sku,
            structure: '',
            name: finalName,
            source: 'UNKNOWN',
            prices: {
                plate_18mm: null,
                plate_fireproof: null,
                laminate: null,
                unit_price: null,
            },
        });
    }

    return entries;
}

/**
 * Main function to load all catalogs
 */
export async function loadCatalogFromFile(): Promise<{ entries: CatalogEntry[]; lastUpdated: string }> {
    const dbDir = path.join(process.cwd(), 'Database');

    if (!fs.existsSync(dbDir)) {
        console.error(`Database directory not found: ${dbDir}`);
        return { entries: [], lastUpdated: '' };
    }

    const allEntries: CatalogEntry[] = [];
    const existingSkus = new Set<string>();
    let latestModTime = new Date(0);

    // Helper to add entries without duplicates
    const addEntries = (entries: CatalogEntry[], filePath: string) => {
        for (const entry of entries) {
            const skuUpper = entry.sku.toUpperCase();
            if (!existingSkus.has(skuUpper)) {
                allEntries.push(entry);
                existingSkus.add(skuUpper);
            }
        }
        // Track latest modification time
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            if (stats.mtime > latestModTime) {
                latestModTime = stats.mtime;
            }
        }
    };

    // 1. Load EGGER price list
    const eggerPath = path.join(dbDir, 'CENNIK EGGER - Arkusz1.csv');
    addEntries(loadEggerPriceList(eggerPath), eggerPath);

    // 2. Load Woodeco price list
    const woodecoPath = path.join(dbDir, 'Cennik płyt Woodeco - Sheet1.csv');
    addEntries(loadWoodecoPriceList(woodecoPath), woodecoPath);

    // 3. Load Blum price list
    const blumPath = path.join(dbDir, 'Cennik blum.csv');
    addEntries(loadBlumPriceList(blumPath), blumPath);

    // 4. Load any technical catalogs (Table 1*.csv or Katalog*.csv)
    const files = fs.readdirSync(dbDir);
    for (const file of files) {
        if ((file.includes('Table 1') || file.includes('Katalog')) && file.endsWith('.csv')) {
            // Skip if already processed as main price list
            if (file.includes('CENNIK') || file.includes('Cennik')) continue;

            const fullPath = path.join(dbDir, file);
            const techEntries = parseTechnicalCatalog(fullPath);
            addEntries(techEntries, fullPath);
        }
    }

    console.log(`Total catalog entries loaded: ${allEntries.length}`);
    console.log(`  - EGGER: ${allEntries.filter(e => e.source === 'EGGER').length}`);
    console.log(`  - Woodeco: ${allEntries.filter(e => e.source === 'WOODECO').length}`);
    console.log(`  - Blum: ${allEntries.filter(e => e.source === 'BLUM').length}`);

    const lastUpdated = latestModTime.getTime() > 0
        ? latestModTime.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

    return { entries: allEntries, lastUpdated };
}

/**
 * Calculate price for a given SKU
 */
export function calculatePrice(
    catalog: CatalogEntry[],
    sku: string,
    productType: 'plate_18mm' | 'plate_fireproof' | 'laminate' | 'unit_price',
    quantity: number
): PriceResult {
    const skuUpper = sku.toUpperCase().trim();
    const entry = catalog.find((e) => e.sku.toUpperCase() === skuUpper);

    if (!entry) {
        return {
            success: false,
            unitPrice: null,
            total: null,
            materialName: '',
            error: `BŁĄD: Materiału o numerze ${sku} nie znaleziono w katalogu`,
        };
    }

    // For Blum products, use unit_price
    let price: number | null = null;
    if (entry.source === 'BLUM') {
        price = entry.prices.unit_price;
    } else {
        price = entry.prices[productType as keyof typeof entry.prices] as number | null;
    }

    if (price === null) {
        return {
            success: false,
            unitPrice: null,
            total: null,
            materialName: entry.name,
            error: `Cena niedostępna (na zapytanie)`,
        };
    }

    return {
        success: true,
        unitPrice: price,
        total: price * quantity,
        materialName: entry.name,
        error: null,
    };
}

/**
 * Search catalog by partial SKU or name
 */
export function searchCatalog(catalog: CatalogEntry[], query: string): CatalogEntry[] {
    const queryUpper = query.toUpperCase().trim();

    return catalog.filter(entry =>
        entry.sku.toUpperCase().includes(queryUpper) ||
        entry.name.toUpperCase().includes(queryUpper)
    ).slice(0, 50); // Limit results
}
