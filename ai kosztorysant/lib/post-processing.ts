/**
 * Post-Processing Module - Reguły logiczne do walidacji i korekty wyników AI
 * Rozwiązanie #4: automatyczna korekta typowych błędów
 */

export interface AnalyzedElement {
    name: string;
    width: number;
    height: number;
    qty: number;
    box_2d?: number[]; // [ymin, xmin, ymax, xmax] skala 0-1000
}

export interface AnalyzedGroup {
    sku: string;
    elements: AnalyzedElement[];
}

// ============ FILTRY POST-PROCESSINGU ============

/**
 * Filtr 1: Usuwa elementy które wyglądają jak drzwi budowlane
 * Cechy: przy krawędzi obrazu, nazwa zawiera "drzwi", brak oznaczeń szafkowych
 */
export function filterBuildingDoors(groups: AnalyzedGroup[]): AnalyzedGroup[] {
    const doorPatterns = [
        /drzwi/i,
        /door/i,
        /wejści/i,
        /wejsci/i,
        /entrance/i,
    ];

    // Słowa które NIE są drzwiami budowlanymi (fronty szafek)
    const notDoorPatterns = [
        /front/i,
        /d\d{2}/i,  // D60, D80 etc
        /g\d{2}/i,  // G60, G80 etc
        /szafk/i,
        /cargo/i,
        /zlew/i,
    ];

    return groups.map(group => {
        const filteredElements = group.elements.filter(el => {
            const name = el.name || '';

            // Sprawdź czy to front szafki (NIE usuwaj)
            if (notDoorPatterns.some(p => p.test(name))) {
                return true;
            }

            // Sprawdź czy to drzwi budowlane (USUŃ)
            if (doorPatterns.some(p => p.test(name))) {
                console.log(`[POST-PROCESS] Usunięto drzwi budowlane: ${name}`);
                return false;
            }

            // Sprawdź pozycję - elementy przy krawędzi obrazu
            if (el.box_2d && el.box_2d.length === 4) {
                const [ymin, xmin, ymax, xmax] = el.box_2d;
                const isAtLeftEdge = xmin < 50;  // < 5% od lewej
                const isAtRightEdge = xmax > 950; // > 95% od prawej
                const isFullHeight = (ymax - ymin) > 700; // > 70% wysokości

                // Element przy krawędzi i pełnej wysokości = prawdopodobnie drzwi
                if ((isAtLeftEdge || isAtRightEdge) && isFullHeight) {
                    // Ale tylko jeśli nie ma oznaczeń szafkowych
                    if (!notDoorPatterns.some(p => p.test(name))) {
                        console.log(`[POST-PROCESS] Usunięto element przy krawędzi (prawdopodobnie drzwi): ${name}`);
                        return false;
                    }
                }
            }

            return true;
        });

        return { ...group, elements: filteredElements };
    }).filter(g => g.elements.length > 0);
}

/**
 * Filtr 2: Usuwa okna z analizy
 */
export function filterWindows(groups: AnalyzedGroup[]): AnalyzedGroup[] {
    const windowPatterns = [
        /okno/i,
        /window/i,
        /szpros/i,
    ];

    return groups.map(group => {
        const filteredElements = group.elements.filter(el => {
            const name = el.name || '';

            if (windowPatterns.some(p => p.test(name))) {
                console.log(`[POST-PROCESS] Usunięto okno: ${name}`);
                return false;
            }

            return true;
        });

        return { ...group, elements: filteredElements };
    }).filter(g => g.elements.length > 0);
}

/**
 * Filtr 3: Dzieli cokół na osobne elementy gdy wykryto osobne sekcje zabudowy
 * Logika: jeśli są elementy z różnymi ID szafek które są przestrzennie oddzielone
 */
export function splitPlinths(groups: AnalyzedGroup[]): AnalyzedGroup[] {
    return groups.map(group => {
        const newElements: AnalyzedElement[] = [];

        for (const el of group.elements) {
            const name = (el.name || '').toLowerCase();

            // Sprawdź czy to cokół
            if (name.includes('cokół') || name.includes('cokol') || name.includes('plinth')) {
                // Sprawdź czy jest oznaczenie oddzielnych sekcji
                // Jeśli cokół jest bardzo szeroki (>2000mm) i nie ma podziału, podziel
                if (el.width > 2000 && el.qty === 1) {
                    console.log(`[POST-PROCESS] Uwaga: szeroki cokół (${el.width}mm) - może wymagać podziału na sekcje`);
                    // Zostawiamy oryginalny element, ale logujemy ostrzeżenie
                    // Lepszy podział wymaga analizy kontekstu innych elementów
                }
            }

            newElements.push(el);
        }

        return { ...group, elements: newElements };
    });
}

/**
 * Filtr 4: Walidacja wymiarów - red flags
 */
export function validateDimensions(groups: AnalyzedGroup[]): AnalyzedGroup[] {
    return groups.map(group => {
        const validatedElements = group.elements.map(el => {
            const name = el.name || '';
            let { width, height } = el;

            // Red flag: wymiar < 50mm (prawdopodobnie cm zamiast mm)
            if (width > 0 && width < 50) {
                console.log(`[POST-PROCESS] Korekta wymiaru (cm->mm): ${name} width ${width} -> ${width * 10}`);
                width = width * 10;
            }
            if (height > 0 && height < 50) {
                console.log(`[POST-PROCESS] Korekta wymiaru (cm->mm): ${name} height ${height} -> ${height * 10}`);
                height = height * 10;
            }

            // Red flag: wymiar > 3500mm (może być błąd)
            if (width > 3500) {
                console.log(`[POST-PROCESS] Ostrzeżenie: bardzo szeroki element ${name} (${width}mm)`);
            }
            if (height > 3500) {
                console.log(`[POST-PROCESS] Ostrzeżenie: bardzo wysoki element ${name} (${height}mm)`);
            }

            return { ...el, width, height };
        });

        return { ...group, elements: validatedElements };
    });
}

/**
 * Filtr 5: Walidacja logiki nadstawek - liczba nadstawek vs szafki górne
 */
export function validateOverheadCabinets(groups: AnalyzedGroup[]): AnalyzedGroup[] {
    // Policz szafki górne i nadstawki
    let upperCabinetCount = 0;
    let overheadCount = 0;

    for (const group of groups) {
        for (const el of group.elements) {
            const name = (el.name || '').toLowerCase();

            // Licz unikalne szafki górne (boki)
            if ((name.includes('bok') || name.includes('side')) &&
                (name.includes('g30') || name.includes('g40') || name.includes('g50') ||
                    name.includes('g60') || name.includes('g80') || name.includes('górn') ||
                    name.includes('gorn') || name.includes('witryn'))) {
                upperCabinetCount += el.qty / 2; // boki są parami
            }

            // Licz nadstawki
            if (name.includes('nadstawk') || name.includes('n_') || name.includes('overhead')) {
                if (name.includes('bok') || name.includes('side')) {
                    overheadCount += el.qty / 2;
                }
            }
        }
    }

    // Loguj jeśli liczby nie pasują
    if (overheadCount > upperCabinetCount + 2) {
        console.log(`[POST-PROCESS] Ostrzeżenie: za dużo nadstawek (${overheadCount}) względem szafek górnych (${upperCabinetCount})`);
    }

    return groups;
}

// ============ GŁÓWNA FUNKCJA POST-PROCESSINGU ============

/**
 * Filtr: Usuwa plecy (HDF) z analizy - zgodnie z wymaganiem użytkownika
 */
export function filterBackPanels(groups: AnalyzedGroup[]): AnalyzedGroup[] {
    const backPatterns = [
        /plecy/i,
        /hdf/i,
        /back/i,
    ];

    return groups.map(group => {
        const filteredElements = group.elements.filter(el => {
            const name = el.name || '';
            if (backPatterns.some(p => p.test(name))) {
                console.log(`[POST-PROCESS] Usunięto plecy: ${name}`);
                return false;
            }
            return true;
        });
        return { ...group, elements: filteredElements };
    }).filter(g => g.elements.length > 0);
}

/**
 * Uruchamia wszystkie filtry post-processingu na wynikach AI
 */
export function postProcessAnalysis(groups: AnalyzedGroup[]): AnalyzedGroup[] {
    console.log('[POST-PROCESS] Start - elementy:', groups.reduce((sum, g) => sum + g.elements.length, 0));

    let result = groups;

    // 1. Usuń drzwi budowlane
    result = filterBuildingDoors(result);

    // 2. Usuń okna
    result = filterWindows(result);

    // 2b. Usuń plecy (HDF) - NOWE
    result = filterBackPanels(result);

    // 3. Sprawdź cokoły
    result = splitPlinths(result);

    // 4. Waliduj wymiary
    result = validateDimensions(result);

    // 5. Waliduj nadstawki
    result = validateOverheadCabinets(result);

    // 6. Usuń okucia z elementów "Inne", "Blat", "Cokół"
    result = removeHardwareFromNonHardwareComponents(result);

    // 7. Deduplikacja luźnych elementów (np. powielone regały/półki)
    result = deduplicateComponents(result);

    console.log('[POST-PROCESS] Koniec - elementy:', result.reduce((sum, g) => sum + g.elements.length, 0));

    return result;
}

/**
 * Filtr 6: Blokuje przypisywanie okuć do komponentów które ich nie powinny mieć
 * (Inne, Blat, Cokół, Panel, Listwa)
 */
export function removeHardwareFromNonHardwareComponents(groups: AnalyzedGroup[]): AnalyzedGroup[] {
    const forbiddenKeywords = [
        'INNE', 'OTHER', 'BLAT', 'WORKTOP', 'COKÓŁ', 'PLINTH',
        'PANEL', 'LISTWA', 'STRIP'
    ];

    return groups.map(group => {
        // Jeśli cała grupa ma SKU wskazujące na kategorię zabronioną
        const skuUpper = group.sku.toUpperCase();
        if (forbiddenKeywords.some(kw => skuUpper.includes(kw))) {
            // Pozwól tylko na elementy typu 'material' (teoretycznie typ jest w rules, tu mamy tylko nazwy)
            // W tym kontekście po prostu usuwamy wszystko co wygląda na okucie
            const filteredElements = group.elements.filter(el => {
                const nameUpper = el.name.toUpperCase();
                const isHardware = nameUpper.includes('PROWADNICA') ||
                    nameUpper.includes('ZAWIAS') ||
                    nameUpper.includes('MOVENTO') ||
                    nameUpper.includes('TANDEM') ||
                    nameUpper.includes('MERIVOBOX') ||
                    nameUpper.includes('UCHWYT');

                if (isHardware) {
                    console.log(`[POST-PROCESS] Usunięto błędne okucie z grupy ${group.sku}: ${el.name}`);
                    return false;
                }
                return true;
            });
            return { ...group, elements: filteredElements };
        }

        // Jeśli grupa jest OK, ale poszczególne elementy mają złe nazwy (np. Blat ma prowadnice)
        const filteredElements = group.elements.filter(el => {
            const nameUpper = el.name.toUpperCase();
            // Jeśli element to np. "Prowadnica" a przypisany do czegoś co wygląda jak blat w nazwie
            if (nameUpper.includes('BLAT') || nameUpper.includes('COKÓŁ')) {
                // To jest sam materiał, OK.
                return true;
            }

            // Tutaj trudniej wykryć bez kontekstu rodzica, ale zakładamy że struktura grup jest poprawna.
            return true;
        });

        return { ...group, elements: filteredElements };
    });
}

/**
 * Filtr 7: Deduplikacja elementów
 * Łączy identyczne elementy (takie same wymiary i nazwy) w jeden z sumowaną ilością
 * Zapobiega dublowaniu np. regałów
 */
export function deduplicateComponents(groups: AnalyzedGroup[]): AnalyzedGroup[] {
    return groups.map(group => {
        const uniqueMap = new Map<string, AnalyzedElement>();

        for (const el of group.elements) {
            // Pomijamy elementy unikalne z ID szafki, bo one MAJĄ być unikalne
            // Ale jeśli AI wygenerowało 5 razy "Półka - Regał" o tych samych wymiarach
            // to chcemy to złączyć.

            // Klucz unikalności: Nazwa + Wymiary
            const key = `${el.name}|${el.width}|${el.height}|${el.box_2d?.join(',') || ''}`;

            if (uniqueMap.has(key)) {
                const existing = uniqueMap.get(key)!;
                // Sumuj ilość
                existing.qty += el.qty;
                console.log(`[POST-PROCESS] Złączono duplikat: ${el.name} (x${el.qty}) -> Razem x${existing.qty}`);
            } else {
                uniqueMap.set(key, { ...el });
            }
        }

        return { ...group, elements: Array.from(uniqueMap.values()) };
    });
}
