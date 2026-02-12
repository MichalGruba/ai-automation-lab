'use client';

import { useEstimateStore } from '@/store/useEstimateStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Percent, Calendar, Database, Wrench } from 'lucide-react';

export function SettingsPanel() {
    const { markup, setMarkup, assembly, setAssembly, catalogLoaded, catalogLastUpdated, catalog } = useEstimateStore();

    return (
        <div className="space-y-6">
            {/* Catalog Info */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    <Database className="w-3.5 h-3.5" />
                    Status katalogu
                </div>
                {catalogLoaded ? (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            <span className="text-sm font-medium text-foreground">Katalog załadowany</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>Aktualizacja: {catalogLastUpdated}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {catalog.length} materiałów w bazie
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                        <span className="text-sm text-muted-foreground">Ładowanie katalogu...</span>
                    </div>
                )}
            </div>

            {/* Markup Setting */}
            <div className="space-y-2">
                <Label htmlFor="markup" className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Percent className="w-3.5 h-3.5 text-primary" />
                    Marża (%)
                </Label>
                <Input
                    id="markup"
                    type="number"
                    min="0"
                    max="200"
                    step="1"
                    value={markup}
                    onChange={(e) => setMarkup(parseFloat(e.target.value) || 0)}
                    className="text-lg font-semibold bg-muted/30 border-transparent focus:border-primary focus:bg-background transition-colors h-12"
                />
                <p className="text-xs text-muted-foreground">
                    Liczona od łącznej kwoty materiałów
                </p>
            </div>

            {/* Assembly Setting */}
            <div className="space-y-2">
                <Label htmlFor="assembly" className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Wrench className="w-3.5 h-3.5 text-orange-500" />
                    Montaż (%)
                </Label>
                <Input
                    id="assembly"
                    type="number"
                    min="0"
                    max="200"
                    step="1"
                    value={assembly}
                    onChange={(e) => setAssembly(parseFloat(e.target.value) || 0)}
                    className="text-lg font-semibold bg-muted/30 border-transparent focus:border-primary focus:bg-background transition-colors h-12"
                />
                <p className="text-xs text-muted-foreground">
                    Liczona od kwoty materiałów + marży
                </p>
            </div>
        </div>
    );
}
