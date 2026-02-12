import { DrawingAnalyzer } from '@/components/estimator/drawing-analyzer';
import { PencilRuler } from 'lucide-react';

export default function DrawingAnalyzerPage() {
    return (
        <main className="min-h-screen bg-background text-foreground relative overflow-hidden">
            {/* Background Decoration */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                    backgroundSize: '20px 20px'
                }}
            />

            {/* Header */}
            <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                            <PencilRuler className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-bold tracking-tight text-foreground font-mono">
                                Analiza Rysunków
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                Oznaczanie elementów mebli
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-[1200px]">
                {/* Intro */}
                <section className="text-center space-y-4 max-w-2xl mx-auto mb-10">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-primary">
                        Analizuj rysunki techniczne
                    </h2>
                    <p className="text-muted-foreground text-base leading-relaxed">
                        Wgraj rysunek techniczny mebla, a następnie oznacz brakujące elementy,
                        które nie zostały wykryte automatycznie.
                    </p>
                </section>

                {/* Drawing Analyzer Component */}
                <DrawingAnalyzer />
            </div>

            {/* Footer */}
            <footer className="py-8 text-center border-t border-border/40 mt-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 border border-border/50">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <p className="text-xs font-medium text-muted-foreground">
                        System gotowy do pracy
                    </p>
                </div>
            </footer>
        </main>
    );
}
