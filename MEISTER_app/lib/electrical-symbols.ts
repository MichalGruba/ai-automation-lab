/**
 * Electrical and Installation Symbols Dictionary
 * Słownik symboli elektrycznych i instalacyjnych do analizy rysunków technicznych
 */

// ============ SYMBOL CATEGORIES ============

export interface SymbolDefinition {
    symbol: string;
    name: string;
    description: string;
    mountingHeight?: string;  // Standardowa wysokość montażu
    category: 'lighting' | 'switches' | 'outlets' | 'network' | 'ventilation' | 'plumbing' | 'heating' | 'safety';
}

// ============ ELECTRICAL SYMBOLS ============

export const ELECTRICAL_SYMBOLS: SymbolDefinition[] = [
    // OŚWIETLENIE
    {
        symbol: '⊕',
        name: 'Punkt świetlny sufitowy',
        description: 'Lampa sufitowa zwykła',
        mountingHeight: 'sufit',
        category: 'lighting'
    },
    {
        symbol: '⊙',
        name: 'Lampa wpuszczana',
        description: 'Oprawa wpuszczana w sufit (downlight)',
        mountingHeight: 'sufit',
        category: 'lighting'
    },
    {
        symbol: '⊗',
        name: 'Punkt świetlny ścienny',
        description: 'Kinkiet lub lampa ścienna',
        mountingHeight: '180-200 cm',
        category: 'lighting'
    },
    {
        symbol: 'LED',
        name: 'Taśma LED',
        description: 'Oświetlenie liniowe LED',
        mountingHeight: 'wg projektu',
        category: 'lighting'
    },
    {
        symbol: 'SPOT',
        name: 'Reflektor/Spot',
        description: 'Oprawa kierunkowa, regulowana',
        mountingHeight: 'sufit',
        category: 'lighting'
    },

    // WŁĄCZNIKI
    {
        symbol: 'S',
        name: 'Włącznik pojedynczy',
        description: 'Standardowy włącznik jednobiegunowy',
        mountingHeight: '110 cm',
        category: 'switches'
    },
    {
        symbol: 'S2',
        name: 'Włącznik podwójny',
        description: 'Włącznik dwubiegunowy (2 obwody)',
        mountingHeight: '110 cm',
        category: 'switches'
    },
    {
        symbol: 'Sn',
        name: 'Włącznik schodowy',
        description: 'Włącznik przełączny/schodowy',
        mountingHeight: '110 cm',
        category: 'switches'
    },
    {
        symbol: 'W',
        name: 'Włącznik',
        description: 'Włącznik (alternatywne oznaczenie)',
        mountingHeight: '110 cm',
        category: 'switches'
    },

    // GNIAZDKA
    {
        symbol: '□',
        name: 'Kontakt wtykowy pojedynczy',
        description: 'Gniazdko elektryczne 230V',
        mountingHeight: '30 cm',
        category: 'outlets'
    },
    {
        symbol: '□□',
        name: 'Kontakt wtykowy podwójny',
        description: 'Gniazdko podwójne 230V',
        mountingHeight: '30 cm',
        category: 'outlets'
    },
    {
        symbol: 'IP44',
        name: 'Gniazdko bryzgoszczelne',
        description: 'Gniazdko do pomieszczeń wilgotnych',
        mountingHeight: '100-120 cm (łazienka)',
        category: 'outlets'
    },
    {
        symbol: 'IP65',
        name: 'Gniazdko zewnętrzne',
        description: 'Gniazdko do użytku na zewnątrz',
        mountingHeight: 'wg projektu',
        category: 'outlets'
    },

    // SIEĆ I MULTIMEDIA
    {
        symbol: 'RJ45',
        name: 'Gniazdo sieciowe',
        description: 'Gniazdo internetowe LAN',
        mountingHeight: '30 cm (podłoga) lub 100 cm (blat)',
        category: 'network'
    },
    {
        symbol: 'TV',
        name: 'Gniazdo TV/SAT',
        description: 'Gniazdo antenowe telewizyjne',
        mountingHeight: '100-120 cm lub za szafką RTV',
        category: 'network'
    },
    {
        symbol: 'SAT',
        name: 'Gniazdo satelitarne',
        description: 'Gniazdo SAT',
        mountingHeight: '100-120 cm',
        category: 'network'
    },
    {
        symbol: 'HDMI',
        name: 'Przepust HDMI',
        description: 'Gniazdo przepustowe HDMI',
        mountingHeight: 'za TV',
        category: 'network'
    },

    // WENTYLACJA
    {
        symbol: 'WYW',
        name: 'Wywiew',
        description: 'Kratka wentylacyjna wyciągowa',
        mountingHeight: 'sufit lub wysoko na ścianie',
        category: 'ventilation'
    },
    {
        symbol: 'NAW',
        name: 'Nawiew',
        description: 'Kratka wentylacyjna nawiewna',
        mountingHeight: 'wg projektu',
        category: 'ventilation'
    },

    // INSTALACJA WODNA
    {
        symbol: 'ZW',
        name: 'Punkt wody zimnej',
        description: 'Przyłącze wody zimnej',
        mountingHeight: '55 cm (umywalka)',
        category: 'plumbing'
    },
    {
        symbol: 'CW',
        name: 'Punkt wody ciepłej',
        description: 'Przyłącze wody ciepłej',
        mountingHeight: '55 cm (umywalka)',
        category: 'plumbing'
    },
    {
        symbol: 'CWU',
        name: 'Punkt wody ciepłej użytkowej',
        description: 'Przyłącze CWU (alternatywne oznaczenie)',
        mountingHeight: '55 cm',
        category: 'plumbing'
    },
    {
        symbol: 'KAN',
        name: 'Odpływ kanalizacyjny',
        description: 'Punkt odpływu kanalizacji',
        mountingHeight: 'podłoga',
        category: 'plumbing'
    },

    // OGRZEWANIE
    {
        symbol: 'RAD',
        name: 'Grzejnik',
        description: 'Kaloryfer/grzejnik',
        mountingHeight: '10-15 cm od podłogi',
        category: 'heating'
    },
    {
        symbol: 'TERM',
        name: 'Termostat',
        description: 'Regulator temperatury',
        mountingHeight: '150 cm',
        category: 'heating'
    },

    // BEZPIECZEŃSTWO
    {
        symbol: 'PIR',
        name: 'Czujnik ruchu',
        description: 'Detektor ruchu PIR',
        mountingHeight: '200-220 cm',
        category: 'safety'
    },
    {
        symbol: 'DYM',
        name: 'Czujnik dymu',
        description: 'Detektor dymu/pożaru',
        mountingHeight: 'sufit',
        category: 'safety'
    },
];

// ============ DIMENSION VALIDATION RULES ============

export interface DimensionRange {
    element: string;
    minMm: number;
    maxMm: number;
    typicalMm?: number;
    notes: string;
}

export const DIMENSION_VALIDATION: DimensionRange[] = [
    // SZAFKI KUCHENNE
    { element: 'bok_dolny', minMm: 450, maxMm: 600, typicalMm: 510, notes: 'Bok szafki dolnej kuchennej' },
    { element: 'bok_gorny', minMm: 280, maxMm: 400, typicalMm: 340, notes: 'Bok szafki górnej kuchennej' },
    { element: 'szerokosc_szafki', minMm: 150, maxMm: 1200, notes: 'Szerokość modułu (D30=300, D60=600, D120=1200)' },
    { element: 'wysokosc_dolna', minMm: 650, maxMm: 850, typicalMm: 720, notes: 'Wysokość korpusu szafki dolnej' },
    { element: 'wysokosc_gorna', minMm: 300, maxMm: 1000, typicalMm: 720, notes: 'Wysokość szafki górnej' },

    // PŁYTY
    { element: 'grubosc_plyty', minMm: 16, maxMm: 25, typicalMm: 18, notes: 'Grubość płyty meblowej (16/18/25mm)' },
    { element: 'polka', minMm: 200, maxMm: 1200, notes: 'Długość półki (szerokość wnęki - 2x grubość)' },

    // FRONTY
    { element: 'front_szerokosc', minMm: 150, maxMm: 1200, notes: 'Szerokość frontu/drzwi' },
    { element: 'front_wysokosc', minMm: 100, maxMm: 2500, notes: 'Wysokość frontu/drzwi' },

    // SZUFLADY
    { element: 'szuflada_glebokosc', minMm: 250, maxMm: 600, typicalMm: 500, notes: 'Głębokość prowadnic szuflady' },
    { element: 'szuflada_szerokosc', minMm: 200, maxMm: 1200, notes: 'Wewnętrzna szerokość szuflady' },

    // BLATY
    { element: 'blat_glebokosc', minMm: 580, maxMm: 650, typicalMm: 600, notes: 'Głębokość blatu kuchennego' },
    { element: 'blat_grubosc', minMm: 20, maxMm: 60, typicalMm: 38, notes: 'Grubość blatu (28/38/40mm)' },
];

// ============ UNIT DETECTION RULES ============

export const UNIT_DETECTION_RULES = {
    // Zasady rozpoznawania jednostek
    rules: [
        'Jeśli wartość > 3000, prawdopodobnie mm (np. 2350 = 2350mm = 235cm)',
        'Jeśli wartość 100-3000, sprawdź kontekst (100mm vs 100cm znacząco się różnią)',
        'Jeśli wartość < 100 i dotyczy głównego wymiaru mebla, prawdopodobnie cm',
        'Wartości z przecinkiem dziesiętnym (np. 2.35) to metry',
        'Szukaj jednostek przy liczbach: mm, cm, m',
    ],

    // Progi decyzyjne
    thresholds: {
        definitelyMm: 3000,      // > 3000 = na pewno mm
        likelyCm: 50,           // < 50 bez jednostki przy wymiarze mebla = prawdopodobnie cm
        checkContext: [50, 3000] // Wartości w tym zakresie wymagają sprawdzenia kontekstu
    }
};

// ============ FORMAT FUNCTION FOR PROMPT ============

/**
 * Formatuje słownik symboli elektrycznych do wstawienia w prompt AI
 */
export function formatElectricalSymbolsForPrompt(): string {
    const sections = {
        lighting: '💡 OŚWIETLENIE',
        switches: '🔘 WŁĄCZNIKI',
        outlets: '🔌 GNIAZDKA',
        network: '🌐 SIEĆ I MULTIMEDIA',
        ventilation: '💨 WENTYLACJA',
        plumbing: '🚿 INSTALACJA WODNA',
        heating: '🔥 OGRZEWANIE',
        safety: '🚨 BEZPIECZEŃSTWO'
    };

    let result = '═══════════════════════════════════════════════════════════════\n';
    result += 'SYMBOLE ELEKTRYCZNE I INSTALACYJNE - ROZPOZNAWANIE\n';
    result += '═══════════════════════════════════════════════════════════════\n\n';

    for (const [category, title] of Object.entries(sections)) {
        const symbols = ELECTRICAL_SYMBOLS.filter(s => s.category === category);
        if (symbols.length > 0) {
            result += `${title}:\n`;
            for (const sym of symbols) {
                result += `• ${sym.symbol} = ${sym.name}`;
                if (sym.mountingHeight) {
                    result += ` (wys. ${sym.mountingHeight})`;
                }
                result += '\n';
            }
            result += '\n';
        }
    }

    return result;
}

/**
 * Formatuje zasady walidacji wymiarów do promptu AI
 */
export function formatDimensionRulesForPrompt(): string {
    let result = '═══════════════════════════════════════════════════════════════\n';
    result += 'WERYFIKACJA WYMIARÓW - TYPOWE ZAKRESY (mm)\n';
    result += '═══════════════════════════════════════════════════════════════\n\n';

    result += '| Element | Min | Max | Typowy |\n';
    result += '|---------|-----|-----|--------|\n';

    for (const dim of DIMENSION_VALIDATION) {
        const typical = dim.typicalMm ? dim.typicalMm.toString() : '-';
        result += `| ${dim.element} | ${dim.minMm} | ${dim.maxMm} | ${typical} |\n`;
    }

    result += '\n⚠️ Jeśli wymiar wykracza poza zakres, SPRAWDŹ jednostki!\n';
    result += '- Wymiar < 50mm dla głównego elementu = prawdopodobnie błąd\n';
    result += '- Wymiar > 3000mm = sprawdź czy to nie cm (np. 350cm = 3500)\n';

    return result;
}
