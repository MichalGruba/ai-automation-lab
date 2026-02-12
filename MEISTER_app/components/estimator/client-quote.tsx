'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useEstimateStore } from '@/store/useEstimateStore';
import { FileText, Printer, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuoteContentProps {
    offerTitle: string;
    setOfferTitle: (val: string) => void;
    formattedDate: string;
    materials: [string, { qty: number; cost: number }][];
    hardware: [string, { qty: number; cost: number }][];
    totals: {
        materials: number;
        markup: number;
        markupAmount: number;
        assembly: number;
        assemblyAmount: number;
        grandTotal: number;
    };
    onPrint: () => void;
    isPrint?: boolean;
    showDetails: boolean;
    onToggleDetails?: () => void;
}

/**
 * Komponent prezentacyjny oferty.
 * Używany zarówno w widoku ekranowym, jak i w ukrytym portalu do druku.
 */
function QuoteContent({
    offerTitle,
    setOfferTitle,
    formattedDate,
    materials,
    hardware,
    totals,
    onPrint,
    isPrint = false,
    showDetails,
    onToggleDetails
}: QuoteContentProps) {
    return (
        <div
            className={`bg-white border-slate-200 overflow-hidden mx-auto ${isPrint ? 'w-full border-0 shadow-none rounded-none' : 'rounded-2xl shadow-xl border max-w-3xl'
                }`}
            style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
        >
            {/* ── NAGŁÓWEK ── */}
            <div
                className="px-10 pt-10 pb-8"
                style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                }}
            >
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        {isPrint ? (
                            <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">
                                {offerTitle || 'Oferta cenowa'}
                            </h1>
                        ) : (
                            <input
                                type="text"
                                value={offerTitle}
                                onChange={(e) => setOfferTitle(e.target.value)}
                                className="text-3xl font-semibold tracking-tight bg-transparent border-none outline-none text-white w-full placeholder-white/40"
                                placeholder="Oferta cenowa"
                                style={{ caretColor: '#60a5fa' }}
                            />
                        )}
                        <p className="text-slate-400 text-sm mt-3">
                            {formattedDate}
                        </p>
                    </div>
                    {!isPrint && (
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={onToggleDetails}
                                variant="ghost"
                                size="icon"
                                className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg no-print"
                                title={showDetails ? "Ukryj szczegóły (Marża/Montaż)" : "Pokaż szczegóły"}
                            >
                                {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Button
                                onClick={onPrint}
                                variant="ghost"
                                className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg no-print"
                            >
                                <Printer className="w-4 h-4 mr-2" />
                                Drukuj
                            </Button>
                        </div>
                    )}
                </div>

                {/* Dekoracyjna linia */}
                <div className="mt-6 flex gap-1">
                    <div className="h-1 w-16 rounded-full bg-blue-500"></div>
                    <div className="h-1 w-8 rounded-full bg-blue-500/40"></div>
                    <div className="h-1 w-4 rounded-full bg-blue-500/20"></div>
                </div>
            </div>

            {/* ── TREŚĆ ── */}
            <div className="px-10 py-8 space-y-8">

                {/* Materiały */}
                {materials.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">
                                Materiały
                            </h3>
                            <div className="flex-1 h-px bg-slate-200"></div>
                        </div>

                        <div className="space-y-0">
                            {materials.map(([name, data], idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 text-sm font-bold tabular-nums">
                                            {data.qty}
                                        </span>
                                        <span className="text-slate-800 text-sm font-medium leading-snug max-w-md truncate">
                                            {name}
                                        </span>
                                    </div>
                                    <span className="text-slate-900 font-bold text-sm tabular-nums whitespace-nowrap ml-4">
                                        {data.cost > 0 ? `${data.cost.toFixed(0)} zł` : '—'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Okucia */}
                {hardware.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                            <h3 className="text-xs font-bold text-amber-600 uppercase tracking-[0.2em]">
                                Okucia i akcesoria
                            </h3>
                            <div className="flex-1 h-px bg-amber-200/60"></div>
                        </div>

                        <div className="space-y-0">
                            {hardware.map(([name, data], idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 text-sm font-bold tabular-nums">
                                            {data.qty}
                                        </span>
                                        <span className="text-slate-800 text-sm font-medium leading-snug max-w-md truncate">
                                            {name}
                                        </span>
                                    </div>
                                    <span className="text-slate-900 font-bold text-sm tabular-nums whitespace-nowrap ml-4">
                                        {data.cost > 0 ? `${data.cost.toFixed(0)} zł` : '—'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* ── PODSUMOWANIE ── */}
            <div className={`mx-10 mb-8 rounded-xl bg-slate-50 border border-slate-200 p-6 ${isPrint ? 'break-inside-avoid' : ''}`}>
                <div className="space-y-2">
                    {/* <div className="flex justify-between text-sm text-slate-600">
                        <span>Materiały</span>
                        <span className="font-medium text-slate-800 tabular-nums">
                            {totals.materials.toFixed(0)} zł
                        </span>
                    </div>

                    {showDetails && totals.markup > 0 && (
                        <div className="flex justify-between text-sm text-slate-600">
                            <span>Marża ({totals.markup}%)</span>
                            <span className="font-medium text-slate-800 tabular-nums">
                                {totals.markupAmount.toFixed(0)} zł
                            </span>
                        </div>
                    )}

                    {showDetails && totals.assembly > 0 && (
                        <div className="flex justify-between text-sm text-slate-600">
                            <span>Montaż ({totals.assembly}%)</span>
                            <span className="font-medium text-slate-800 tabular-nums">
                                {totals.assemblyAmount.toFixed(0)} zł
                            </span>
                        </div>
                    )} */}

                    {/* Separator */}
                    <div className="pt-3 mt-3 border-t-2 border-slate-800">
                        <div className="flex justify-between items-baseline">
                            <span className="text-base font-bold text-slate-800 uppercase tracking-wide">
                                Razem
                            </span>
                            <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                                {totals.grandTotal > 0 ? `${totals.grandTotal.toFixed(0)} zł` : '—'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── STOPKA ── */}
            <div className="px-10 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                    Oferta ważna 30 dni · Ceny netto
                </p>
                <div className="relative h-40 w-[640px] transition-opacity hover:opacity-100">
                    <Image
                        src="/logo-transparent.png"
                        alt="MAISTER"
                        fill
                        className="object-contain object-right"
                        unoptimized
                    />
                </div>
            </div>
        </div>
    );
}

/**
 * Główny komponent z logiką i portalem.
 */
export function ClientQuote() {
    const [offerTitle, setOfferTitle] = useState('Oferta cenowa');
    const [showDetails, setShowDetails] = useState(true);
    // Stan dla kontenera portalu
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

    useEffect(() => {
        const container = document.getElementById('print-portal');
        if (container) {
            setPortalContainer(container);
        } else {
            console.error('Print portal container not found');
        }
    }, []);

    const {
        sheets,
        markup,
        assembly,
        getMaterialsTotal,
        getMarkupAmount,
        getAssemblyAmount,
        getGrandTotal,
    } = useEstimateStore();

    const materialsTotal = getMaterialsTotal();
    const markupAmount = getMarkupAmount();
    const assemblyAmount = getAssemblyAmount();
    const grandTotal = getGrandTotal();

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const formattedDate = `${day}.${month}.${year}`;

    // Grupowanie arkuszy po nazwie materiału
    const groupedItems = sheets.reduce((acc, sheet) => {
        const name = sheet.materialName || 'Materiał';
        const cost = sheet.unitPrice !== null ? sheet.unitPrice * sheet.sheetsNeeded : 0;

        if (!acc[name]) {
            acc[name] = { qty: 0, cost: 0, isHardware: sheet.isHardware };
        }
        acc[name].qty += sheet.sheetsNeeded;
        acc[name].cost += cost;
        return acc;
    }, {} as Record<string, { qty: number; cost: number; isHardware?: boolean }>);

    const materials = Object.entries(groupedItems).filter(([, v]) => !v.isHardware);
    const hardware = Object.entries(groupedItems).filter(([, v]) => v.isHardware);

    const handlePrint = () => {
        window.print();
    };

    if (sheets.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-16 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500 text-lg">Brak pozycji w ofercie</p>
            </div>
        );
    }

    const contentProps: QuoteContentProps = {
        offerTitle,
        setOfferTitle,
        formattedDate,
        materials,
        hardware,
        totals: {
            materials: materialsTotal,
            markup,
            markupAmount,
            assembly,
            assemblyAmount,
            grandTotal,
        },
        onPrint: handlePrint,
        showDetails,
        onToggleDetails: () => setShowDetails(!showDetails)
    };

    return (
        <>
            {/* Wersja ekranowa (ukrywana w druku przez print:hidden) */}
            <div className="print:hidden">
                <QuoteContent {...contentProps} isPrint={false} />
            </div>

            {/* Wersja do druku (Renderowana w portalu) */}
            {/* Widoczna tylko w druku dzięki klasom wewnątrz globals.css #print-portal */}
            {portalContainer && createPortal(
                <div className="hidden print:block w-full">
                    <QuoteContent {...contentProps} isPrint={true} />
                </div>,
                portalContainer
            )}
        </>
    );
}
