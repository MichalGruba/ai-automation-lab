/**
 * Knowledge Base Loader
 * Loads CSV with drawing reading instructions for AI context
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export interface ReadingInstruction {
    element: string;
    drawingType: string;
    location: string;
    howToRead: string;
    dataFormat: string;
    example: string;
    additionalInfo: string;
}

let cachedInstructions: ReadingInstruction[] | null = null;

/**
 * Parse the instructions CSV file
 */
function parseInstructionsCSV(csvContent: string): ReadingInstruction[] {
    const lines = csvContent.split('\n').filter(line => line.trim());

    // Skip header
    const dataLines = lines.slice(1);
    const instructions: ReadingInstruction[] = [];

    for (const line of dataLines) {
        // Handle quoted CSV fields
        const fields = parseCSVLine(line);

        if (fields.length >= 7) {
            instructions.push({
                element: fields[0],
                drawingType: fields[1],
                location: fields[2],
                howToRead: fields[3],
                dataFormat: fields[4],
                example: fields[5],
                additionalInfo: fields[6],
            });
        }
    }

    return instructions;
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    fields.push(current.trim());
    return fields;
}

/**
 * Load instructions from CSV file
 */
export function loadInstructions(): ReadingInstruction[] {
    if (cachedInstructions) {
        return cachedInstructions;
    }

    try {
        const csvPath = join(process.cwd(), 'Database', 'instrukcje_odczytu_projektow.csv');
        const csvContent = readFileSync(csvPath, 'utf-8');
        cachedInstructions = parseInstructionsCSV(csvContent);
        console.log(`Loaded ${cachedInstructions.length} reading instructions`);
        return cachedInstructions;
    } catch (error) {
        console.error('Failed to load instructions CSV:', error);
        return [];
    }
}

/**
 * Get furniture-related instructions for AI prompt
 */
export function getFurnitureInstructions(): ReadingInstruction[] {
    const instructions = loadInstructions();

    // Filter for furniture-related elements
    const furnitureKeywords = [
        'szafka', 'blat', 'półka', 'szafa', 'biurko', 'zlewozmywak',
        'płyta', 'piekarnik', 'lodówka', 'zmywarka', 'pralka',
        'lustro', 'szafka lustrzana', 'parapet'
    ];

    return instructions.filter(inst =>
        furnitureKeywords.some(kw =>
            inst.element.toLowerCase().includes(kw)
        )
    );
}

/**
 * Format instructions for AI prompt context
 */
export function formatInstructionsForPrompt(): string {
    const furnitureInstructions = getFurnitureInstructions();

    if (furnitureInstructions.length === 0) {
        return '';
    }

    const lines = [
        '## INSTRUKCJE ODCZYTU RYSUNKÓW TECHNICZNYCH',
        '',
        'Poniżej znajdują się wskazówki jak odczytywać elementy z rysunków:',
        '',
    ];

    for (const inst of furnitureInstructions) {
        lines.push(`### ${inst.element}`);
        lines.push(`- **Typ rysunku:** ${inst.drawingType}`);
        lines.push(`- **Lokalizacja:** ${inst.location}`);
        lines.push(`- **Jak odczytać:** ${inst.howToRead}`);
        lines.push(`- **Format danych:** ${inst.dataFormat}`);
        lines.push(`- **Przykład:** ${inst.example}`);
        if (inst.additionalInfo) {
            lines.push(`- **Uwagi:** ${inst.additionalInfo}`);
        }
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Get compact version of instructions for token-limited prompts
 */
export function getCompactInstructionsForPrompt(): string {
    const furnitureInstructions = getFurnitureInstructions();

    if (furnitureInstructions.length === 0) {
        return '';
    }

    const lines = [
        '## WSKAZÓWKI ODCZYTU',
        '',
    ];

    // Group by element type, limit to most important
    const important = furnitureInstructions.slice(0, 15);

    for (const inst of important) {
        lines.push(`- **${inst.element}**: ${inst.howToRead} (${inst.dataFormat})`);
    }

    return lines.join('\n');
}

/**
 * Get component expansion hints for prompt
 */
export function getComponentExpansionHints(): string {
    return `
## KOMPONENTY DO WYKRYCIA

Gdy wykryjesz element meblowy, zwróć uwagę na:

### SZUFLADA
Sprawdź wymiary (szer x wys x głęb). Głębokość określa typ prowadnic Blum.
Standardowe głębokości: 250, 300, 350, 400, 450, 500, 550, 600 mm.

### DRZWI / FRONT
Sprawdź wysokość - określa liczbę zawiasów:
- do 800mm: 2 zawiasy
- 800-1200mm: 3 zawiasy
- powyżej 1200mm: 4 zawiasy

### PÓŁKI
Każda półka wymaga 4 podpórek.

### SZAFKA GÓRNA
Szukaj ozn. "G" + wymiar (np. G60 = górna 60cm).
Sprawdź wysokość montażu od podłogi.

### SZAFKA DOLNA
Szukaj ozn. "D" + wymiar (np. D80 = dolna 80cm).
Zawiera szuflady lub drzwi.

### CARGO / WYSUWANE
Kosz wysuwany wymaga prowadnic pełnego wysuwu.
`;
}
