'use client';

import { DataTable } from './data-table';
import { ClientQuote } from './client-quote';
import { useEstimateStore } from '@/store/useEstimateStore';
import { FileSpreadsheet, FileText } from 'lucide-react';

/**
 * Wrapper component with tabs to switch between:
 * - Detailed estimate view (for editing)
 * - Client quote view (for presentation / printing)
 */
export function EstimatePanel() {
    const viewMode = useEstimateStore((s) => s.viewMode);
    const setViewMode = useEstimateStore((s) => s.setViewMode);

    return (
        <div className="space-y-4">
            {/* View Toggle */}
            <div className="flex gap-2 print:hidden">
                <button
                    onClick={() => setViewMode('edit')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${viewMode === 'edit'
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        }`}
                >
                    <FileSpreadsheet className="w-4 h-4" />
                    Edycja kosztorysu
                </button>
                <button
                    onClick={() => setViewMode('client')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${viewMode === 'client'
                        ? 'bg-slate-800 text-white shadow-md'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        }`}
                >
                    <FileText className="w-4 h-4" />
                    Oferta dla klienta
                </button>
            </div>

            {/* Content */}
            <div className={viewMode === 'edit' ? 'print:hidden' : ''}>
                {viewMode === 'edit' ? <DataTable /> : <ClientQuote />}
            </div>
        </div>
    );
}
