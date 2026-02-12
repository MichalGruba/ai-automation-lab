'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { analyzeDrawingAction } from '@/app/actions/analyze-drawing';
import { SheetResult } from '@/types/estimate';
import { useEstimateStore, SheetItem } from '@/store/useEstimateStore';
import { Button } from '@/components/ui/button';

interface ProcessedFile {
    name: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    error?: string;
}

export function FileUpload() {
    const { sheets, setSheets, setStatus, setErrorMessage, errorMessage, findMaterial } = useEstimateStore();
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
    const [totalFiles, setTotalFiles] = useState(0);

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const convertPdfToImage = async (file: File): Promise<string[]> => {
        try {
            console.log('Starting PDF conversion...');
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const images: string[] = [];
            const maxPages = Math.min(pdf.numPages, 10);

            for (let i = 1; i <= maxPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');

                if (!context) throw new Error('Cannot create canvas context');

                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({ canvasContext: context, viewport, canvas }).promise;
                images.push(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
            }

            return images;
        } catch (error) {
            console.error('PDF conversion error:', error);
            throw new Error('Nie udało się przekonwertować PDF');
        }
    };

    const processFile = async (file: File): Promise<SheetResult[]> => {
        let images: string[];

        if (file.type === 'application/pdf') {
            images = await convertPdfToImage(file);
        } else {
            images = [await convertToBase64(file)];
        }

        const allSheets: SheetResult[] = [];

        for (const image of images) {
            const result = await analyzeDrawingAction(image);
            if (result.success && result.sheets) {
                allSheets.push(...result.sheets);
            }
        }

        return allSheets;
    };

    const convertToSheetItems = (results: SheetResult[]): SheetItem[] => {
        // Merge results by SKU
        const skuMap = new Map<string, SheetResult>();

        for (const result of results) {
            const existing = skuMap.get(result.sku);
            if (existing) {
                existing.elements.push(...result.elements);
                existing.totalAreaMm2 += result.totalAreaMm2;
                existing.sheetsNeeded = Math.ceil(existing.totalAreaMm2 / (2800 * 2070));
            } else {
                skuMap.set(result.sku, { ...result });
            }
        }

        // Convert to SheetItems with catalog lookup
        return Array.from(skuMap.values()).map((result, index) => {
            const catalogEntry = findMaterial(result.sku);

            return {
                id: `sheet-${Date.now()}-${index}`,
                sku: result.sku,
                materialName: catalogEntry?.name || '',
                productType: 'plate_18mm' as const,
                sheetsNeeded: result.sheetsNeeded || 1,
                unitPrice: catalogEntry?.prices.plate_18mm ?? null,
                totalAreaMm2: result.totalAreaMm2,
                elements: result.elements,
                error: !catalogEntry && result.sku !== 'NIEZNANY'
                    ? `Nieznany materiał: ${result.sku}`
                    : null,
            };
        });
    };

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        setIsProcessing(true);
        setStatus('processing');
        setErrorMessage(null);
        setTotalFiles(acceptedFiles.length);
        setCurrentFileIndex(0);
        setProcessedFiles(acceptedFiles.map(f => ({ name: f.name, status: 'pending' })));

        const allResults: SheetResult[] = [];

        try {
            for (let i = 0; i < acceptedFiles.length; i++) {
                const file = acceptedFiles[i];
                setCurrentFileIndex(i + 1);
                setProcessedFiles(prev => prev.map((f, idx) =>
                    idx === i ? { ...f, status: 'processing' } : f
                ));

                try {
                    const results = await processFile(file);
                    allResults.push(...results);
                    setProcessedFiles(prev => prev.map((f, idx) =>
                        idx === i ? { ...f, status: 'done' } : f
                    ));
                } catch (error) {
                    setProcessedFiles(prev => prev.map((f, idx) =>
                        idx === i ? { ...f, status: 'error', error: String(error) } : f
                    ));
                }
            }

            if (allResults.length > 0) {
                const newSheets = convertToSheetItems(allResults);
                // Merge with existing sheets
                const existingSkus = new Set(sheets.map(s => s.sku));
                const mergedSheets = [...sheets];

                for (const newSheet of newSheets) {
                    const existingIndex = mergedSheets.findIndex(s => s.sku === newSheet.sku);
                    if (existingIndex >= 0) {
                        // Merge with existing
                        const existing = mergedSheets[existingIndex];
                        mergedSheets[existingIndex] = {
                            ...existing,
                            elements: [...existing.elements, ...newSheet.elements],
                            totalAreaMm2: existing.totalAreaMm2 + newSheet.totalAreaMm2,
                            sheetsNeeded: Math.ceil((existing.totalAreaMm2 + newSheet.totalAreaMm2) / (2800 * 2070)),
                        };
                    } else {
                        mergedSheets.push(newSheet);
                    }
                }

                setSheets(mergedSheets);
                setStatus('done');
            } else {
                setErrorMessage('Nie znaleziono wymiarów na rysunkach');
                setStatus('error');
            }
        } catch (error) {
            setErrorMessage(String(error));
            setStatus('error');
        } finally {
            setIsProcessing(false);
        }
    }, [sheets, setSheets, setStatus, setErrorMessage, findMaterial]);

    const clearProcessedFiles = () => setProcessedFiles([]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg'],
            'application/pdf': ['.pdf'],
        },
        maxFiles: 20,
        disabled: isProcessing,
    });

    return (
        <div>
            <div
                {...getRootProps()}
                className={`
                    relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                    transition-all duration-300 ease-in-out group
                    ${isDragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-muted/50'}
                    ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                <input {...getInputProps()} />

                <div className="flex flex-col items-center gap-4">
                    {isProcessing ? (
                        <>
                            <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Analizowanie {currentFileIndex}/{totalFiles}...</p>
                                <p className="text-xs text-muted-foreground">AI wyodrębnia wymiary i kody materiałów</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="p-3 bg-muted rounded-full group-hover:scale-110 transition-transform">
                                <Upload className="w-6 h-6 text-muted-foreground group-hover:text-foreground" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium">
                                    {isDragActive ? 'Upuść pliki tutaj' : 'Wgraj rysunki techniczne'}
                                </p>
                                <p className="text-xs text-muted-foreground">PDF, PNG, JPG (max 20 plików)</p>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {processedFiles.length > 0 && (
                <div className="mt-4 p-4 bg-card rounded-lg border border-border">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase">Status</h3>
                        {!isProcessing && (
                            <Button variant="ghost" size="sm" onClick={clearProcessedFiles} className="h-6 text-xs">
                                <X className="w-3 h-3 mr-1" /> Wyczyść
                            </Button>
                        )}
                    </div>
                    <ul className="space-y-2 max-h-[150px] overflow-y-auto">
                        {processedFiles.map((file, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm">
                                {file.status === 'pending' && <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/30" />}
                                {file.status === 'processing' && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
                                {file.status === 'done' && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                                {file.status === 'error' && <AlertCircle className="w-3 h-3 text-destructive" />}
                                <span className={file.status === 'error' ? 'text-destructive' : ''}>{file.name}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {errorMessage && (
                <div className="mt-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-destructive">Błąd</p>
                        <p className="text-sm text-destructive/90">{errorMessage}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
