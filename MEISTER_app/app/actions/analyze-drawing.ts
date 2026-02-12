'use server';

import { analyzeDrawing } from "@/lib/gemini";
import { postProcessAnalysis } from "@/lib/post-processing";
import { SheetResult } from "@/types/estimate";
import { expandBlumDrawer } from "@/lib/blum-catalog";
import { isDrawerElement, isDoorElement, expandElement, hasExpansionRule } from "@/lib/component-rules";
import { FurnitureElement } from "@/types/estimate";
import { findBlumMaterial } from "@/lib/blum-prices";

// Egger sheet dimensions (mm) - standard full sheet
const SHEET_AREA_MM2 = 2800 * 2070; // 5,796,000 mm²

export async function analyzeDrawingAction(
    imageBase64: string,
    description?: string,
    markers: { id: number; x: number; y: number; width?: number; height?: number; type?: string }[] = []
): Promise<{
    success: boolean;
    sheets?: SheetResult[];
    error?: string;
}> {
    try {
        const rawData = await analyzeDrawing(imageBase64, description);

        console.log('Raw AI response:', JSON.stringify(rawData, null, 2));

        // POST-PROCESSING: filtrowanie drzwi, okien, walidacja wymiarów
        const processedData = postProcessAnalysis(rawData);

        console.log('After post-processing:', JSON.stringify(processedData, null, 2));

        // GEOMETRIC MATCHING & STRICT FILTERING (REGION SUPPORT)
        // User Requirement: "Wdrażamy pomysł z oznaczaniem komponentów prostopadłościanem"
        if (markers && markers.length > 0) {
            console.log('Performing STRICT Geometric Matching (Region/Point).');

            // 1. Collect all "Spatial Candidates" (Elements that have box_2d)
            const candidates: { groupIdx: number, elIdx: number, box: number[], element: any }[] = [];
            processedData.forEach((group, gIdx) => {
                group.elements.forEach((el, eIdx) => {
                    if (Array.isArray(el.box_2d) && el.box_2d.length === 4) {
                        candidates.push({ groupIdx: gIdx, elIdx: eIdx, box: el.box_2d, element: el });
                    }
                });
            });

            const matchedElements: { sku: string, element: any }[] = [];

            markers.forEach(marker => {
                const mx = marker.x * 10;
                const my = marker.y * 10;

                let matchIndex = -1;

                if (marker.width && marker.height) {
                    // REGION MODE: User drew a Box.
                    // Logic: Center of AI Element must be INSIDE User Box.
                    const userY1 = my;
                    const userX1 = mx;
                    const userY2 = my + (marker.height * 10);
                    const userX2 = mx + (marker.width * 10);

                    matchIndex = candidates.findIndex(c => {
                        const [ay1, ax1, ay2, ax2] = c.box;
                        const cy = (ay1 + ay2) / 2;
                        const cx = (ax1 + ax2) / 2;
                        return cy >= userY1 && cy <= userY2 && cx >= userX1 && cx <= userX2;
                    });
                } else {
                    // POINT MODE: User placed a Dot.
                    // Logic: User Dot must be INSIDE AI Element.
                    matchIndex = candidates.findIndex(c => {
                        const [ymin, xmin, ymax, xmax] = c.box;
                        return my >= ymin && my <= ymax && mx >= xmin && mx <= xmax;
                    });
                }

                if (matchIndex !== -1) {
                    const match = candidates[matchIndex];
                    const originalEl = match.element;
                    const groupSku = processedData[match.groupIdx].sku;

                    const newEl = { ...originalEl };
                    newEl.qty = 1; // Force single unit for marker match prevents duplication if AI assumed qty>1

                    // USER TYPE OVERRIDE (Core Feature)
                    // If user selected a type, enforce it regardless of what AI saw
                    if (marker.type) {
                        // FORCE TYPE from Marker
                        // Format: "Type - Type M{id}" -> componentId = "Type M{id}" (Preserves name in UI)
                        newEl.name = `${marker.type} - ${marker.type} M${marker.id}`;
                    } else {
                        // KEEP AI NAME but add Marker ID
                        const cleanName = (newEl.name || 'Element').replace(/ - M\d+.*$/, '').replace(/ - Marker.*$/, '');
                        // Format: "Name - Name M{id}"
                        newEl.name = `${cleanName} - ${cleanName} M${marker.id}`;
                    }

                    matchedElements.push({ sku: groupSku, element: newEl });

                    // Remove candidate to prevent double-matching
                    candidates.splice(matchIndex, 1);

                    console.log(`MATCHED M${marker.id} -> ${newEl.name}`);
                } else {
                    // NO MATCH FOUND
                    // If user selected type, assume it exists even if AI missed it
                    const name = marker.type
                        ? `${marker.type} - ${marker.type} M${marker.id}`
                        : `Szafka (Nie wykryto) - Szafka (Nie wykryto) M${marker.id}`;

                    console.log(`Marker M${marker.id} - NO MATCH. Creating Placeholder: ${name}`);
                    matchedElements.push({
                        sku: 'NIEZNANY',
                        element: {
                            name: name,
                            width: 600,
                            height: 720,
                            qty: 1,
                            box_2d: marker.width && marker.height
                                ? [my, mx, my + (marker.height * 10), mx + (marker.width * 10)]
                                : [my - 50, mx - 50, my + 50, mx + 50]
                        }
                    });
                }
            });

            // 3. Rebuild processedData with ONLY matched elements
            const newGroupsMap = new Map<string, any[]>();
            matchedElements.forEach(item => {
                if (!newGroupsMap.has(item.sku)) newGroupsMap.set(item.sku, []);
                newGroupsMap.get(item.sku)!.push(item.element);
            });

            processedData.length = 0;
            newGroupsMap.forEach((elems, sku) => {
                processedData.push({ sku, elements: elems });
            });
        }

        const finalSheets: SheetResult[] = [];
        const hardwareMap = new Map<string, { name: string; width: number; height: number; qty: number; box_2d?: number[] }[]>();
        const sheetMap = new Map<string, { elements: { name: string; width: number; height: number; qty: number; box_2d?: number[] }[], realSku: string }>();

        // Process groups (using post-processed data)
        for (const group of processedData) {
            const groupSku = (group.sku || 'NIEZNANY').toUpperCase().trim();

            for (const el of (group.elements || [])) {
                const elName = (el.name || '').toUpperCase();
                // Po post-processingu wartości są już numeryczne
                const elQty = typeof el.qty === 'number' ? el.qty : (parseInt(String(el.qty)) || 1);
                const width = typeof el.width === 'number' ? el.width : (parseInt(String(el.width)) || 0);
                const height = typeof el.height === 'number' ? el.height : (parseInt(String(el.height)) || 0);
                const box_2d = Array.isArray(el.box_2d) ? el.box_2d : undefined;

                // Extract component ID from element name (e.g., "Front - D60_Zlew" -> "D60_Zlew")
                const componentIdMatch = (el.name || '').match(/ - (.+)$/);
                const componentId = componentIdMatch ? componentIdMatch[1] : null;

                // CARGO/WYSUW - Now handled by expansion rules (Front only)
                // We REMOVED the hardcoded skip logic here to allow `expandElement` to handle it.

                /* 
                const isCargo = elName.includes('CARGO') || elName.includes('WYSUW') ||
                    (componentId && (componentId.toUpperCase().includes('CARGO') || componentId.toUpperCase().includes('WYSUW')));
                
                if (isCargo) { ... } 
                */
                const isCargo = elName.includes('CARGO') || elName.includes('WYSUW') ||
                    (componentId && (componentId.toUpperCase().includes('CARGO') || componentId.toUpperCase().includes('WYSUW')));


                // Check if this element is a drawer (SZUFLADA) - triggers Blum hardware expansion
                // Priority 1: Drawers (Complex Blum Logic from catalog)
                const isDrawer = isDrawerElement(elName) || groupSku.startsWith('SZUFLADA');

                // Priority 2: Generic Expansion Rule (Cabinet, Dishwasher, Door, Sink, CARGO, NADSTAWKA)
                const hasRule = hasExpansionRule(elName) || isCargo; // Force Cargo to use rule

                if (isDrawer) {
                    // Extract drawer system info from name or SKU
                    // DEFAULT: MERIVOBOX (Blum Merivobox komplet)
                    let drawerSpec = groupSku.startsWith('SZUFLADA') ? groupSku : `SZUFLADA MERIVOBOX L-500`;

                    // Try to get depth from element name (e.g., "Szuflada L-450")
                    const depthMatch = elName.match(/L-?(\d+)/);
                    if (depthMatch) {
                        drawerSpec = `SZUFLADA MERIVOBOX L-${depthMatch[1]}`;
                    }

                    // Check for system type in name - only override if explicitly specified
                    if (elName.includes('TANDEMBOX')) drawerSpec = drawerSpec.replace('MERIVOBOX', 'TANDEMBOX');
                    if (elName.includes('MOVENTO')) drawerSpec = drawerSpec.replace('MERIVOBOX', 'MOVENTO');
                    if (elName.includes('LEGRABOX')) drawerSpec = drawerSpec.replace('MERIVOBOX', 'LEGRABOX');

                    // Expand drawer into Blum hardware components
                    const parts = expandBlumDrawer(drawerSpec, width);

                    for (const part of parts) {
                        if (!hardwareMap.has(part.sku)) {
                            hardwareMap.set(part.sku, []);
                        }
                        hardwareMap.get(part.sku)!.push({
                            // Add component ID suffix so hardware groups with its parent component
                            name: componentId ? `${part.name} - ${componentId}` : part.name,
                            width: 0,
                            height: 0,
                            qty: elQty * part.qty,
                            box_2d: box_2d
                        });
                    }
                } else if (hasRule) {
                    // Generic Expansion (Cabinets, Doors, Appliances)
                    // Uses 'lib/component-rules.ts' to determine parts (Body, Front, Hardware)
                    const expansion = expandElement({
                        name: el.name, // e.g. "Szafka Zlew"
                        width,
                        height,
                        qty: elQty,
                        depth: 0 // Will be inferred or defaulted
                    });

                    for (const component of expansion.components) {
                        const compName = componentId ? `${component.name} - ${componentId}` : component.name;

                        if (component.type === 'hardware') {
                            const sku = component.sku || 'NIEZNANY';
                            if (!hardwareMap.has(sku)) hardwareMap.set(sku, []);
                            hardwareMap.get(sku)!.push({
                                name: compName,
                                width: 0,
                                height: 0,
                                qty: component.qty,
                                box_2d: box_2d
                            });
                        } else {
                            // Material (Sheet)
                            // CHANGE: Group by Component ID if available (to separate "D60_1" from "D60_2")
                            // Fallback to groupSku if no ID.
                            const sheetKey = componentId || groupSku;

                            if (!sheetMap.has(sheetKey)) sheetMap.set(sheetKey, { elements: [], realSku: groupSku });
                            sheetMap.get(sheetKey)!.elements.push({
                                name: compName,
                                width: component.width || 0,
                                height: component.height || 0,
                                qty: component.qty,
                                box_2d: box_2d
                            });
                        }
                    }
                } else {
                    // Standard sheet element (No expansion rule matches)
                    // Change: Group by Component ID
                    const sheetKey = componentId || groupSku;

                    if (!sheetMap.has(sheetKey)) {
                        sheetMap.set(sheetKey, { elements: [], realSku: groupSku });
                    }
                    sheetMap.get(sheetKey)!.elements.push({
                        name: el.name || 'Element',
                        width,
                        height,
                        qty: elQty,
                        box_2d
                    });
                }
            }
        }

        // Convert sheet map to SheetResult entries
        // IMPORTANT: Use realSku (the actual material code) NOT the grouping key (componentId)
        for (const [_groupKey, sheetData] of sheetMap) {
            const { elements, realSku } = sheetData;
            const totalAreaMm2 = elements.reduce(
                (sum, el) => sum + (el.width * el.height * el.qty), 0
            );
            const sheetsNeeded = Math.ceil(totalAreaMm2 / SHEET_AREA_MM2);

            if (elements.length > 0) {
                finalSheets.push({
                    sku: realSku,
                    elements,
                    totalAreaMm2,
                    sheetsNeeded: Math.max(sheetsNeeded, 1),
                });
            }
        }

        // Convert Hardware Map to SheetResult entries with Blum prices
        // IMPORTANT: Do NOT aggregate by SKU - keep separate per component for proper grouping!
        for (const [sku, items] of hardwareMap) {
            // Group items by their component (extracted from name suffix)
            const byComponent = new Map<string, typeof items>();
            for (const item of items) {
                const match = (item.name || '').match(/ - (.+)$/);
                const compId = match ? match[1] : 'Inne';
                if (!byComponent.has(compId)) {
                    byComponent.set(compId, []);
                }
                byComponent.get(compId)!.push(item);
            }

            // Create separate hardware entry for each component
            for (const [compId, compItems] of byComponent) {
                // RULE: SKIP hardware for 'Inne' or unknown components - Hardware MUST belong to a specific unit!
                if (compId === 'Inne' || !compId) {
                    console.log(`Skipping orphan hardware for 'Inne' component (Strict Mode): ${items.length} items`);
                    continue;
                }

                // SKIP HARDWARE FOR CARGO/WYSUW COMPONENTS! They are complete systems!
                if (compId.toUpperCase().includes('CARGO') || compId.toUpperCase().includes('WYSUW')) {
                    console.log(`Skipping hardware for CARGO component: ${compId}`);
                    continue;
                }

                const totalQty = compItems.reduce((sum, item) => sum + item.qty, 0);

                // Look up price in Blum catalog
                const blumResult = findBlumMaterial(sku);
                const unitPrice = blumResult.found ? blumResult.price : null;
                const baseName = blumResult.found
                    ? blumResult.description || `Blum ${blumResult.symbol}`
                    : compItems[0]?.name?.replace(/ - .+$/, '') || 'Okucia Blum';

                finalSheets.push({
                    sku: sku,
                    elements: compItems.map(item => ({
                        ...item,
                        // Ensure name has component suffix for UI grouping
                        name: `${baseName} - ${compId}`
                    })),
                    totalAreaMm2: 0,
                    sheetsNeeded: totalQty,
                    unitPrice: unitPrice,
                    isHardware: true,
                    materialName: `${baseName} - ${compId}`
                });
            }
        }

        console.log('Processed Sheets Count:', finalSheets.length);

        return { success: true, sheets: finalSheets };
    } catch (error) {
        console.error('Error analyzing drawing:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to analyze drawing',
        };
    }
}
