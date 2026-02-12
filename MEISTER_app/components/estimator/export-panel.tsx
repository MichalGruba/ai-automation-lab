'use client';

import { useEstimateStore, PRODUCT_TYPE_LABELS } from '@/store/useEstimateStore';
import { Button } from '@/components/ui/button';
import { Copy, Printer, Check } from 'lucide-react';
import { useState, useCallback } from 'react';

const SHEET_WIDTH_MM = 2800;
const SHEET_HEIGHT_MM = 2070;

export function ExportPanel() {
    const {
        sheets,
        markup,
        assembly,
        catalogLastUpdated,
        getTotalSheets,
        getMaterialsTotal,
        getMarkupAmount,
        getAssemblyAmount,
        getGrandTotal
    } = useEstimateStore();
    const [copied, setCopied] = useState(false);

    const totalSheets = getTotalSheets();
    const materialsTotal = getMaterialsTotal();
    const markupAmount = getMarkupAmount();
    const assemblyAmount = getAssemblyAmount();
    const grandTotal = getGrandTotal();

    const generateSummary = () => {
        const lines: string[] = [
            '='.repeat(50),
            'KOSZTORYS ARKUSZY - MAISTER',
            '='.repeat(50),
            '',
            `Data: ${new Date().toLocaleDateString('pl-PL')}`,
            `Cennik: ${catalogLastUpdated}`,
            `Arkusz: ${SHEET_WIDTH_MM} × ${SHEET_HEIGHT_MM} mm`,
            '',
            '-'.repeat(50),
            'MATERIAŁY:',
            '-'.repeat(50),
            '',
        ];

        sheets.forEach((sheet, index) => {
            const cost = sheet.unitPrice !== null ? sheet.sheetsNeeded * sheet.unitPrice : null;
            const utilization = sheet.totalAreaMm2 > 0 && sheet.sheetsNeeded > 0
                ? Math.round((sheet.totalAreaMm2 / (sheet.sheetsNeeded * SHEET_WIDTH_MM * SHEET_HEIGHT_MM)) * 100)
                : 0;

            lines.push(
                `${index + 1}. ${sheet.sku} - ${sheet.materialName || '(nieznany)'}`,
                `   Arkuszy: ${sheet.sheetsNeeded} szt.`,
                `   Wykorzystanie: ${utilization}%`,
                cost !== null ? `   Koszt: ${cost.toFixed(0)} zł` : '   Koszt: na zapytanie',
                ''
            );
        });

        lines.push(
            '='.repeat(50),
            'PODSUMOWANIE:',
            '='.repeat(50),
            '',
            `Arkuszy łącznie: ${totalSheets}`,
            `Materiały: ${materialsTotal.toFixed(0)} zł`,
        );

        if (markup > 0) {
            lines.push(`Marża (${markup}%): ${markupAmount.toFixed(0)} zł`);
        }

        if (assembly > 0) {
            lines.push(`Montaż (${assembly}%): ${assemblyAmount.toFixed(0)} zł`);
        }

        lines.push(
            '',
            `RAZEM: ${grandTotal.toFixed(0)} zł`,
            '='.repeat(50)
        );

        return lines.join('\n');
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(generateSummary());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (sheets.length === 0) return null;

    return (
        <div className="flex items-center gap-3">
            <div className="hidden lg:block px-4 py-1.5 bg-primary/5 rounded-full border border-primary/10 mr-2">
                <p className="text-sm font-medium text-primary">
                    {totalSheets} ark. • {grandTotal > 0 ? `${grandTotal.toFixed(0)} zł` : '---'}
                </p>
            </div>

            <Button onClick={handleCopy} variant="outline" size="sm" className="h-9">
                {copied ? (
                    <><Check className="w-3.5 h-3.5 mr-2 text-green-600" /><span className="text-green-600">Skopiowano</span></>
                ) : (
                    <><Copy className="w-3.5 h-3.5 mr-2" /><span>Kopiuj</span></>
                )}
            </Button>

            <Button
                onClick={() => {
                    // Przełącz na widok oferty klienta przed drukowaniem
                    const store = useEstimateStore.getState();
                    if (store.viewMode !== 'client') {
                        store.setViewMode('client');
                    }
                    // Poczekaj aż React wyrenderuje ClientQuote
                    setTimeout(() => window.print(), 150);
                }}
                size="sm"
                className="h-9 bg-primary text-primary-foreground"
            >
                <Printer className="w-3.5 h-3.5 mr-2" />
                Drukuj
            </Button>
        </div>
    );
}
