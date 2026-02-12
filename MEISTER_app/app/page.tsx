import { DrawingAnalyzer } from '@/components/estimator/drawing-analyzer';
import Image from 'next/image';
import { SettingsPanel } from '@/components/estimator/settings-panel';
import { EstimatePanel } from '@/components/estimator/estimate-panel';
import { ExportPanel } from '@/components/estimator/export-panel';
import { Scale, Ruler, PencilRuler } from 'lucide-react';

export default function Home() {
  return (
    <>
      <main className="min-h-screen bg-background text-foreground relative overflow-hidden">
        {/* Background Decoration - Premium Technical Pattern */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: `
                radial-gradient(circle at 50% -20%, rgba(59, 130, 246, 0.08), transparent 70%),
                radial-gradient(circle at 100% 0%, rgba(16, 185, 129, 0.05), transparent 40%),
                radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.05), transparent 40%)
              `
          }}
        />
        <div className="absolute inset-0 pointer-events-none opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-64 md:h-14 md:w-[500px]">
                  <Image
                    src="/logo-transparent.png"
                    alt="MAISTER"
                    fill
                    className="object-contain object-left scale-[3.5] origin-left"
                    priority
                    unoptimized
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">

                <ExportPanel />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 max-w-[1600px] space-y-12">

          {/* Intro / Hero */}
          <section className="text-center space-y-4 max-w-3xl mx-auto mb-12 relative animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 text-primary text-xs font-medium mb-4 border border-primary/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              System AI 2.0
            </div>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
              Profesjonalna wycena mebli <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 pb-2">w 5 minut</span>
            </h2>
            <p className="text-muted-foreground text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
              Wgraj projekt, a system sam rozpozna elementy i policzy koszty produkcji.
              Bez skomplikowanych konfiguracji.
            </p>
          </section>

          {/* Top Section: Drawing + Settings */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Drawing Analyzer (Left) */}
            <div className="xl:col-span-9">
              <DrawingAnalyzer />
            </div>

            {/* Settings (Right Sticky) */}
            <div className="xl:col-span-3">
              <div className="sticky top-24 space-y-6">
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-wide mb-4">Ustawienia wyceny</h3>
                  <SettingsPanel />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Full Data Table */}
          <div className="pt-8 border-t border-border">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Scale className="w-6 h-6 text-primary" />
              Szczegółowy kosztorys i zapotrzebowanie
            </h3>
            <div className="min-h-[500px]">
              <EstimatePanel />
            </div>
          </div>

          {/* Footer */}
          <footer className="pt-16 pb-8 text-center border-t border-border/40 mt-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 border border-border/50">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <p className="text-xs font-medium text-muted-foreground">
                System gotowy do pracy • Dane przetwarzane lokalnie
              </p>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}
