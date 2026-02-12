'use client';

import { useEstimateStore, SheetItem, ProductType, PRODUCT_TYPE_LABELS } from '@/store/useEstimateStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, AlertCircle, Check, Loader2, Package, Info } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useEffect, useState, useCallback, useRef } from 'react';
import { lookupBlumAction } from '@/app/actions/lookup-blum';

const SHEET_WIDTH_MM = 2800;
const SHEET_HEIGHT_MM = 2070;
const SHEET_AREA_MM2 = SHEET_WIDTH_MM * SHEET_HEIGHT_MM;

export function DataTable() {
    const {
        sheets,
        catalogLoaded,
        markup,
        assembly,
        updateSheet,
        removeSheet,
        addSheet,
        setCatalog,
        findMaterial,
        getTotalSheets,
        getTotalPieces,
        getMaterialsTotal,
        getMarkupAmount,
        getSubtotalWithMarkup,
        getAssemblyAmount,
        getGrandTotal,
    } = useEstimateStore();

    const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

    // Load catalog on mount
    useEffect(() => {
        if (!catalogLoaded) {
            setIsLoadingCatalog(true);
            fetch('/api/catalog')
                .then((res) => res.json())
                .then((data) => {
                    if (data.success) {
                        setCatalog(data.catalog, data.lastUpdated);
                    }
                })
                .catch(console.error)
                .finally(() => setIsLoadingCatalog(false));
        }
    }, [catalogLoaded, setCatalog]);

    const totalSheets = getTotalSheets();
    const totalPieces = getTotalPieces();
    const materialsTotal = getMaterialsTotal();
    const markupAmount = getMarkupAmount();
    const subtotalWithMarkup = getSubtotalWithMarkup();
    const assemblyAmount = getAssemblyAmount();
    const grandTotal = getGrandTotal();

    const addNewSheet = (asHardware = false) => {
        const newSheet: SheetItem = {
            id: `sheet-${Date.now()}`,
            sku: '',
            materialName: asHardware ? '' : '',
            productType: 'plate_18mm',
            sheetsNeeded: 1,
            unitPrice: null,
            totalAreaMm2: 0,
            elements: [],
            error: null,
            isHardware: asHardware,
        };
        addSheet(newSheet);
    };

    // Debounce timers for SKU lookup
    const skuTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    // Handle SKU change - update immediately, debounce catalog lookup
    const handleSkuChange = useCallback(
        (sheetId: string, newSku: string, productType: ProductType) => {
            // Immediately update SKU value so input stays responsive
            updateSheet(sheetId, { sku: newSku });

            // Clear previous debounce timer
            if (skuTimers.current[sheetId]) {
                clearTimeout(skuTimers.current[sheetId]);
            }

            // Debounce catalog lookup (500ms)
            skuTimers.current[sheetId] = setTimeout(async () => {
                // 1. Szukaj w katalogu Egger (płyty)
                const entry = findMaterial(newSku);

                if (entry) {
                    const price = entry.prices[productType];
                    updateSheet(sheetId, {
                        materialName: entry.name,
                        unitPrice: price,
                        error: price === null ? 'Cena na zapytanie' : null,
                    });
                    return;
                }

                // 2. Szukaj w katalogu Blum (okucia) — server action
                if (newSku.trim()) {
                    try {
                        const blumResult = await lookupBlumAction(newSku);
                        if (blumResult.found) {
                            updateSheet(sheetId, {
                                materialName: blumResult.description || blumResult.symbol || 'Okucia Blum',
                                unitPrice: blumResult.price ?? null,
                                isHardware: true,
                                error: null,
                            });
                            return;
                        }
                    } catch (e) {
                        console.warn('Blum lookup failed:', e);
                    }
                }

                // 3. Nie znaleziono nigdzie
                updateSheet(sheetId, {
                    materialName: '',
                    unitPrice: null,
                    error: newSku.trim() ? `Nieznany materiał: ${newSku}` : null,
                });
            }, 500);
        },
        [findMaterial, updateSheet]
    );

    // Handle product type change
    const handleProductTypeChange = useCallback(
        (sheetId: string, sheet: SheetItem, newType: ProductType) => {
            const entry = findMaterial(sheet.sku);

            if (entry) {
                const price = entry.prices[newType];
                updateSheet(sheetId, {
                    productType: newType,
                    unitPrice: price,
                    error: price === null ? 'Cena na zapytanie' : null,
                });
            } else {
                updateSheet(sheetId, { productType: newType });
            }
        },
        [findMaterial, updateSheet]
    );

    if (isLoadingCatalog) {
        return (
            <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p>Ładowanie katalogu materiałów...</p>
            </div>
        );
    }

    if (sheets.length === 0) {
        return (
            <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center text-muted-foreground flex-1 flex flex-col items-center justify-center">
                <Package className="w-12 h-12 mb-4 text-muted-foreground/50" />
                <p className="mb-4 text-lg">Brak arkuszy w kosztorysie</p>
                <p className="mb-6 text-sm text-muted-foreground/70">Wgraj rysunek techniczny aby AI wyliczyło potrzebne arkusze</p>
                <Button onClick={() => addNewSheet()} variant="outline" size="lg">
                    <Plus className="w-5 h-5 mr-2" />
                    Dodaj ręcznie
                </Button>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden flex flex-col h-full">
            {/* Header Info */}
            <div className="bg-muted/30 px-4 py-3 border-b border-border flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="w-4 h-4" />
                <span>Rozmiar standardowego arkusza: <strong className="text-foreground">{SHEET_WIDTH_MM} × {SHEET_HEIGHT_MM} mm</strong></span>
            </div>

            <div className="overflow-x-auto flex-1">
                <table className="w-full">
                    <thead className="bg-muted/50 border-b border-border">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">SKU</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Materiał</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[150px]">Typ</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Ilość</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Cena/szt</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">Razem</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[60px]"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {sheets.map((sheet) => {
                            const hasError = !!sheet.error;
                            const sheetCost = sheet.unitPrice !== null ? sheet.unitPrice * sheet.sheetsNeeded : 0;
                            const utilization = sheet.totalAreaMm2 > 0 && sheet.sheetsNeeded > 0
                                ? Math.round((sheet.totalAreaMm2 / (sheet.sheetsNeeded * SHEET_AREA_MM2)) * 100)
                                : 0;

                            return (
                                <tr key={sheet.id} className={`transition-colors group ${hasError ? 'bg-destructive/5' : 'hover:bg-muted/30'}`}>
                                    {/* SKU */}
                                    <td className="px-4 py-3">
                                        <div className="relative">
                                            <Input
                                                value={sheet.sku}
                                                onChange={(e) => handleSkuChange(sheet.id, e.target.value.toUpperCase(), sheet.productType)}
                                                className={`font-mono text-sm uppercase border-transparent shadow-none focus-visible:ring-1 hover:border-border p-2 h-10 ${hasError ? 'border-destructive' : ''}`}
                                                placeholder="W980"
                                            />
                                            {sheet.materialName && !hasError && (
                                                <Check className="absolute right-2 top-2.5 w-4 h-4 text-green-600" />
                                            )}
                                        </div>
                                    </td>
                                    {/* Material Name */}
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-0.5">
                                            <span className={`text-sm ${sheet.materialName ? 'text-foreground font-medium' : 'text-muted-foreground italic'}`}>
                                                {sheet.materialName || 'Wpisz kod SKU...'}
                                            </span>
                                            {!sheet.isHardware && sheet.elements.length > 0 && (
                                                <span className="text-xs text-muted-foreground">
                                                    {sheet.elements.reduce((a, b) => a + b.qty, 0)} elementów • {(sheet.totalAreaMm2 / 1000000).toFixed(2)} m² • {utilization}% wykorzystania
                                                </span>
                                            )}
                                            {sheet.isHardware && (
                                                <span className="text-xs text-blue-600 font-medium">
                                                    Okucia Blum (szt.)
                                                </span>
                                            )}
                                            {hasError && (
                                                <span className="text-xs text-destructive flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" />
                                                    {sheet.error}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    {/* Product Type - hide for hardware */}
                                    <td className="px-4 py-3">
                                        {sheet.isHardware ? (
                                            <span className="text-xs text-blue-600 font-medium">Okucia</span>
                                        ) : (
                                            <Select
                                                value={sheet.productType}
                                                onValueChange={(value) => handleProductTypeChange(sheet.id, sheet, value as ProductType)}
                                            >
                                                <SelectTrigger className="w-full border-transparent shadow-none focus:ring-1 hover:border-border h-10 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(PRODUCT_TYPE_LABELS).map(([key, label]) => (
                                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </td>
                                    {/* Quantity with unit label */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-1">
                                            <Input
                                                type="number"
                                                min="1"
                                                value={sheet.sheetsNeeded}
                                                onChange={(e) => updateSheet(sheet.id, { sheetsNeeded: parseInt(e.target.value) || 1 })}
                                                className="text-sm text-center font-bold border-transparent shadow-none focus-visible:ring-1 hover:border-border p-2 h-10 w-16"
                                            />
                                            <span className="text-xs text-muted-foreground">
                                                {sheet.isHardware ? 'szt.' : 'ark.'}
                                            </span>
                                        </div>
                                    </td>
                                    {/* Unit Price */}
                                    <td className="px-4 py-3 text-right">
                                        {sheet.unitPrice !== null && sheet.unitPrice !== undefined ? (
                                            <span className="text-sm font-medium">{sheet.unitPrice.toFixed(2)} zł</span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">---</span>
                                        )}
                                    </td>
                                    {/* Total */}
                                    <td className="px-4 py-3 text-right">
                                        {sheetCost > 0 ? (
                                            <span className="text-lg font-bold text-primary">{sheetCost.toFixed(0)} zł</span>
                                        ) : (
                                            <span className="text-sm text-muted-foreground italic">---</span>
                                        )}
                                    </td>
                                    {/* Actions */}
                                    <td className="px-4 py-3 text-center">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeSheet(sheet.id)}
                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all h-8 w-8 p-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Footer Summary */}
            <div className="border-t-2 border-border bg-muted/20 p-4">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <Button onClick={() => addNewSheet(false)} variant="outline" size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Dodaj arkusz
                        </Button>
                        <Button onClick={() => addNewSheet(true)} variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                            <Plus className="w-4 h-4 mr-2" />
                            Dodaj okucia
                        </Button>
                    </div>
                    <div className="text-right space-y-1">
                        {totalSheets > 0 && (
                            <div className="text-sm text-muted-foreground">
                                Arkuszy: <span className="font-bold text-foreground">{totalSheets}</span>
                            </div>
                        )}
                        {totalPieces > 0 && (
                            <div className="text-sm text-blue-600">
                                Okucia: <span className="font-bold">{totalPieces} szt.</span>
                            </div>
                        )}
                        <div className="text-sm">
                            Materiały: <span className="font-medium">{materialsTotal.toFixed(0)} zł</span>
                        </div>
                        {markup > 0 && (
                            <div className="text-sm text-orange-600">
                                + Marża ({markup}%): <span className="font-medium">{markupAmount.toFixed(0)} zł</span>
                            </div>
                        )}
                        {assembly > 0 && (
                            <div className="text-sm text-blue-600">
                                + Montaż ({assembly}%): <span className="font-medium">{assemblyAmount.toFixed(0)} zł</span>
                            </div>
                        )}
                        <div className="text-2xl font-bold text-primary pt-1 border-t border-border mt-2">
                            {grandTotal > 0 ? `${grandTotal.toFixed(0)} zł` : '---'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
