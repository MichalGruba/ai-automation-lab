/**
 * Component Rules Engine
 * Automatic detection and expansion of furniture components
 * 
 * When AI detects a furniture element (e.g., "SZUFLADA"),
 * this module expands it into all required hardware components.
 */

// ============ TYPES ============

export interface FurnitureElement {
    name: string;
    width?: number;    // mm
    height?: number;   // mm
    depth?: number;    // mm
    qty: number;
}

export interface HardwareComponent {
    name: string;
    sku?: string;          // Blum/EGGER code
    qty: number;
    type: 'hardware' | 'material';
    width?: number;
    height?: number;
    depth?: number;
    description?: string;
}

export interface ExpansionResult {
    original: FurnitureElement;
    components: HardwareComponent[];
}

// ============ BLUM HARDWARE MAPPINGS ============

/**
 * Blum drawer runner SKUs by depth
 */
const BLUM_RUNNERS: Record<number, { tandembox: string; movento: string }> = {
    250: { tandembox: '560H2500B', movento: '760H2500S' },
    270: { tandembox: '560H2700B', movento: '760H2700S' },
    300: { tandembox: '560H3000B', movento: '760H3000S' },
    350: { tandembox: '560H3500B', movento: '760H3500S' },
    400: { tandembox: '560H4000B', movento: '760H4000S' },
    450: { tandembox: '560H4500B', movento: '760H4500S' },
    500: { tandembox: '560H5000B', movento: '760H5000S' },
    550: { tandembox: '560H5500B', movento: '760H5500S' },
    600: { tandembox: '560H6000B', movento: '760H6000S' },
};

/**
 * Blum hinge SKUs
 */
const BLUM_HINGES = {
    clip_top: '71B3550',       // Standard 110°
    clip_top_blumotion: '71B3590',  // With soft-close
    aventos_hf: '20F2200',     // Lift-up
};

/**
 * Blum coupling/synchronization
 */
const BLUM_ACCESSORIES = {
    tandem_coupling: 'T51.7601',  // Tandembox coupling
    movento_coupling: 'T60.0001', // Movento coupling
    tip_on: 'T60L7540',          // Tip-On for Tandembox
    gallery_rail: 'ZRG.337RSIC',  // Gallery rail
};

// ============ HELPER FUNCTIONS (Internal) ============

/**
 * Generates standard cabinet body (Sides, Bottom, Top/Traverse, Back)
 */
function createCabinetBody(w: number, h: number, d: number, qty: number): HardwareComponent[] {
    const bodyParts: HardwareComponent[] = [
        // Sides x2
        { name: 'Bok', width: d, height: h, qty: 2 * qty, type: 'material' as const },
        // Bottom x1
        { name: 'Wieniec Dolny', width: w - 36, height: d, qty: qty, type: 'material' as const }
    ];

    // Top Construction (Traverses for Lower, Full Top for Upper/Tall)
    // Assumption: Lower cabinets < 850mm height usually have traverses (unless specified)
    // But standardized: Lower Kitchen Cabinet = Traverses. 
    // We strictly assume H < 1000 = Lower Cabinet (Traverses), H > 1000 = Tall/Upper (Full Top)
    // Exception: Hanging cabinets (Upper) ARE small but have full top. 
    // Logic: Depth is the key. D < 400 = Upper (Full Top). D > 450 = Lower (Traverses).

    if (d < 400 || h > 1800) {
        // Upper / Tall -> Full Top
        bodyParts.push({ name: 'Wieniec Górny', width: w - 36, height: d, qty: qty, type: 'material' as const });
    } else {
        // Lower -> Traverses x2
        bodyParts.push({ name: 'Trawers', width: w - 36, height: 100, qty: 2 * qty, type: 'material' as const });
    }

    return bodyParts;
}

// ============ COMPONENT RULES ============

type RuleFunction = (element: FurnitureElement) => HardwareComponent[];

/**
 * Rules for expanding furniture elements into hardware components
 */
const COMPONENT_RULES: Record<string, RuleFunction> = {

    // ========== SZUFLADA (Drawer System ONLY) ==========
    // Use this when AI detects "Szuflada" explicitly separate from cabinet
    'SZUFLADA': (el) => {
        const depth = el.depth || 500;
        const normalizedDepth = getNearestBlumDepth(depth);
        return [
            { name: `Prowadnica Merivobox ${normalizedDepth}mm`, sku: `450.${normalizedDepth}01B`, qty: 2 * el.qty, type: 'hardware', depth: normalizedDepth },
            { name: `Bok metalowy Merivobox ${normalizedDepth}mm`, sku: `450.${normalizedDepth}02S`, qty: 2 * el.qty, type: 'hardware' },
            { name: 'Mocowanie frontu Merivobox', sku: 'ZF4.1002', qty: 2 * el.qty, type: 'hardware' },
            { name: 'Front szuflady', sku: 'NIEZNANY', qty: el.qty, type: 'material', width: el.width, height: el.height },
        ];
    },

    // ========== SZAFKA ZLEWOZMYWAKOWA (Unit) ==========
    // Body + 2 Doors + Hinges + Mat
    'SZAFKA_ZLEW': (el) => {
        const w = el.width || 600;
        const h = el.height || 720;
        const d = el.depth || 510;

        const parts = createCabinetBody(w, h, d, el.qty);

        // Add Specifics
        parts.push(
            { name: 'Front', width: (w / 2) - 3, height: h - 3, qty: 2 * el.qty, type: 'material' as const },
            { name: 'Zawias Blum Clip Top (zlew)', sku: BLUM_HINGES.clip_top, qty: 4 * el.qty, type: 'hardware' },
            { name: 'Mata ochronna pod zlew', sku: 'NIEZNANY', qty: el.qty, type: 'hardware' }
        );
        return parts;
    },

    // ========== ZMYWARKA (Appliance) ==========
    // Just Front
    'ZMYWARKA': (el) => [
        { name: 'Front Zmywarki', sku: 'NIEZNANY', qty: el.qty, type: 'material' as const, width: el.width, height: el.height }
    ],

    // ========== SZAFKA DOLNA (Standard Unit) ==========
    // Body + 1 Front + Hinges (Default to 1 door if W < 600, 2 if W >= 600 ?)
    // Simplified: 1 Front.
    'SZAFKA_DOLNA': (el) => {
        const w = el.width || 600;
        const h = el.height || 720;
        const d = el.depth || 510;

        const parts = createCabinetBody(w, h, d, el.qty);

        // Front & Hinges
        // Logic: If Width >= 800 -> 2 Doors. Else 1 Door.
        const numDoors = w >= 800 ? 2 : 1;
        const doorWidth = numDoors === 2 ? (w / 2) - 3 : w - 3;
        const hingesPerDoor = h > 900 ? 3 : 2;

        parts.push(
            { name: 'Front', width: doorWidth, height: h - 3, qty: numDoors * el.qty, type: 'material' as const },
            { name: 'Zawias Blum Clip Top Blumotion', sku: BLUM_HINGES.clip_top_blumotion, qty: numDoors * hingesPerDoor * el.qty, type: 'hardware' }
        );
        return parts;
    },

    // ========== SZAFKA GÓRNA / WISZĄCA ==========
    'SZAFKA_GORNA': (el) => {
        const w = el.width || 600;
        const h = el.height || 720;
        const d = el.depth || 300; // Standard upper depth

        const parts = createCabinetBody(w, h, d, el.qty);

        const numDoors = w >= 800 ? 2 : 1;
        const doorWidth = numDoors === 2 ? (w / 2) - 3 : w - 3;
        const hingesPerDoor = h > 900 ? 3 : 2;

        parts.push(
            { name: 'Front', width: doorWidth, height: h - 3, qty: numDoors * el.qty, type: 'material' as const },
            { name: 'Zawias Blum Clip Top Blumotion', sku: BLUM_HINGES.clip_top_blumotion, qty: numDoors * hingesPerDoor * el.qty, type: 'hardware' },
            // Shelves (1 for every 300mm height roughly)
            { name: 'Półka', width: w - 36, height: d - 20, qty: Math.floor(h / 350) * el.qty, type: 'material' as const }
        );
        return parts;
    },

    // ========== SLUPEK / AGD (Tall Unit) ==========
    'SLUPEK': (el) => {
        const w = el.width || 600;
        const h = el.height || 2100;
        const d = el.depth || 560;

        // Force Tall body logic
        const parts = createCabinetBody(w, h, d, el.qty);
        // Ensure full top for tall unit override check
        // (createCabinetBody handles h > 1800 -> Full Top)

        // Fronts? Complex. Assume 2 fronts (Lower + Upper).
        // Default split: Lower 720, Upper rest.
        const lowerH = 720;
        const upperH = h - 720 - 4; // gap

        parts.push(
            { name: 'Front Dolny', width: w - 3, height: lowerH, qty: el.qty, type: 'material' as const },
            { name: 'Front Górny', width: w - 3, height: upperH, qty: el.qty, type: 'material' as const },
            { name: 'Zawias Blum Clip Top Blumotion', sku: BLUM_HINGES.clip_top_blumotion, qty: 5 * el.qty, type: 'hardware' } // 2+3
        );
        return parts;
    },

    // ========== SZAFKA (Generic Fallback) ==========
    'SZAFKA': (el) => {
        const w = el.width || 600;
        const h = el.height || 720;
        const d = el.depth || 510;
        // Default to Lower Cabinet logic
        return COMPONENT_RULES['SZAFKA_DOLNA'](el);
    },

    // ========== DRZWI / FRONT (Detailed) ==========
    'DRZWI': (el) => {
        const height = el.height || 700;
        const hingeCount = height <= 800 ? 2 : height <= 1200 ? 3 : 4;
        return [
            { name: 'Zawias Blum Clip Top Blumotion', sku: BLUM_HINGES.clip_top_blumotion, qty: hingeCount * el.qty, type: 'hardware', description: `${hingeCount} zawiasy` },
            { name: 'Uchwyt meblowy', sku: 'NIEZNANY', qty: el.qty, type: 'hardware' },
        ];
    },

    'FRONT': (el) => COMPONENT_RULES['DRZWI'](el),

    'BLAT': (el) => [
        { name: 'Łącznik blatu', sku: 'NIEZNANY', qty: Math.ceil((el.width || 600) / 600) * el.qty, type: 'hardware' },
    ],

    // Empty expansions
    'COKOL': () => [],
    // ========== BLENDA (Pionowy cokół - pełny korpus z okuciami) ==========
    'BLENDA': (el) => {
        const w = el.width || 600;
        const h = el.height || 720;
        const d = el.depth || 510;

        const parts: HardwareComponent[] = [
            // Boki x2
            { name: 'Bok', width: d, height: h, qty: 2 * el.qty, type: 'material' as const },
            // Wieniec Dolny x1
            { name: 'Wieniec Dolny', width: w - 36, height: d, qty: el.qty, type: 'material' as const },
            // Wieniec Górny x1
            { name: 'Wieniec Górny', width: w - 36, height: d, qty: el.qty, type: 'material' as const },
            // Front x1
            { name: 'Front', width: w - 3, height: h - 3, qty: el.qty, type: 'material' as const },
            // Zawiasy x2 (standard)
            { name: 'Zawias Blum Clip Top', sku: BLUM_HINGES.clip_top, qty: 2 * el.qty, type: 'hardware' }
        ];

        return parts;
    },
    'WIENIEC': () => [],
    'TRAWERS': () => [],
    'BOK': () => [],
    'POLKA': () => [],
    // ========== CARGO / WYSUW (System) ==========
    // ONLY FRONT! System is purchased as a complete set.
    'CARGO': (el) => {
        // Cargo has NO corpus parts in the bill of materials, only the FRONT.
        // The mechanism itself is a "System" which might be added separately or just ignored if only boards are calculated.
        // User Rule: "do komponentu szafka cargo ma być liczony tylko front, nic więcej"

        const w = el.width || 400;
        const h = el.height || 720;

        return [
            { name: 'Front Cargo', width: w - 3, height: h - 3, qty: el.qty, type: 'material' as const }
        ];
    },

    // ========== NADSTAWKA (Top Unit) ==========
    // User Rule: "Nadstawka ma być liczona jako cały korpus (wieniec dolny, wieniec górny pełny, boki, front, 2 sztuki zawiasów)"
    'NADSTAWKA': (el) => {
        const w = el.width || 600;
        const h = el.height || 360;
        const d = el.depth || 340; // Default to Upper Cabinet depth unless specified

        const parts: HardwareComponent[] = [
            // Sides x2
            { name: 'Bok', width: d, height: h, qty: 2 * el.qty, type: 'material' as const },
            // Top x1 (Full)
            { name: 'Wieniec Górny', width: w - 36, height: d, qty: el.qty, type: 'material' as const },
            // Bottom x1 (Full)
            { name: 'Wieniec Dolny', width: w - 36, height: d, qty: el.qty, type: 'material' as const },
            // Front x1
            { name: 'Front', width: w - 3, height: h - 3, qty: el.qty, type: 'material' as const },
            // Hinges x2 (Standard)
            { name: 'Zawias Blum Clip Top', sku: BLUM_HINGES.clip_top, qty: 2 * el.qty, type: 'hardware' }
        ];

        return parts;
    },
};

// ============ HELPER FUNCTIONS ============

function getNearestBlumDepth(depth: number): number {
    const standardDepths = Object.keys(BLUM_RUNNERS).map(Number).sort((a, b) => a - b);
    for (const std of standardDepths) {
        if (depth <= std + 25) return std;
    }
    return standardDepths[standardDepths.length - 1];
}

function normalizeElementName(name: string): string {
    const normalized = name.toUpperCase().replace(/Ó/g, 'O').replace(/Ł/g, 'L').replace(/[0-9]/g, '').replace(/X\d+/g, '').replace(/\s+/g, '_').trim();

    // Aliases Map for Unit-Based Recognition
    const aliases: Record<string, string> = {
        'SZAFKA_ZLEWOZMYWAKOWA': 'SZAFKA_ZLEW',
        'SZAFA_ZLEW': 'SZAFKA_ZLEW',
        'ZLEW': 'SZAFKA_ZLEW',
        'SZAFKA_POD_ZLEW': 'SZAFKA_ZLEW',

        'SZAFKA_DOLNA': 'SZAFKA_DOLNA',
        'D_': 'SZAFKA_DOLNA', // e.g. D60 -> SZAFKA_DOLNA

        'SZAFKA_GORNA': 'SZAFKA_GORNA',
        'SZAFKA_WISZACA': 'SZAFKA_GORNA',
        'G_': 'SZAFKA_GORNA', // e.g. G60 -> SZAFKA_GORNA

        'SLUPEK': 'SLUPEK',
        'LODOWKA': 'SLUPEK', // Treat fridge housing as Tall Unit
        'PIEKARNIK': 'SLUPEK',

        'ZMYWARKA': 'ZMYWARKA',

        'CARGO': 'CARGO',
        'WYSUW': 'CARGO',
        'KOSZ_CARGO': 'CARGO',

        'NADSTAWKA': 'NADSTAWKA',
        'BLENDA': 'BLENDA',
        'NAD_': 'NADSTAWKA',
        'N_': 'NADSTAWKA',
        'N': 'NADSTAWKA', // e.g. N60 matches N 

        'SZUFLADA': 'SZUFLADA', // Keep drawer specific logic for standalone drawers
        'FRONT': 'FRONT',
        'DRZWI': 'DRZWI',
        'BLAT': 'BLAT',
    };

    for (const [alias, target] of Object.entries(aliases)) {
        if (normalized.includes(alias)) return target;
    }

    // Fallback regex
    if (normalized.startsWith('D')) return 'SZAFKA_DOLNA';
    if (normalized.startsWith('G')) return 'SZAFKA_GORNA';

    return normalized;
}

function extractDepthFromName(name: string): number | undefined {
    const match = name.match(/(\d{3,4})\s*(?:mm)?/);
    if (match) {
        const value = parseInt(match[1]);
        if (value >= 200 && value <= 700) return value;
    }
    return undefined;
}

// ============ MAIN EXPORTS ============

export function hasExpansionRule(elementName: string): boolean {
    const normalized = normalizeElementName(elementName);
    return normalized in COMPONENT_RULES;
}

export function expandElement(element: FurnitureElement): ExpansionResult {
    const normalized = normalizeElementName(element.name);
    const rule = COMPONENT_RULES[normalized];

    if (!rule) {
        return {
            original: element,
            components: [],
        };
    }

    if (!element.depth) {
        element.depth = extractDepthFromName(element.name);
    }

    const components = rule(element);

    return {
        original: element,
        components,
    };
}

export function expandElements(elements: FurnitureElement[]): ExpansionResult[] {
    return elements.map(el => expandElement(el));
}

export function aggregateHardware(expansions: ExpansionResult[]): HardwareComponent[] {
    const hardwareMap = new Map<string, HardwareComponent>();

    for (const expansion of expansions) {
        for (const expansion_comp of expansion.components) {
            if (expansion_comp.type !== 'hardware') continue;

            const key = expansion_comp.sku || expansion_comp.name;
            const existing = hardwareMap.get(key);

            if (existing) {
                existing.qty += expansion_comp.qty;
            } else {
                hardwareMap.set(key, { ...expansion_comp });
            }
        }
    }

    return Array.from(hardwareMap.values());
}

export function isDrawerElement(name: string): boolean {
    const drawerKeywords = ['SZUFLAD', 'DRAWER', 'SCHUBLADE', 'MERIVOBOX', 'TANDEMBOX', 'MOVENTO'];
    const upper = name.toUpperCase();
    if (upper.includes('CARGO') || upper.includes('WYSUW')) return false;
    return drawerKeywords.some(kw => upper.includes(kw));
}

export function isDoorElement(name: string): boolean {
    const doorKeywords = ['DRZWI', 'FRONT', 'DOOR', 'KLAPA', 'FACCIATA', 'FASSADE'];
    const upper = name.toUpperCase();
    return doorKeywords.some(kw => upper.includes(kw));
}
