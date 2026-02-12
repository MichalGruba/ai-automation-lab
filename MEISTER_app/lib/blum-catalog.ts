
export interface BlumComponent {
    name: string;
    sku: string; // Article number
    qty: number;
    type: string; // 'hardware' or 'board'
}

// Map depth to nearest standard Blum depth
function normalizeDepth(depth: number): number {
    const standardDepths = [250, 270, 300, 320, 350, 380, 400, 420, 450, 480, 500, 520, 550, 600, 650];
    return standardDepths.reduce((closest, d) =>
        Math.abs(d - depth) < Math.abs(closest - depth) ? d : closest
        , 500);
}

export function expandBlumDrawer(drawerSku: string, width: number): BlumComponent[] {
    // Parse SKU: "SZUFLADA [SYSTEM] L-[DEPTH]"
    // Example: "SZUFLADA TANDEMBOX L-500"

    // Default values
    let depth = 500;
    let system = 'MERIVOBOX'; // DOMYŚLNY SYSTEM - Merivobox jest standardem

    // Normalize
    const skuUpper = drawerSku.toUpperCase();

    const depthMatch = skuUpper.match(/L-(\d+)/);
    if (depthMatch) {
        depth = parseInt(depthMatch[1]);
    }

    // Normalize to standard Blum depth
    depth = normalizeDepth(depth);

    // Wykryj system szuflad - TYLKO jeśli wyraźnie podany
    // Domyślnie MERIVOBOX
    if (skuUpper.includes('LEGRABOX')) system = 'LEGRABOX';
    else if (skuUpper.includes('TANDEMBOX') || skuUpper.includes('TANDEM')) system = 'TANDEMBOX';
    // MOVENTO tylko gdy WYRAŹNIE napisane "MOVENTO" - nie zgaduj!
    else if (skuUpper.includes('MOVENTO')) system = 'MOVENTO';

    // Variables for legacy/fallback systems
    let runnerSku = '';
    let runnerName = '';
    const components: BlumComponent[] = [];

    // --- 1. MERIVOBOX (DOMYŚLNY I REKOMENDOWANY) ---
    if (system === 'MERIVOBOX') {
        const normalizedDepth = depth;
        // Prowadnice (Runners) - 450.5001B
        // SKU pattern from Cennik: 450.[DEPTH]1B (e.g. 450.5001B)
        const merivoRunnerSku = `450.${normalizedDepth}1B`;

        components.push({
            name: `Prowadnica MERIVOBOX 40kg L-${normalizedDepth} (kpl L+P)`,
            sku: merivoRunnerSku,
            qty: 1,
            type: 'hardware'
        });

        // Boki (Sides) - 470M5002S (Wysokość M - standardowa niska)
        // SKU pattern: 470M[DEPTH]2S
        const sideSku = `470M${normalizedDepth}2S`;

        components.push({
            name: `Bok MERIVOBOX M (91mm) L-${normalizedDepth} (kpl L+P)`,
            sku: sideSku,
            qty: 1,
            type: 'hardware'
        });

        // Mocowanie frontu - ZF4.1002 (2 sztuki na szufladę)
        components.push({
            name: `Mocowanie frontu MERIVOBOX`,
            sku: 'ZF4.1002',
            qty: 2,
            type: 'hardware'
        });

        // Opcjonalnie: Mocowanie ścianki tylnej MERIVOBOX M
        // ZB4M000S
        components.push({
            name: `Mocowanie ścianki tylnej MERIVOBOX M`,
            sku: 'ZB4M000S',
            qty: 2,
            type: 'hardware'
        });

        return components;
    }

    // --- 2. MOVENTO (Dla szuflad drewnianych) ---
    if (system === 'MOVENTO') {
        runnerSku = `760H${depth}0S`;
        runnerName = `MOVENTO prowadnica 40kg L-${depth}`;

        components.push({
            name: `${runnerName} (kpl L+P)`,
            sku: runnerSku,
            qty: 1,
            type: 'hardware'
        });

        // Sprzęgło MOVENTO (kpl) - T51.7601
        components.push({
            name: `Sprzęgło Movento z regulacją boczną (kpl L+P)`,
            sku: 'T51.7601',
            qty: 1,
            type: 'hardware'
        });

        return components;
    }

    // --- 3. TANDEMBOX / LEGRABOX (Legacy) ---
    // Fallback logic kept for compatibility
    if (system === 'LEGRABOX') {
        runnerSku = `770K${depth}0S`;
        runnerName = `LEGRABOX prowadnica K L-${depth}`;
    } else {
        // TANDEMBOX
        runnerSku = `560F${depth}0B`;
        runnerName = `TANDEM prowadnica 30kg L-${depth}`;
    }

    components.push({
        name: `${runnerName} (kpl L+P)`,
        sku: runnerSku,
        qty: 1,
        type: 'hardware'
    });

    // Dodatkowe elementy dla TANDEMBOX
    if (system === 'TANDEMBOX') {
        components.push({
            name: `Sprzęgło ${system} (kpl L+P)`,
            sku: 'T51.1700',
            qty: 1,
            type: 'hardware'
        });
    }

    return components;
}
