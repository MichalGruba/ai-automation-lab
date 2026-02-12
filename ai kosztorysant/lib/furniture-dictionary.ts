/**
 * Furniture Component Dictionary
 * Comprehensive rules for identifying and expanding furniture components
 * Used by AI to precisely read technical drawings
 */

// ============ CABINET TYPES ============

export interface CabinetTemplate {
    id: string;
    patterns: string[];           // Patterns to match in drawing (case insensitive)
    depthMm: number;              // Standard depth
    components: ComponentRule[];   // What parts it contains
    hardware: HardwareRule[];      // What hardware it needs
    notes: string;                // Special instructions
}

export interface ComponentRule {
    name: string;
    widthFormula: string;     // e.g., "W-(2*18)" where W = cabinet width
    heightFormula: string;    // e.g., "H" where H = cabinet height
    depthFormula?: string;    // Optional, for 3D elements
    qty: number;
    condition?: string;       // When to include this component
}

export interface HardwareRule {
    name: string;
    qtyFormula: string;       // e.g., "Math.ceil(H/500)*2" for hinges
    sku?: string;
    condition?: string;
}

// ============ STANDARD CABINET TEMPLATES ============

export const CABINET_TEMPLATES: CabinetTemplate[] = [
    // ===== LOWER CABINETS (DOLNE) =====
    {
        id: 'LOWER_STANDARD',
        patterns: ['D30', 'D40', 'D45', 'D50', 'D60', 'D80', 'D90', 'D100', 'D120', 'DOLNA', 'SZAFKA DOLNA'],
        depthMm: 510,
        components: [
            { name: 'Bok', widthFormula: 'DEPTH', heightFormula: 'H', qty: 2 },
            { name: 'Wieniec dolny', widthFormula: 'W-(2*18)', heightFormula: 'DEPTH', qty: 1 },
            { name: 'Trawers górny', widthFormula: 'W-(2*18)', heightFormula: '100', qty: 1 },
            { name: 'Półka', widthFormula: 'W-(2*18)', heightFormula: 'DEPTH-20', qty: 1, condition: 'hasShelf' },
            { name: 'Front', widthFormula: 'W-3', heightFormula: 'H-3', qty: 1, condition: 'hasDoor' },
        ],
        hardware: [
            { name: 'Zawias Blum Clip Top', qtyFormula: 'Math.ceil(H/500)*2', condition: 'hasDoor' },
        ],
        notes: 'Standard lower cabinet with full bottom panel and 100mm top rail'
    },

    // ===== UPPER CABINETS (GÓRNE) =====
    {
        id: 'UPPER_STANDARD',
        patterns: ['G30', 'G40', 'G45', 'G50', 'G60', 'G80', 'G90', 'GÓRNA', 'SZAFKA GÓRNA', 'NADSTAWKA'],
        depthMm: 340,
        components: [
            { name: 'Bok', widthFormula: 'DEPTH', heightFormula: 'H', qty: 2 },
            { name: 'Wieniec górny', widthFormula: 'W-(2*18)', heightFormula: 'DEPTH', qty: 1 },
            { name: 'Wieniec dolny', widthFormula: 'W-(2*18)', heightFormula: 'DEPTH', qty: 1 },
            { name: 'Półka', widthFormula: 'W-(2*18)', heightFormula: 'DEPTH-20', qty: 1, condition: 'hasShelf' },
            { name: 'Front', widthFormula: 'W-3', heightFormula: 'H-3', qty: 1, condition: 'hasDoor' },
        ],
        hardware: [
            { name: 'Zawias Blum Clip Top', qtyFormula: 'Math.ceil(H/400)*2', condition: 'hasDoor' },
        ],
        notes: 'Upper cabinet with full top and bottom panels'
    },

    // ===== CARGO / WYSUW =====
    {
        id: 'CARGO',
        patterns: ['CARGO', 'WYSUW', 'CARGO WYSUWNE'],
        depthMm: 510,
        components: [
            { name: 'Front Cargo', widthFormula: 'W-3', heightFormula: 'H-3', qty: 1 },
        ],
        hardware: [], // NO HARDWARE! Cargo is a complete system. NO CORPUS - purchased as set.
        notes: 'CARGO IS A COMPLETE SYSTEM - CALCULATE ONLY FRONT! No corpus, no sides.'
    },

    // ===== BLENDA (Pionowy cokół - pełny korpus z okuciami) =====
    {
        id: 'BLENDA',
        patterns: ['BLENDA'],
        depthMm: 510,
        components: [
            { name: 'Bok', widthFormula: 'DEPTH', heightFormula: 'H', qty: 2 },
            { name: 'Wieniec dolny', widthFormula: 'W-(2*18)', heightFormula: 'DEPTH', qty: 1 },
            { name: 'Wieniec górny', widthFormula: 'W-(2*18)', heightFormula: 'DEPTH', qty: 1 },
            { name: 'Front', widthFormula: 'W-3', heightFormula: 'H-3', qty: 1 },
        ],
        hardware: [
            { name: 'Zawias Blum Clip Top', qtyFormula: '2' },
        ],
        notes: 'Blenda = pionowy cokół. Pełny korpus z bokami, wieńcami, frontem i zawiasami.'
    },

    // ===== FRIDGE/OVEN ENCLOSURE =====
    {
        id: 'APPLIANCE_ENCLOSURE',
        patterns: ['LODÓWKA', 'PIEKARNIK', 'OBUDOWA LODÓWKI', 'OBUDOWA PIEKARNIKA', 'AGD'],
        depthMm: 580,
        components: [
            { name: 'Bok', widthFormula: 'DEPTH', heightFormula: 'H', qty: 2 },
            { name: 'Trawers górny', widthFormula: 'W-(2*18)', heightFormula: '100', qty: 1 },
            { name: 'Blenda dolna', widthFormula: 'W', heightFormula: '100', qty: 1, condition: 'hasBlenda' },
        ],
        hardware: [], // No hardware - appliance enclosure
        notes: 'Appliance enclosure - NO shelves (shelves go in overhead cabinet)'
    },

    // ===== OVERHEAD ABOVE FRIDGE =====
    {
        id: 'OVERHEAD_FRIDGE',
        patterns: ['NADSTAWKA NAD LODÓWKĄ', 'GÓRNA NAD LODÓWKĄ', 'N_LOD'],
        depthMm: 340,
        components: [
            { name: 'Bok', widthFormula: 'DEPTH', heightFormula: 'H', qty: 2 },
            { name: 'Wieniec górny', widthFormula: 'W-(2*18)', heightFormula: 'DEPTH', qty: 1 },
            { name: 'Wieniec dolny', widthFormula: 'W-(2*18)', heightFormula: 'DEPTH', qty: 1 },
            { name: 'Półka', widthFormula: 'W-(2*18)', heightFormula: 'DEPTH-20', qty: 1 },
            { name: 'Front', widthFormula: 'W-3', heightFormula: 'H-3', qty: 1 },
        ],
        hardware: [
            { name: 'Zawias Blum Clip Top', qtyFormula: '2', condition: 'hasDoor' },
        ],
        notes: 'Overhead cabinet above fridge - HAS shelves!'
    },

    // ===== DRAWER CABINET =====
    {
        id: 'DRAWER_CABINET',
        patterns: ['SZUFLADY', 'SZUFLADOWA', 'KOMODA'],
        depthMm: 510,
        components: [
            { name: 'Bok', widthFormula: 'DEPTH', heightFormula: 'H', qty: 2 },
            { name: 'Wieniec dolny', widthFormula: 'W-(2*18)', heightFormula: 'DEPTH', qty: 1 },
            { name: 'Trawers górny', widthFormula: 'W-(2*18)', heightFormula: '100', qty: 1 },
            { name: 'Front szuflady', widthFormula: 'W-3', heightFormula: 'DRAWER_H-3', qty: 1, condition: 'perDrawer' },
        ],
        hardware: [
            { name: 'Prowadnica Merivobox', qtyFormula: '2', sku: 'MERIVOBOX', condition: 'perDrawer' },
        ],
        notes: 'Drawer cabinet - each drawer needs Merivobox slides'
    },

    // ===== DISPLAY/WITRYNA =====
    {
        id: 'VITRINE',
        patterns: ['WITRYNA', 'SZKLANA', 'DISPLAY'],
        depthMm: 340,
        components: [
            { name: 'Bok', widthFormula: 'DEPTH', heightFormula: 'H', qty: 2 },
            { name: 'Wieniec górny', widthFormula: 'W-(2*18)', heightFormula: 'DEPTH', qty: 1 },
            { name: 'Wieniec dolny', widthFormula: 'W-(2*18)', heightFormula: 'DEPTH', qty: 1 },
            { name: 'Półka szklana', widthFormula: 'W-(2*18)', heightFormula: 'DEPTH-20', qty: 2 },
            { name: 'Front szklany', widthFormula: 'W-3', heightFormula: 'H-3', qty: 1 },
        ],
        hardware: [
            { name: 'Zawias Blum Clip Top', qtyFormula: 'Math.ceil(H/400)*2' },
        ],
        notes: 'Display cabinet with glass front and shelves'
    },

    // ===== DISHWASHER ENCLOSURE =====
    {
        id: 'DISHWASHER',
        patterns: ['ZMYWARKA', 'OBUDOWA ZMYWARKI', 'ZM'],
        depthMm: 510,
        components: [
            { name: 'Bok', widthFormula: 'DEPTH', heightFormula: 'H', qty: 2 },
            { name: 'Trawers górny', widthFormula: 'W-(2*18)', heightFormula: '100', qty: 1 },
            { name: 'Front zmywarki', widthFormula: 'W-3', heightFormula: 'H-3', qty: 1, condition: 'hasPanel' },
        ],
        hardware: [], // Dishwasher panel uses special brackets
        notes: 'Dishwasher enclosure - sides and top rail only'
    },

    // ===== WARDROBE =====
    {
        id: 'WARDROBE',
        patterns: ['SZAFA', 'SZAFA WNĘKOWA', 'GARDEROBA', 'WNĘKA'],
        depthMm: 600,
        components: [
            { name: 'Bok', widthFormula: 'DEPTH', heightFormula: 'H', qty: 2 },
            { name: 'Wieniec górny', widthFormula: 'W-(2*18)', heightFormula: 'DEPTH', qty: 1 },
            { name: 'Wieniec dolny', widthFormula: 'W-(2*18)', heightFormula: 'DEPTH', qty: 1 },
            { name: 'Półka', widthFormula: 'W-(2*18)', heightFormula: 'DEPTH-20', qty: 4, condition: 'hasShelf' },
            { name: 'Drążek', widthFormula: 'W-(2*18)', heightFormula: '30', qty: 1, condition: 'hasRod' },
        ],
        hardware: [
            { name: 'Uchwyt drążka', qtyFormula: '2', condition: 'hasRod' },
        ],
        notes: 'Wardrobe with shelves and clothing rod'
    },

    // ===== SINK CABINET =====
    {
        id: 'SINK_CABINET',
        patterns: ['ZLEW', 'SZAFKA POD ZLEW', 'ZLEWOZMYWAK'],
        depthMm: 510,
        components: [
            { name: 'Bok', widthFormula: 'DEPTH', heightFormula: 'H', qty: 2 },
            { name: 'Wieniec dolny', widthFormula: 'W-(2*18)', heightFormula: 'DEPTH', qty: 1 },
            { name: 'Trawers górny', widthFormula: 'W-(2*18)', heightFormula: '100', qty: 2 }, // Two rails for sink cutout
            { name: 'Front', widthFormula: '(W-3)/2', heightFormula: 'H-3', qty: 2, condition: 'hasDoors' },
        ],
        hardware: [
            { name: 'Zawias Blum Clip Top', qtyFormula: '4', condition: 'hasDoors' }, // 2 per door
        ],
        notes: 'Sink cabinet - often has 2 doors and 2 top rails'
    },

    // ===== CORNER CABINET =====
    {
        id: 'CORNER_CABINET',
        patterns: ['NAROŻNIK', 'SZAFKA NAROŻNA', 'ROGOWA', 'CORNER'],
        depthMm: 510,
        components: [
            { name: 'Bok', widthFormula: 'DEPTH', heightFormula: 'H', qty: 2 },
            { name: 'Wieniec dolny', widthFormula: 'W-(2*18)', heightFormula: 'DEPTH', qty: 1 },
            { name: 'Trawers górny', widthFormula: 'W-(2*18)', heightFormula: '100', qty: 1 },
            { name: 'Półka obrotowa', widthFormula: 'SPECIAL', heightFormula: 'SPECIAL', qty: 2, condition: 'hasCarousel' },
            { name: 'Front', widthFormula: 'W-3', heightFormula: 'H-3', qty: 1 },
        ],
        hardware: [
            { name: 'Zawias Blum Clip Top', qtyFormula: 'Math.ceil(H/500)*2' },
        ],
        notes: 'Corner cabinet - may have carousel shelves'
    },
];

// ============ DIMENSION PATTERNS ============

export const DIMENSION_PATTERNS = {
    // Width x Height patterns
    wxh: /(\d+)\s*[x×]\s*(\d+)/gi,

    // Height patterns
    height: /h\s*[=:]\s*(\d+)/gi,

    // Width patterns  
    width: /[sw]\s*[=:]\s*(\d+)/gi,

    // Depth patterns
    depth: /g[łl]\s*[=:]\s*(\d+)/gi,

    // Quantity patterns
    qty: /(\d+)\s*szt|x\s*(\d+)|(\d+)\s*x/gi,

    // Cabinet ID patterns (e.g., D60, G30, N45)
    cabinetId: /[DGN]\d{2,3}/gi,
};

// ============ HELPER FUNCTION ============

export function matchCabinetType(text: string): CabinetTemplate | null {
    const upperText = text.toUpperCase();

    for (const template of CABINET_TEMPLATES) {
        for (const pattern of template.patterns) {
            if (upperText.includes(pattern.toUpperCase())) {
                return template;
            }
        }
    }

    return null;
}

export function formatDictionaryForPrompt(): string {
    let result = 'SŁOWNIK TYPÓW SZAFEK I ICH KOMPONENTÓW:\n\n';

    for (const template of CABINET_TEMPLATES) {
        result += `### ${template.id}\n`;
        result += `Wzorce: ${template.patterns.join(', ')}\n`;
        result += `Głębokość: ${template.depthMm}mm\n`;
        result += `Komponenty:\n`;

        for (const comp of template.components) {
            result += `  - ${comp.name}: ${comp.qty}x\n`;
        }

        if (template.hardware.length > 0) {
            result += `Okucia:\n`;
            for (const hw of template.hardware) {
                result += `  - ${hw.name}\n`;
            }
        } else {
            result += `Okucia: BRAK (gotowy system)\n`;
        }

        result += `Uwagi: ${template.notes}\n\n`;
    }

    return result;
}
