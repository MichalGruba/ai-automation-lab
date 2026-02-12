'use client';

import { useState } from 'react';
import { useEstimateStore } from '@/store/useEstimateStore';
import { Scale } from 'lucide-react';

export function PrintOffer() {
    const [offerTitle, setOfferTitle] = useState('OFERTA CENOWA');
    const {
        sheets,
        markup,
        assembly,
        catalogLastUpdated,
        getMaterialsTotal,
        getMarkupAmount,
        getAssemblyAmount,
        getGrandTotal,
    } = useEstimateStore();

    const materialsTotal = getMaterialsTotal();
    const markupAmount = getMarkupAmount();
    const assemblyAmount = getAssemblyAmount();
    const grandTotal = getGrandTotal();
    // Format daty DD-MM-RRRR
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const date = `${day}-${month}-${year}`;

    if (sheets.length === 0) return null;

    return (
        <div className="print-offer hidden print:block bg-white text-black p-8 max-w-[210mm] mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-8">
                <div className="flex items-center gap-3">
                    <Scale className="w-8 h-8" />
                    <div>
                        <h1 className="text-2xl font-bold uppercase tracking-wider">MAISTER</h1>
                        <p className="text-sm text-gray-600">Profesjonalne usługi stolarskie</p>
                    </div>
                </div>
                <div className="text-right">
                    <input
                        type="text"
                        value={offerTitle}
                        onChange={(e) => setOfferTitle(e.target.value)}
                        className="text-xl font-bold mb-1 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-gray-500 focus:outline-none text-right w-full print:border-0"
                        placeholder="OFERTA CENOWA"
                    />
                    <p className="text-sm">Data: <b>{date}</b></p>
                    <p className="text-sm text-gray-500">Cennik z dnia: {catalogLastUpdated || date}</p>
                </div>
            </div>

            {/* Intro */}
            <div className="mb-8">
                <p className="mb-2">Szanowni Państwo,</p>
                <p>Poniżej przedstawiamy szczegółowe zestawienie kosztów materiałowych oraz usług związanych z realizacją projektu.</p>
            </div>

            {/* Materials Table */}
            <div className="mb-8">
                <h3 className="font-bold border-b border-gray-300 pb-2 mb-4 uppercase text-sm">Zestawienie Materiałów</h3>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 text-left">
                            <th className="py-2 w-10">Lp.</th>
                            <th className="py-2">Nazwa Materiału / SKU</th>
                            <th className="py-2 text-right">Ilość (ark.)</th>
                            <th className="py-2 text-right">Cena jedn.</th>
                            <th className="py-2 text-right">Wartość</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sheets.map((sheet, index) => (
                            <tr key={sheet.id} className="border-b border-gray-100">
                                <td className="py-2 text-gray-500">{index + 1}</td>
                                <td className="py-2">
                                    <div className="font-medium">{sheet.materialName || 'Materiał użytkownika'}</div>
                                    <div className="text-xs text-gray-500">{sheet.sku}</div>
                                </td>
                                <td className="py-2 text-right">{sheet.sheetsNeeded}</td>
                                <td className="py-2 text-right">
                                    {sheet.unitPrice ? `${sheet.unitPrice.toFixed(2)} zł` : '-'}
                                </td>
                                <td className="py-2 text-right font-medium">
                                    {sheet.unitPrice
                                        ? `${(sheet.sheetsNeeded * sheet.unitPrice).toFixed(2)} zł`
                                        : 'Wycena ind.'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Summary Box */}
            <div className="flex justify-end mb-12">
                <div className="w-1/2 bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div className="space-y-3 text-sm">
                        {/* <div className="flex justify-between">
                            <span className="text-gray-600">Materiały (netto + VAT):</span>
                            <span className="font-medium">{materialsTotal.toFixed(2)} zł</span>
                        </div>
                        {markup > 0 && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Marża materiałowa:</span>
                                <span className="font-medium">{markupAmount.toFixed(2)} zł</span>
                            </div>
                        )}
                        {assembly > 0 && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Usługa montażu/cięcia:</span>
                                <span className="font-medium">{assemblyAmount.toFixed(2)} zł</span>
                            </div>
                        )} */}
                        <div className="border-t border-gray-300 pt-3 flex justify-between items-end mt-4">
                            <span className="font-bold text-lg">RAZEM DO ZAPŁATY:</span>
                            <span className="font-bold text-2xl heading-text">{grandTotal.toFixed(2)} zł</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-400 mt-auto pt-8 border-t border-gray-100">
                <p>Oferta ważna 14 dni. Podane ceny są cenami brutto (zawierają podatek VAT).</p>
                <p>Wygenerowano automatycznie przez system MAISTER.</p>

            </div>
        </div>
    );
}
