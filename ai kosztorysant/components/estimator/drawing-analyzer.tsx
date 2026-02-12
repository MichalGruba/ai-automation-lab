'use client';

import { useCallback, useState, useRef, MouseEvent, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Upload,
    Loader2,
    Plus,
    Minus,
    X,
    Crosshair,
    Cpu,
    PenTool,
    FileText,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Image as ImageIcon,
    List,
    AlertTriangle,
    Timer,
    Clock,
    Play,
    Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

// Actions & Store
import { analyzeDrawingAction } from '@/app/actions/analyze-drawing';
import { SheetResult } from '@/types/estimate';
import { useEstimateStore } from '@/store/useEstimateStore';

// Helper: Check if SKU is Blum hardware (not sheet material)
function isBlumHardware(sku: string): boolean {
    if (!sku) return false;
    const upper = sku.toUpperCase().trim();
    // Common Blum patterns: 760H5000S (MOVENTO), 560F5000B (TANDEM), T51.7601 (Coupling), ZSF.3502 (Fixing)
    return /^[0-9]{3}[A-Z]/.test(upper) ||   // 760H, 560F, 766H, 770K
        /^[0-9]{3}F/.test(upper) ||       // 560F
        /^T5[0-9]/.test(upper) ||         // T51, T57
        /^Z[SBFM][0-9A-Z]/.test(upper);   // ZSF, ZB7, ZM etc.
}

// Element types for furniture
const ELEMENT_TYPES = [
    'PÓŁKA',
    'SZUFLADA',
    'FRONT',
    'KORPUS',
    'BLENDA',
    'BOK',
    'WIENIEC',
    'PLECY',
    'LISTWA',
    'COKÓŁ',
    'BLAT',
] as const;

type ElementType = typeof ELEMENT_TYPES[number];

interface DetectedElement {
    id: string;
    type: ElementType | string;
    dimensions: string;
    position: { x: number; y: number };
    sku: string;
    source: 'ai' | 'manual';
    fileId: string;
    qty: number;
    box_2d?: number[];
    unitPrice?: number | null;  // Price per unit for hardware
    isHardware?: boolean;       // True for Blum hardware
    materialName?: string;      // Material name from catalog
}

interface UploadedFile {
    id: string;
    name: string;
    imageDataUrl: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    errorMessage?: string;
    description?: string; // User description for this file
}

interface ModalState {
    isOpen: boolean;
    position: { x: number; y: number };
    targetComponentId?: string | null;
}

interface AnalysisMarker {
    id: number;
    x: number; // percentage (center or top-left)
    y: number; // percentage (center or top-left)
    width?: number; // percentage
    height?: number; // percentage
    type?: string; // User selected type (optional)
}

const COMPONENT_TYPES = [
    { label: 'Szafka Dolna', value: 'Szafka Dolna' },
    { label: 'Szafka Górna', value: 'Szafka Górna' },
    { label: 'Słupek', value: 'Słupek' },
    { label: 'Szafka Zlew', value: 'Szafka Zlew' },
    { label: 'Zmywarka', value: 'Zmywarka' },
    { label: 'Szafka Cargo', value: 'Szafka Cargo' },
    { label: 'Szafka Szufladowa', value: 'Szafka Szufladowa' },
    { label: 'Nadstawka', value: 'Nadstawka' },
    { label: 'Cokół', value: 'Cokół' },
    { label: 'Blenda', value: 'Blenda' },
    { label: 'Lodówka', value: 'Lodówka' },
    { label: 'Piekarnik', value: 'Piekarnik' },
    { label: 'Inne', value: 'Inne' }
];

// Helper: Annotate image with visual markers
async function annotateImageWithMarkers(imageDataUrl: string, markers: AnalysisMarker[]): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(imageDataUrl); return; };

            ctx.drawImage(img, 0, 0);

            // Draw markers/regions
            markers.forEach((m, idx) => {
                const x = (m.x / 100) * img.width;
                const y = (m.y / 100) * img.height;
                const index = idx + 1;

                if (m.width && m.height) {
                    // Draw Box
                    const w = (m.width / 100) * img.width;
                    const h = (m.height / 100) * img.height;

                    ctx.shadowColor = "black";
                    ctx.shadowBlur = 5;
                    ctx.lineWidth = 4;
                    ctx.strokeStyle = '#ef4444'; // Red-500
                    ctx.strokeRect(x, y, w, h);

                    // Box Label (Top Left)
                    ctx.fillStyle = '#ef4444';
                    ctx.fillRect(x, y - 30, 40, 30);
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 20px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(index.toString(), x + 20, y - 15);

                    ctx.shadowBlur = 0;
                } else {
                    // Draw Circle (Fallback)
                    const radius = Math.max(20, Math.min(img.width, img.height) * 0.015);
                    ctx.shadowColor = "black";
                    ctx.shadowBlur = 10;
                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, 2 * Math.PI);
                    ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
                    ctx.fill();
                    ctx.lineWidth = radius * 0.15;
                    ctx.strokeStyle = 'white';
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = 'white';
                    ctx.font = `bold ${radius * 1.2}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(index.toString(), x, y);
                }
            });

            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.onerror = () => resolve(imageDataUrl);
        img.src = imageDataUrl;
    });
}

export function DrawingAnalyzer() {
    // Files state
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [activeFileIndex, setActiveFileIndex] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);

    // Markers state
    const [fileMarkers, setFileMarkers] = useState<Record<string, AnalysisMarker[]>>({});

    // Elements state
    const [aiElements, setAiElements] = useState<DetectedElement[]>([]);
    const [manualElements, setManualElements] = useState<DetectedElement[]>([]);

    // Selection mode
    const [selectionMode, setSelectionMode] = useState(false);

    // Timer state
    const [analysisStartTime, setAnalysisStartTime] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    // Modal state
    const [modal, setModal] = useState<ModalState>({ isOpen: false, position: { x: 0, y: 0 }, targetComponentId: null });
    const [newElementType, setNewElementType] = useState<string>('PÓŁKA');
    const [newElementDimensions, setNewElementDimensions] = useState('');

    // Box Selection State
    const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
    const [currentDragRect, setCurrentDragRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

    // Type Selection State
    const [showTypeSelector, setShowTypeSelector] = useState(false);
    const [pendingMarker, setPendingMarker] = useState<{ x: number, y: number, width: number, height: number } | null>(null);

    // Drag Marker State - przesuwanie istniejących markerów
    const [draggingMarkerId, setDraggingMarkerId] = useState<number | null>(null);
    const [dragMarkerOffset, setDragMarkerOffset] = useState<{ x: number, y: number } | null>(null);

    // Project description for AI analysis
    const [projectDescription, setProjectDescription] = useState('');

    // Store Access
    const { sheets, setSheets, findMaterial } = useEstimateStore();

    // Refs
    const imageContainerRef = useRef<HTMLDivElement>(null);

    // Track last known SKU mapping for sync
    const prevSheetsRef = useRef<typeof sheets>([]);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Get active file
    const activeFile = uploadedFiles[activeFileIndex] || null;

    // Filter elements for current file
    const currentFileAiElements = aiElements.filter(el => activeFile && el.fileId === activeFile.id);
    const currentFileManualElements = manualElements.filter(el => activeFile && el.fileId === activeFile.id);

    // Timer effect - updates elapsed time every second during analysis
    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;

        if (isProcessing && analysisStartTime) {
            intervalId = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - analysisStartTime) / 1000));
            }, 1000);
        } else if (!isProcessing) {
            setElapsedTime(0);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isProcessing, analysisStartTime]);

    // Initialize audio context lazily
    const getAudioContext = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return audioContextRef.current;
    };

    // Format elapsed time as mm:ss
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Play notification sound using Web Audio API (success or error)
    const playSound = (isSuccess: boolean) => {
        try {
            const ctx = getAudioContext();

            // Resume context if suspended (browser policy)
            if (ctx.state === 'suspended') {
                ctx.resume().catch(e => console.log('Audio resume failed:', e));
            }

            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            if (isSuccess) {
                // Success: pleasant high tone
                oscillator.frequency.setValueAtTime(800, ctx.currentTime);
                oscillator.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.3);
            } else {
                // Error: low buzz tone
                oscillator.frequency.setValueAtTime(300, ctx.currentTime);
                oscillator.type = 'square';
                gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.4);
            }
        } catch (e) {
            console.log('Audio play failed:', e);
        }
    };
    const allElements = [...aiElements, ...manualElements];

    // Guard ref zapobiegający cyklowi zwrotnemu sheets↔elements
    const isSyncingRef = useRef(false);

    // Sync: When SKU changes in cost estimate (sheets), update elements with same old SKU
    // Dotyczy TYLKO arkuszy AI (ai-sheet-*), NIE ręcznie dodanych (sheet-*)
    useEffect(() => {
        // Nie propaguj zmian jeśli trwa sync elements→sheets
        if (isSyncingRef.current) return;

        const prevSheets = prevSheetsRef.current;

        // For each AI sheet, check if SKU changed
        sheets.forEach(sheet => {
            // Tylko AI sheets
            if (!sheet.id.startsWith('ai-sheet-')) return;

            const prevSheet = prevSheets.find(p => p.id === sheet.id);
            if (prevSheet && prevSheet.sku !== sheet.sku) {
                // SKU changed - update all elements with old SKU to new SKU
                const oldSku = prevSheet.sku;
                const newSku = sheet.sku;

                setAiElements(prev => prev.map(el =>
                    el.sku.toUpperCase() === oldSku.toUpperCase()
                        ? { ...el, sku: newSku }
                        : el
                ));
                setManualElements(prev => prev.map(el =>
                    el.sku.toUpperCase() === oldSku.toUpperCase()
                        ? { ...el, sku: newSku }
                        : el
                ));
            }
        });

        prevSheetsRef.current = sheets;
    }, [sheets]);

    // Sync elements with global store for pricing (Elements -> Sheets)
    // Generuje arkusze AI (ai-sheet-*) i zachowuje ręcznie dodane (sheet-*)
    useEffect(() => {
        // Nie uruchamiaj jeśli brak elementów AI/ręcznych
        if (allElements.length === 0) return;

        // Ustaw guard — zapobiegaj pętli
        isSyncingRef.current = true;

        // Transform DetectedElements back to SheetItems for the store
        const groupedBySku = new Map<string, {
            sku: string,
            elements: any[],
            totalArea: number,
            unitPrice?: number | null,
            isHardware?: boolean,
            materialName?: string
        }>();

        allElements.forEach(el => {
            const sku = el.sku;
            if (!groupedBySku.has(sku)) {
                groupedBySku.set(sku, {
                    sku,
                    elements: [],
                    totalArea: 0,
                    // Take price/hardware info from first element with this SKU
                    unitPrice: el.unitPrice,
                    isHardware: el.isHardware,
                    materialName: el.materialName
                });
            }

            const group = groupedBySku.get(sku)!;

            // Try to parse dimensions "500x400"
            const [w, h] = el.dimensions.toLowerCase().replace('mm', '').split('x').map(d => parseInt(d.trim()) || 0);

            if (w && h) {
                group.elements.push({ width: w, height: h, qty: el.qty });
                group.totalArea += (w * h * el.qty);
            } else if (el.isHardware) {
                // For hardware with no dimensions, still add to elements
                group.elements.push({ width: 0, height: 0, qty: el.qty });
            }
        });

        // AI-generated sheets — PREFIX: 'ai-sheet-'
        const aiSheetItems = Array.from(groupedBySku.values()).map((group, idx) => {
            const catalogEntry = findMaterial(group.sku);
            const isHardware = group.isHardware || isBlumHardware(group.sku);

            // For hardware: use unitPrice from AI, for sheets: use catalog price
            const unitPrice = isHardware
                ? (group.unitPrice ?? null)
                : (catalogEntry?.prices.plate_18mm ?? null);

            const materialName = isHardware
                ? (group.materialName || 'Okucia Blum')
                : (catalogEntry?.name || 'Materiał użytkownika');

            return {
                id: `ai-sheet-${idx}`,
                sku: group.sku,
                materialName: materialName,
                productType: 'plate_18mm' as const,
                // For hardware, sheetsNeeded = total qty (pieces), for sheets = calculated area
                sheetsNeeded: isHardware
                    ? group.elements.reduce((sum, e) => sum + e.qty, 0)
                    : (Math.ceil(group.totalArea / (2800 * 2070)) || 1),
                unitPrice: unitPrice,
                totalAreaMm2: group.totalArea,
                elements: group.elements,
                error: (catalogEntry || isHardware) ? null : (group.sku !== 'NIEZNANY' ? `Nieznany materiał: ${group.sku}` : null),
                isHardware: isHardware  // Add flag for display
            };
        });

        // Zachowaj ręcznie dodane arkusze (ID: 'sheet-*', z data-table)
        const currentSheets = useEstimateStore.getState().sheets;
        const manualSheets = currentSheets.filter(s => !s.id.startsWith('ai-sheet-'));

        // Połącz: AI sheets + ręczne sheets
        setSheets([...aiSheetItems, ...manualSheets]);

        // Zdejmij guard na następnym ticku
        requestAnimationFrame(() => {
            isSyncingRef.current = false;
        });
    }, [aiElements, manualElements, findMaterial, setSheets]);


    // Helpers
    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const convertPdfToImage = async (file: File): Promise<string> => {
        try {
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Cannot create canvas context');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: context, viewport, canvas }).promise;
            return canvas.toDataURL('image/jpeg', 0.9);
        } catch (error) {
            console.error('PDF conversion error:', error);
            throw new Error('Nie udało się przekonwertować PDF');
        }
    };

    // Process file drop - ONLY LOAD, NO AUTO-ANALYSIS
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        // Resume Audio Context on user interaction
        try {
            const ctx = getAudioContext();
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }
        } catch (e) {
            console.log('Audio resume failed:', e);
        }

        for (const file of acceptedFiles) {
            const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            setUploadedFiles(prev => [...prev, {
                id: fileId,
                name: file.name,
                imageDataUrl: '',
                status: 'pending', // Changed to pending - wait for user to add description and trigger analysis
                description: ''
            }]);

            try {
                let imageDataUrl: string;
                if (file.type === 'application/pdf') {
                    imageDataUrl = await convertPdfToImage(file);
                } else {
                    imageDataUrl = await convertToBase64(file);
                }

                // Update file with image, keep status as pending
                setUploadedFiles(prev => prev.map(f =>
                    f.id === fileId ? { ...f, imageDataUrl, status: 'pending' } : f
                ));

                // Set active if it's the first one
                setUploadedFiles(prev => {
                    const idx = prev.findIndex(f => f.id === fileId);
                    if (prev.length === 1 && idx >= 0) setActiveFileIndex(idx);
                    return prev;
                });

            } catch (error) {
                console.error('Error loading file:', error);
                setUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error', errorMessage: 'Błąd ładowania pliku' } : f));
            }
        }
    }, []);

    // START ANALYSIS with description - triggers AI
    const startAnalysis = useCallback(async (fileId: string, description: string) => {
        const file = uploadedFiles.find(f => f.id === fileId);
        if (!file || !file.imageDataUrl) return;

        setIsProcessing(true);
        setAnalysisStartTime(Date.now());
        setElapsedTime(0);

        // Update file status to processing
        setUploadedFiles(prev => prev.map(f =>
            f.id === fileId ? { ...f, status: 'processing', description } : f
        ));

        try {
            // Check for markers
            const markers = fileMarkers[fileId] || [];
            let imagePayload = file.imageDataUrl;
            let finalDescription = description;

            if (markers.length > 0) {
                // Annotate image
                imagePayload = await annotateImageWithMarkers(file.imageDataUrl, markers);

                // Append instruction with EXPLICIT LIST
                const markerListStr = markers.map((_, i) => i + 1).join(', ');
                const markerInstruction = `
\n\n[SYSTEM] TRYB MARKERÓW AKTYWNY
LISTA MARKERÓW DO ZNALEZIENIA: [${markerListStr}]
LICZBA PUNKTÓW: ${markers.length}

TWOIM ZADANIEM JEST ZNALEŹĆ ELEMENT DLA KAŻDEGO NUMERU Z LISTY: ${markerListStr}.
MUSISZ ZWRÓCIĆ DOKŁADNIE ${markers.length} ELEMENTÓW.
JEŚLI NIE WIDZISZ KTÓREGOŚ PUNKTU (np. jest zasłonięty):
- Zwróć element o nazwie "Marker M... - BRAK"
- Ustaw wymiary na 100x100
- NIE POMIJAJ GO! Lista musi być kompletna.
`;
                finalDescription = (description || '') + markerInstruction;
            }

            // Call AI Action with description (and potentially annotated image)
            // Map markers to use 1-based Index IDs for matching
            const markersPayload = markers.map((m, i) => ({ ...m, id: i + 1 }));
            const result = await analyzeDrawingAction(imagePayload, finalDescription, markersPayload);

            if (result.success && result.sheets && result.sheets.length > 0) {
                const newAiElements: DetectedElement[] = [];

                result.sheets.forEach((sheet) => {
                    sheet.elements.forEach((el, idx) => {
                        newAiElements.push({
                            id: `ai-${fileId}-${sheet.sku}-${idx}-${Math.random()}`,
                            type: el.name || 'ELEMENT (AI)',
                            dimensions: `${el.width}x${el.height} mm`,
                            sku: sheet.sku === 'NIEZNANY' ? '' : sheet.sku,
                            source: 'ai',
                            fileId: fileId,
                            position: { x: 50, y: 50 },
                            qty: el.qty || 1,
                            box_2d: el.box_2d,
                            unitPrice: sheet.unitPrice,
                            isHardware: sheet.isHardware,
                            materialName: sheet.materialName
                        });
                    });
                });

                setAiElements(prev => [...prev, ...newAiElements]);
                setUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'done' } : f));
                playSound(true);
            } else {
                // Empty result or error
                const errorMsg = result.error || 'AI nie wykryło elementów (pusty wynik)';
                setUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error', errorMessage: errorMsg } : f));
                playSound(false);
            }

        } catch (error) {
            console.error('Error analyzing file:', error);
            setUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error', errorMessage: 'Błąd analizy AI' } : f));
            playSound(false);
        }

        setIsProcessing(false);
    }, [uploadedFiles, playSound]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.png', '.jpg', '.jpeg'], 'application/pdf': ['.pdf'] },
        maxFiles: 20,
        disabled: isProcessing,
    });

    // File Navigation
    const goToPreviousFile = () => {
        if (activeFileIndex > 0) {
            setActiveFileIndex(activeFileIndex - 1);
            setSelectionMode(false);
        }
    };
    const goToNextFile = () => {
        if (activeFileIndex < uploadedFiles.length - 1) {
            setActiveFileIndex(activeFileIndex + 1);
            setSelectionMode(false);
        }
    };

    // MOUSE HANDLERS FOR BOX DRAWING
    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        if (!activeFile || !selectionMode || !imageContainerRef.current) return;
        if (activeFile.status !== 'pending') return;

        // Jeśli kliknięto na marker, drag obsługiwany jest przez onMouseDown na markerze
        // Tutaj startujemy rysowanie nowego boxa
        if (draggingMarkerId !== null) return;

        e.preventDefault();
        const rect = imageContainerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setDragStart({ x, y });
        setCurrentDragRect({ x, y, w: 0, h: 0 });
    };

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!imageContainerRef.current) return;

        const rect = imageContainerRef.current.getBoundingClientRect();
        const rawX = ((e.clientX - rect.left) / rect.width) * 100;
        const rawY = ((e.clientY - rect.top) / rect.height) * 100;
        const currentX = Math.max(0, Math.min(100, rawX));
        const currentY = Math.max(0, Math.min(100, rawY));

        // Przesuwanie istniejącego markera
        if (draggingMarkerId !== null && dragMarkerOffset && activeFile) {
            e.preventDefault();
            setFileMarkers(prev => {
                const markers = prev[activeFile.id] || [];
                return {
                    ...prev,
                    [activeFile.id]: markers.map(m => {
                        if (m.id !== draggingMarkerId) return m;
                        const mw = m.width || 0;
                        const mh = m.height || 0;
                        // Nowa pozycja = kursor - offset, ograniczona do granic obrazu
                        const newX = Math.max(0, Math.min(100 - mw, currentX - dragMarkerOffset.x));
                        const newY = Math.max(0, Math.min(100 - mh, currentY - dragMarkerOffset.y));
                        return { ...m, x: newX, y: newY };
                    })
                };
            });
            return;
        }

        // Rysowanie nowego boxa
        if (!dragStart) return;

        const x = Math.min(dragStart.x, currentX);
        const y = Math.min(dragStart.y, currentY);
        const w = Math.abs(currentX - dragStart.x);
        const h = Math.abs(currentY - dragStart.y);

        setCurrentDragRect({ x, y, w, h });
    };

    const handleMouseUp = (e: MouseEvent<HTMLDivElement>) => {
        // Koniec przesuwania markera
        if (draggingMarkerId !== null) {
            setDraggingMarkerId(null);
            setDragMarkerOffset(null);
            return;
        }

        if (!dragStart || !activeFile) {
            setDragStart(null);
            setCurrentDragRect(null);
            return;
        }

        if (currentDragRect && (currentDragRect.w > 1 || currentDragRect.h > 1)) {
            // Valid Box Drawn (>1% size)
            // SHOW TYPE SELECTOR instead of creating immediately
            setPendingMarker({
                x: currentDragRect.x,
                y: currentDragRect.y,
                width: currentDragRect.w,
                height: currentDragRect.h
            });
            setShowTypeSelector(true);
        }

        // Reset Drag
        setDragStart(null);
        setCurrentDragRect(null);
    };

    const handleConfirmMarker = (type: string) => {
        if (!activeFile || !pendingMarker) return;

        // POST-ANALYSIS: Create Manual Component Group
        if (activeFile.status === 'done' || activeFile.status === 'error') {
            const manualId = `m-${Date.now()}`;
            const compId = `M${Date.now().toString().slice(-4)}`; // Short ID
            const fullType = `${type} - ${type} ${compId}`; // E.g. "Szafka Dolna - Szafka Dolna M1234"

            // Calculate box_2d for the manual element so it renders a blue square
            // pendingMarker is % (0-100), box_2d is 0-1000
            const box_2d = [
                pendingMarker.y * 10,
                pendingMarker.x * 10,
                (pendingMarker.y + pendingMarker.height) * 10,
                (pendingMarker.x + pendingMarker.width) * 10
            ];

            setManualElements(prev => [...prev, {
                id: manualId,
                type: fullType,
                dimensions: '',
                sku: 'MANUAL',
                position: { x: pendingMarker.x, y: pendingMarker.y },
                qty: 1,
                source: 'manual',
                fileId: activeFile.id,
                box_2d: box_2d
            }]);
        } else {
            // PRE-ANALYSIS: Add Marker for AI
            setFileMarkers(prev => {
                const current = prev[activeFile.id] || [];
                return {
                    ...prev,
                    [activeFile.id]: [...current, {
                        id: Date.now(),
                        x: pendingMarker.x,
                        y: pendingMarker.y,
                        width: pendingMarker.width,
                        height: pendingMarker.height,
                        type: type // Store selected type
                    }]
                };
            });
        }

        // Reset
        setPendingMarker(null);
        setShowTypeSelector(false);
    };

    const handleCancelMarker = () => {
        setPendingMarker(null);
        setShowTypeSelector(false);
    };

    // MANUAL CLICK (Legacy / Manual Add)
    const handleImageClick = (e: MouseEvent<HTMLDivElement>) => {
        if (!activeFile || !imageContainerRef.current) return;
        if (activeFile.status === 'pending') return; // Pending handled by drag now

        // POST-ANALYSIS MANUAL ADD
        if (!selectionMode) return;

        const rect = imageContainerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        // Show Type Selector to create a new Component Group
        setPendingMarker({
            x: x,
            y: y,
            width: 5, // Default small box
            height: 5
        });
        setShowTypeSelector(true);
    };

    const handleAddElement = () => {
        if (!newElementDimensions.trim() || !activeFile) return;

        // If strict Adding to Component, use Type defined relative to it
        // Otherwise just generic type
        let finalType = newElementType;
        if (modal.targetComponentId) {
            finalType = `${newElementType} - ${modal.targetComponentId}`;
        }

        setManualElements(prev => [...prev, {
            id: `manual-${Date.now()}`,
            type: finalType,
            dimensions: newElementDimensions,
            position: modal.position,
            sku: '',
            source: 'manual',
            fileId: activeFile.id,
            qty: 1
        }]);
        setModal({ isOpen: false, position: { x: 0, y: 0 }, targetComponentId: null });
        setNewElementDimensions('');
    };

    const handleRemoveElement = (id: string) => {
        setManualElements(prev => prev.filter(el => el.id !== id));
    };

    // Remove element(s) by IDs (works for both AI and manual)
    const handleRemoveElements = (ids: string[], source: 'ai' | 'manual') => {
        if (source === 'ai') {
            setAiElements(prev => prev.filter(el => !ids.includes(el.id)));
        } else {
            setManualElements(prev => prev.filter(el => !ids.includes(el.id)));
        }
    };

    // Remove entire component (all elements with matching componentId)
    const handleRemoveComponent = (componentId: string) => {
        // Extract component ID pattern to match elements
        // Elements have type like "Bok - D60_Zlew" so we filter by suffix
        setAiElements(prev => prev.filter(el => {
            const match = el.type.match(/ - (.+)$/);
            const elComponentId = match ? match[1] : 'Inne';
            return elComponentId !== componentId;
        }));
        setManualElements(prev => prev.filter(el => {
            const match = el.type.match(/ - (.+)$/);
            const elComponentId = match ? match[1] : 'Inne';
            return elComponentId !== componentId;
        }));
    };

    const handleRemoveFile = (fileId: string) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
        setAiElements(prev => prev.filter(el => el.fileId !== fileId));
        setManualElements(prev => prev.filter(el => el.fileId !== fileId));
        if (activeFileIndex >= uploadedFiles.length - 1 && activeFileIndex > 0) setActiveFileIndex(activeFileIndex - 1);
    };

    const handleSkuChange = (id: string, sku: string, source: 'ai' | 'manual') => {
        if (source === 'ai') {
            setAiElements(prev => prev.map(el => el.id === id ? { ...el, sku } : el));
        } else {
            setManualElements(prev => prev.map(el => el.id === id ? { ...el, sku } : el));
        }
    };

    const handleQtyChange = (ids: string[], delta: number, source: 'ai' | 'manual') => {
        if (source === 'ai') {
            setAiElements(prev => prev.map(el =>
                ids.includes(el.id) ? { ...el, qty: Math.max(1, el.qty + delta) } : el
            ));
        } else {
            setManualElements(prev => prev.map(el =>
                ids.includes(el.id) ? { ...el, qty: Math.max(1, el.qty + delta) } : el
            ));
        }
    };

    const handleDimensionsChange = (ids: string[], newDimensions: string, source: 'ai' | 'manual') => {
        if (source === 'ai') {
            setAiElements(prev => prev.map(el =>
                ids.includes(el.id) ? { ...el, dimensions: newDimensions } : el
            ));
        } else {
            setManualElements(prev => prev.map(el =>
                ids.includes(el.id) ? { ...el, dimensions: newDimensions } : el
            ));
        }
    };

    const handleClearAll = () => {
        setUploadedFiles([]);
        setAiElements([]);
        setManualElements([]);
        setActiveFileIndex(0);
        // Also clear store - wait, useEffect handles setSheets, so clearing elements here clears store automatically
    };

    // Helper: Extract component ID from element name (e.g., "Bok - D60_Zlew" -> "D60_Zlew")
    const extractComponentId = (name: string): string => {
        const match = name.match(/ - (.+)$/);
        return match ? match[1] : 'Inne';
    };

    // State for collapsed components
    const [collapsedComponents, setCollapsedComponents] = useState<Set<string>>(new Set());

    const toggleComponent = (componentId: string) => {
        setCollapsedComponents(prev => {
            const next = new Set(prev);
            if (next.has(componentId)) {
                next.delete(componentId);
            } else {
                next.add(componentId);
            }
            return next;
        });
    };

    // UI: Collapse/Expand All
    const toggleCollapseAll = (shouldCollapse: boolean) => {
        if (shouldCollapse) {
            const allIds = componentGroups.map(c => c.componentId);
            setCollapsedComponents(new Set(allIds));
        } else {
            setCollapsedComponents(new Set());
        }
    };

    // UI: Filter Tabs State
    const [activeCategory, setActiveCategory] = useState<string>('WSZYSTKIE');

    // Helper: Categorize Components
    const getComponentCategory = (type: string): string => {
        const lower = type.toLowerCase();
        if (lower.includes('dolna') || lower.includes('zlew') || lower.includes('zmywarka') || lower.includes('piekarnik') || lower.includes('zlewozmywak')) return 'SZAFKI DOLNE';
        if (lower.includes('górna') || lower.includes('okap') || lower.includes('gorna')) return 'SZAFKI GÓRNE';
        if (lower.includes('słupek') || lower.includes('slupek') || lower.includes('lodówka') || lower.includes('lodowka') || lower.includes('cargo') || lower.includes('wysuw')) return 'SŁUPKI I CARGO';
        if (lower.includes('szuflad')) return 'SZUFLADY';
        // Fallback: "Szafka" alone without specific qualifier → SZAFKI DOLNE (default for unspecified cabinets)
        if (lower.includes('szafka') && !lower.includes('górna') && !lower.includes('gorna')) return 'SZAFKI DOLNE';
        return 'INNE';
    };

    // Memoized grouping BY COMPONENT (not by element type)
    const { componentGroups, elementGroupMap, adjustedPositions } = useMemo(() => {
        // Group elements by component ID
        const components = new Map<string, {
            componentId: string,
            elements: Array<{
                type: string,
                dimensions: string,
                sku: string,
                count: number,
                source: 'ai' | 'manual',
                ids: string[],
                isHardware: boolean,
                materialName?: string,
                box_2d?: number[]
            }>,
            box_2d?: number[],
            fileId: string
        }>();

        // First pass: group all elements by component
        allElements.forEach(el => {
            const componentId = extractComponentId(el.type);
            const elementType = el.type.replace(/ - (.+)$/, '').trim(); // "Bok - D60" -> "Bok"

            // Key must verify FileID to prevent merging "Inne" across files
            const mapKey = `${el.fileId}::${componentId}`;

            if (!components.has(mapKey)) {
                components.set(mapKey, {
                    componentId,
                    elements: [],
                    fileId: el.fileId,
                    box_2d: el.box_2d
                });
            }

            const comp = components.get(mapKey)!;

            // Find or create element group within component
            const existingEl = comp.elements.find(e =>
                e.type === elementType && e.dimensions === el.dimensions && e.sku === el.sku
            );

            if (existingEl) {
                existingEl.count += el.qty;
                existingEl.ids.push(el.id);
            } else {
                comp.elements.push({
                    type: elementType,
                    dimensions: el.dimensions,
                    sku: el.sku,
                    count: el.qty,
                    source: el.source,
                    ids: [el.id],
                    isHardware: el.isHardware || false,
                    materialName: el.materialName,
                    box_2d: el.box_2d
                });
            }

            // Update component box_2d to encompass all elements
            if (el.box_2d && !el.isHardware) {
                if (!comp.box_2d) {
                    comp.box_2d = [...el.box_2d];
                } else {
                    // Expand bounding box
                    comp.box_2d[0] = Math.min(comp.box_2d[0], el.box_2d[0]); // ymin
                    comp.box_2d[1] = Math.min(comp.box_2d[1], el.box_2d[1]); // xmin
                    comp.box_2d[2] = Math.max(comp.box_2d[2], el.box_2d[2]); // ymax
                    comp.box_2d[3] = Math.max(comp.box_2d[3], el.box_2d[3]); // xmax
                }
            }
        });

        const grouped = Array.from(components.values()).map((c, i) => {
            // Wyciągnij numer markera z componentId (np. "M1" -> 1, "Szafka M1" -> 1)
            const markerMatch = c.componentId.match(/M(\d+)$/);
            const markerIndex = markerMatch ? parseInt(markerMatch[1]) : null;
            return { ...c, index: markerIndex ?? (i + 1) };
        });

        // Build element -> component index map
        const map = new Map<string, number>();
        grouped.forEach(comp => {
            comp.elements.forEach(el => {
                el.ids.forEach(id => map.set(id, comp.index));
            });
        });

        // Collision Detection for Component Markers
        const positions = new Map<string, { top: number, left: number }>();

        if (activeFile) {
            const activeComponents = grouped.filter(c => c.fileId === activeFile.id && c.box_2d);
            activeComponents.sort((a, b) => (a.box_2d![0]) - (b.box_2d![0]));

            const placed: { x: number, y: number }[] = [];
            const RADIUS = 40;

            activeComponents.forEach(comp => {
                const [ymin, xmin, ymax, xmax] = comp.box_2d!;
                let cy = (ymin + ymax) / 2;
                let cx = (xmin + xmax) / 2;

                let attempts = 0;
                while (attempts < 50) {
                    let collision = false;
                    for (const p of placed) {
                        const dist = Math.sqrt(Math.pow(p.x - cx, 2) + Math.pow(p.y - cy, 2));
                        if (dist < RADIUS) {
                            collision = true;
                            break;
                        }
                    }
                    if (!collision) break;
                    cx += RADIUS * 0.6;
                    if (attempts % 2 === 0) cy += RADIUS * 0.4;
                    attempts++;
                }
                placed.push({ x: cx, y: cy });
                positions.set(comp.componentId, { top: cy, left: cx });
            });
        }

        return { componentGroups: grouped, elementGroupMap: map, adjustedPositions: positions };
    }, [allElements, activeFile]);


    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* LEFT COLUMN: Drawing Viewer (8 cols -> 12 cols if selectionMode) */}
                <div className={`${selectionMode ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-4 transition-all duration-300 ease-in-out`}>
                    {/* Upload Area - Premium Blueprint Style */}
                    <div
                        {...getRootProps()}
                        className={`
                            relative group cursor-pointer overflow-hidden
                            rounded-2xl border-2 border-dashed transition-all duration-300 ease-out
                            flex flex-col items-center justify-center text-center
                            min-h-[240px] p-8 gap-6
                            ${isDragActive
                                ? 'border-primary bg-primary/5 ring-4 ring-primary/10 scale-[1.01]'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:border-primary/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }
                            ${isProcessing ? 'opacity-60 pointer-events-none' : ''}
                        `}
                    >
                        <input {...getInputProps()} />

                        {/* Background Grid Pattern (Subtle) */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                            style={{
                                backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
                                backgroundSize: '20px 20px',
                                backgroundPosition: 'center center'
                            }}
                        />

                        {isProcessing ? (
                            <div className="flex flex-col items-center gap-4 z-10">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                                    <Loader2 className="w-10 h-10 text-primary animate-spin relative z-10" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-semibold text-foreground">Analiza w toku...</h3>
                                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                        <Timer className="w-4 h-4" />
                                        <span className="font-mono tabular-nums">{formatTime(elapsedTime)}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="z-10 bg-white dark:bg-slate-950 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                                    <div className="bg-primary/10 p-3 rounded-xl">
                                        <Upload className="w-8 h-8 text-primary" />
                                    </div>
                                </div>
                                <div className="z-10 space-y-2 max-w-sm">
                                    <h3 className="text-xl font-bold text-foreground tracking-tight">
                                        Przeciągnij rysunek lub kliknij, aby wgrać
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Obsługiwane formaty: <span className="font-medium text-foreground">PDF, JPG, PNG</span>
                                    </p>
                                </div>
                                <div className="z-10 mt-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 text-xs font-medium text-primary border border-primary/10">
                                        <Sparkles className="w-3 h-3" />
                                        Automatyczne rozpoznawanie mebli
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Files Tabs */}
                    {uploadedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {uploadedFiles.map((file, index) => (
                                <div key={file.id} onClick={() => setActiveFileIndex(index)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-all ${index === activeFileIndex ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'} ${file.status === 'error' ? 'bg-destructive/10 border-destructive/50 border' : ''} ${file.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30' : ''}`}>
                                    {file.status === 'processing' ? <Loader2 className="w-3 h-3 animate-spin" /> : file.status === 'error' ? <AlertTriangle className="w-3 h-3 text-destructive" /> : file.status === 'pending' ? <Clock className="w-3 h-3 text-amber-600" /> : <CheckCircle2 className="w-3 h-3 text-green-600" />}
                                    <span className="truncate max-w-[120px]">{file.name}</span>
                                    <X className="w-3 h-3 hover:text-red-300" onClick={(e) => { e.stopPropagation(); handleRemoveFile(file.id); }} />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Error Message for Active File */}
                    {activeFile?.status === 'error' && activeFile.errorMessage && (
                        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            {activeFile.errorMessage}
                        </div>
                    )}

                    {/* Active Image */}
                    {activeFile && activeFile.imageDataUrl && (
                        <div className="relative rounded-xl overflow-hidden border border-border bg-muted/30 min-h-[500px] flex items-center justify-center">
                            {/* PENDING OVERLAY - Show description input before analysis */}
                            {activeFile.status === 'pending' && !selectionMode && (
                                <div className="absolute inset-0 z-40 bg-gradient-to-t from-background via-background/95 to-background/80 flex flex-col items-center justify-center p-8">
                                    <div className="max-w-lg w-full space-y-6">
                                        <div className="text-center space-y-2">
                                            <div className="inline-flex items-center justify-center p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                                                <Sparkles className="w-8 h-8 text-amber-600" />
                                            </div>
                                            <h3 className="text-xl font-bold">Opisz projekt</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Wskaż elementy na rysunku (opcjonalnie) lub dodaj opis.
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <Label htmlFor="project-description" className="text-sm font-medium">
                                                Opis projektu
                                            </Label>
                                            <textarea
                                                id="project-description"
                                                value={projectDescription}
                                                onChange={(e) => setProjectDescription(e.target.value)}
                                                placeholder="Np: Kuchnia L-kształt..."
                                                className="w-full h-24 px-4 py-3 rounded-lg border border-border bg-background text-sm resize-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                            />
                                        </div>

                                        <div className="flex gap-3">
                                            <Button
                                                variant="outline"
                                                onClick={() => setSelectionMode(true)}
                                                className="flex-1 h-12"
                                            >
                                                <Crosshair className="w-4 h-4 mr-2" />
                                                Dodaj Markery
                                            </Button>

                                            <Button
                                                onClick={() => startAnalysis(activeFile.id, projectDescription)}
                                                disabled={isProcessing}
                                                className="flex-[2] h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                                            >
                                                {isProcessing ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                        Analizuję...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play className="w-5 h-5 mr-2" />
                                                        Analizuj {((fileMarkers[activeFile.id]?.length || 0) > 0) ? `(${fileMarkers[activeFile.id].length} pkt)` : ''}
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Marker Mode Overlay */}
                            {activeFile.status === 'pending' && selectionMode && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                                    <div className="bg-background/90 backdrop-blur px-4 py-2 rounded-full border border-border shadow-lg flex items-center gap-3">
                                        <span className="text-sm font-medium flex items-center gap-2">
                                            <Crosshair className="w-4 h-4 text-primary" />
                                            Tryb Markerów: {fileMarkers[activeFile.id]?.length || 0}
                                        </span>
                                        <div className="h-4 w-px bg-border" />
                                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                                            setFileMarkers(prev => ({ ...prev, [activeFile.id]: [] }));
                                        }}>
                                            Wyczyść
                                        </Button>
                                        <Button size="sm" onClick={() => setSelectionMode(false)} className="h-7 text-xs">
                                            Gotowe
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Controls Overlay - only show when not pending */}
                            {activeFile.status !== 'pending' && (
                                <div className="absolute top-4 right-4 z-10 flex gap-2">
                                    <Button size="sm" variant={selectionMode ? "default" : "secondary"} onClick={() => setSelectionMode(!selectionMode)}>
                                        <Crosshair className="w-4 h-4 mr-2" />
                                        {selectionMode ? 'Anuluj zaznaczanie' : 'Zaznacz element'}
                                    </Button>
                                </div>
                            )}

                            {/* Nav Overlay */}
                            {uploadedFiles.length > 1 && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 bg-background/80 backdrop-blur p-1 rounded-full border border-border shadow-sm">
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={goToPreviousFile} disabled={activeFileIndex === 0}><ChevronLeft className="w-4 h-4" /></Button>
                                    <span className="text-xs flex items-center px-2 font-mono">{activeFileIndex + 1}/{uploadedFiles.length}</span>
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={goToNextFile} disabled={activeFileIndex === uploadedFiles.length - 1}><ChevronRight className="w-4 h-4" /></Button>
                                </div>
                            )}

                            <div className="w-full h-full flex items-center justify-center bg-muted/10 overflow-hidden p-1">
                                <div
                                    ref={imageContainerRef}
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={() => { setDragStart(null); setCurrentDragRect(null); if (draggingMarkerId !== null) { setDraggingMarkerId(null); setDragMarkerOffset(null); } }}
                                    onClick={handleImageClick}
                                    className={`relative inline-block shadow-lg ${selectionMode ? 'cursor-crosshair' : ''}`}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={activeFile.imageDataUrl} alt="Drawing" className="max-w-full max-h-[92vh] block shadow-md rounded-lg" />

                                    {/* Render Component Markers - One per furniture component */}
                                    {componentGroups.filter(comp => comp.fileId === activeFile.id && comp.box_2d).map((comp) => {
                                        const adj = adjustedPositions?.get(comp.componentId);
                                        const [ymin, xmin, ymax, xmax] = comp.box_2d!;
                                        // Calculate center and clamp to valid range (5-95% to keep markers inside)
                                        const rawCenterY = adj ? adj.top : (ymin + ymax) / 2;
                                        const rawCenterX = adj ? adj.left : (xmin + xmax) / 2;
                                        const centerY = Math.max(50, Math.min(950, rawCenterY)); // Clamp 5-95%
                                        const centerX = Math.max(50, Math.min(950, rawCenterX)); // Clamp 5-95%

                                        // Check if this component is manual
                                        // A component is manual if its first element has source 'manual'
                                        const isManual = comp.elements.length > 0 && comp.elements[0].source === 'manual';

                                        return (
                                            <div
                                                key={comp.componentId}
                                                className="absolute z-20 pointer-events-none"
                                                style={{
                                                    top: `${centerY / 10}%`,
                                                    left: `${centerX / 10}%`,
                                                    transform: 'translate(-50%, -50%)'
                                                }}
                                            >
                                                {/* Outer glow */}
                                                <div className={`absolute inset-0 w-6 h-6 rounded-lg -m-1 blur-sm ${isManual ? 'bg-red-500/20' : 'bg-blue-500/20'}`} />

                                                {/* Main marker - square to look different */}
                                                <div className={`relative w-5 h-5 rounded-lg flex items-center justify-center shadow-lg ring-2 ring-white/80 ${isManual
                                                    ? 'bg-gradient-to-br from-red-500 to-red-600'
                                                    : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                                    }`}>
                                                    <span className="text-white text-[9px] font-bold drop-shadow-sm">
                                                        {comp.index}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* USER DRAWN BOXES */}
                                    {(fileMarkers[activeFile.id] || []).map((m, i) => (
                                        <div
                                            key={m.id}
                                            className={`absolute border-2 border-red-500 bg-red-500/10 z-30 group transition-colors ${draggingMarkerId === m.id
                                                ? 'cursor-grabbing border-red-400 bg-red-500/25 ring-2 ring-red-400/50'
                                                : 'cursor-grab hover:bg-red-500/20 hover:border-red-400'
                                                }`}
                                            style={{
                                                left: `${m.x}%`,
                                                top: `${m.y}%`,
                                                width: `${m.width}%`,
                                                height: `${m.height}%`
                                            }}
                                            onMouseDown={(e) => {
                                                // Rozpoczęcie przesuwania markera
                                                if (!activeFile || activeFile.status !== 'pending' || !selectionMode) return;
                                                if (!imageContainerRef.current) return;
                                                e.stopPropagation();
                                                e.preventDefault();

                                                const rect = imageContainerRef.current.getBoundingClientRect();
                                                const clickX = ((e.clientX - rect.left) / rect.width) * 100;
                                                const clickY = ((e.clientY - rect.top) / rect.height) * 100;

                                                // Offset = pozycja kliknięcia względem lewego-górnego rogu markera
                                                setDragMarkerOffset({ x: clickX - m.x, y: clickY - m.y });
                                                setDraggingMarkerId(m.id);
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Nie usuwaj przy kliknięciu jeśli właśnie kończyliśmy drag
                                            }}
                                        >
                                            {/* ID Badge */}
                                            <div className="absolute top-0 left-0 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-br">
                                                {i + 1}
                                            </div>
                                            {/* X button on hover - usuwanie markera */}
                                            <div
                                                className="absolute top-0 right-0 p-0.5 bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (activeFile.status === 'pending' && selectionMode) {
                                                        setFileMarkers(prev => ({
                                                            ...prev,
                                                            [activeFile.id]: prev[activeFile.id].filter(mk => mk.id !== m.id)
                                                        }));
                                                    }
                                                }}
                                            >
                                                <X className="w-3 h-3" />
                                            </div>
                                            {/* Move icon - widoczny przy hover */}
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-60 transition-opacity pointer-events-none">
                                                <svg className="w-5 h-5 text-red-700 drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4M16 7h12M4 7H0" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5v14M8 8l-3-3m0 0L2 8m3-3v3M16 8l3-3m0 0l3 3m-3-3v3M8 16l-3 3m0 0l-3-3m3 3v-3M16 16l3 3m0 0l3-3m-3 3v-3" />
                                                </svg>
                                            </div>
                                            {/* Type label if exists */}
                                            {m.type && (
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] px-1 truncate text-center">
                                                    {m.type}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Type Selection Overlay */}
                                    {showTypeSelector && pendingMarker && (
                                        <div
                                            className="absolute z-50 bg-card border border-border rounded-lg shadow-xl p-3 w-64 animate-in fade-in zoom-in-95 duration-100"
                                            style={{
                                                left: `${Math.min(90, pendingMarker.x + pendingMarker.width)}%`,
                                                // If marker is in bottom half (>50%), show popup ABOVE it, otherwise BELOW
                                                top: pendingMarker.y > 50 ? 'auto' : `${pendingMarker.y}%`,
                                                bottom: pendingMarker.y > 50 ? `${100 - pendingMarker.y}%` : 'auto'
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="flex justify-between items-center mb-2 pb-2 border-b">
                                                <span className="text-xs font-semibold">Wybierz typ mebla</span>
                                                <button onClick={handleCancelMarker} className="text-muted-foreground hover:text-foreground">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-1 max-h-60 overflow-y-auto">
                                                {COMPONENT_TYPES.map((type) => (
                                                    <button
                                                        key={type.value}
                                                        onClick={() => handleConfirmMarker(type.value)}
                                                        className="text-left text-xs px-2 py-1.5 rounded hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2"
                                                    >
                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                        {type.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {currentDragRect && (
                                        <div
                                            className="absolute border-2 border-primary bg-primary/20 z-50 pointer-events-none"
                                            style={{
                                                left: `${currentDragRect.x}%`,
                                                top: `${currentDragRect.y}%`,
                                                width: `${currentDragRect.w}%`,
                                                height: `${currentDragRect.h}%`
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Just Elements List (4 cols -> hidden if selectionMode) */}
                <div className={`${selectionMode ? 'hidden' : 'lg:col-span-4'} space-y-6 h-full flex flex-col transition-all duration-300 ease-in-out`}>

                    {/* ELEMENTS LIST - Only this remains here */}
                    <div className="rounded-xl border border-border bg-card shadow-sm flex-1 flex flex-col min-h-[400px]">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                            <div className="flex items-center gap-2">
                                <List className="w-4 h-4" />
                                <h3 className="font-bold text-sm uppercase">Elementy ({allElements.reduce((acc, el) => acc + el.qty, 0)})</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => toggleCollapseAll(true)} className="h-6 text-xs text-muted-foreground" title="Zwiń wszystkie">
                                    <Minus className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => toggleCollapseAll(false)} className="h-6 text-xs text-muted-foreground" title="Rozwiń wszystkie">
                                    <Plus className="w-3 h-3" />
                                </Button>
                                <div className="h-4 w-px bg-border mx-1"></div>
                                <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-6 text-xs text-muted-foreground">Wyczyść</Button>
                            </div>
                        </div>

                        {/* Filter Tabs */}
                        <div className="px-2 py-2 border-b border-border flex gap-1 overflow-x-auto no-scrollbar mask-gradient-right">
                            {['WSZYSTKIE', 'SZAFKI DOLNE', 'SZAFKI GÓRNE', 'SŁUPKI I CARGO', 'SZUFLADY', 'INNE'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`
                                        px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors
                                        ${activeCategory === cat
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                        }
                                    `}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-4">
                            {allElements.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground text-sm">
                                    Brak elementów. <br /> Wgraj rysunek, a AI je wykryje.
                                </div>
                            ) :                                // Group components by category
                                ['SZAFKI DOLNE', 'SZAFKI GÓRNE', 'SŁUPKI I CARGO', 'SZUFLADY', 'INNE'].map(category => {
                                    // Filter components for this category
                                    const categoryComponents = componentGroups.filter(comp => {
                                        // Filter by ACTIVE FILE
                                        if (activeFile && comp.fileId !== activeFile.id) return false;

                                        // Determine category from Component ID name (e.g., "Szafka Dolna M1")
                                        // componentId carries the full component name from AI analysis
                                        const typeName = comp.componentId;
                                        return getComponentCategory(typeName) === category;
                                    });

                                    // If active filter is NOT 'ALL' and NOT this category, skip
                                    if (activeCategory !== 'WSZYSTKIE' && activeCategory !== category) return null;

                                    if (categoryComponents.length === 0) return null;

                                    return (
                                        <div key={category} className="space-y-2">
                                            {/* Category Header */}
                                            {activeCategory === 'WSZYSTKIE' && (
                                                <div className="flex items-center gap-2 px-1 pt-2 pb-1">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                        {category} ({categoryComponents.length})
                                                    </span>
                                                    <div className="h-px bg-border flex-1"></div>
                                                </div>
                                            )}

                                            {/* Render Components in this Category */}
                                            {categoryComponents.map((comp) => {
                                                const isCollapsed = collapsedComponents.has(comp.componentId);
                                                const totalParts = comp.elements.reduce((sum, el) => sum + el.count, 0);
                                                const hardwareCount = comp.elements.filter(el => el.isHardware).length;
                                                const materialCount = comp.elements.filter(el => !el.isHardware).length;

                                                return (
                                                    <div
                                                        key={`${comp.fileId}-${comp.componentId}`}
                                                        className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
                                                    >
                                                        {/* Component Header - Clickable */}
                                                        <div
                                                            className="flex items-center justify-between p-2 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 cursor-pointer hover:from-blue-500/20 hover:to-indigo-500/20 transition-colors"
                                                            onClick={() => toggleComponent(comp.componentId)}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {/* Index badge */}
                                                                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                                                                    {comp.index}
                                                                </div>
                                                                {/* Component name */}
                                                                <div>
                                                                    <span className="font-semibold text-sm">{comp.componentId}</span>
                                                                    <div className="text-[10px] text-muted-foreground">
                                                                        {totalParts} elem. • {materialCount} mat. • {hardwareCount} okuc.
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {/* Expand/Collapse + Delete */}
                                                            <div className="flex items-center gap-1">
                                                                {/* Delete component button */}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRemoveComponent(comp.componentId);
                                                                    }}
                                                                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-500 transition-colors"
                                                                    title="Usuń komponent"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                                <div className={`transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>
                                                                    <ChevronRight className="w-4 h-4 rotate-90" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Add Element Button (New Feature) */}
                                                        <div className={`px-2 pt-1 pb-2 flex justify-end ${isCollapsed ? 'hidden' : ''}`}>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-6 text-[10px] gap-1 px-2 border-dashed"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setModal({
                                                                        isOpen: true,
                                                                        position: { x: 50, y: 50 }, // center fallback
                                                                        targetComponentId: comp.componentId
                                                                    });
                                                                }}
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                                Dodaj element
                                                            </Button>
                                                        </div>

                                                        {/* Elements list - Collapsible */}
                                                        {
                                                            !isCollapsed && (
                                                                <div className="border-t border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                                                                    {comp.elements.map((el, elIdx) => {
                                                                        const material = findMaterial(el.sku);
                                                                        const isHardware = el.isHardware || isBlumHardware(el.sku);

                                                                        return (
                                                                            <div
                                                                                key={`${comp.componentId}-${elIdx}`}
                                                                                className={`flex items-center gap-2 px-3 py-1.5 text-xs ${isHardware ? 'bg-amber-50/50 dark:bg-amber-900/10' : 'bg-white dark:bg-slate-900/50'
                                                                                    }`}
                                                                            >
                                                                                {/* Tree connector */}
                                                                                <span className="text-slate-300 dark:text-slate-600">
                                                                                    {elIdx === comp.elements.length - 1 ? '└' : '├'}
                                                                                </span>

                                                                                {/* Element type */}
                                                                                <span className={`font-medium min-w-[60px] ${isHardware ? 'text-amber-700 dark:text-amber-400' : ''}`}>
                                                                                    {el.type}
                                                                                </span>

                                                                                {/* Qty */}
                                                                                <div className="flex items-center gap-0.5">
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); handleQtyChange(el.ids, -1, el.source); }}
                                                                                        className="w-4 h-4 rounded hover:bg-slate-200 flex items-center justify-center"
                                                                                    >
                                                                                        <Minus className="w-2.5 h-2.5" />
                                                                                    </button>
                                                                                    <span className="w-4 text-center font-bold text-primary">
                                                                                        {el.count}
                                                                                    </span>
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); handleQtyChange(el.ids, 1, el.source); }}
                                                                                        className="w-4 h-4 rounded hover:bg-slate-200 flex items-center justify-center"
                                                                                    >
                                                                                        <Plus className="w-2.5 h-2.5" />
                                                                                    </button>
                                                                                </div>

                                                                                <div className="flex-1 min-w-[80px] max-w-[120px]">
                                                                                    <Input
                                                                                        value={el.dimensions}
                                                                                        onChange={(e) => {
                                                                                            handleDimensionsChange(el.ids, e.target.value, el.source);
                                                                                        }}
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        className="h-4 text-[8px] px-1 font-mono text-muted-foreground bg-transparent border-transparent hover:border-border focus:border-primary transition-colors text-right"
                                                                                    />
                                                                                </div>

                                                                                {/* SKU input */}
                                                                                <div className="relative w-20">
                                                                                    <Input
                                                                                        value={el.sku}
                                                                                        onChange={(e) => {
                                                                                            el.ids.forEach((id: string) => handleSkuChange(id, e.target.value.toUpperCase(), el.source));
                                                                                        }}
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        placeholder="SKU"
                                                                                        className={`h-4 text-[8px] px-1 uppercase font-mono ${!el.sku ? 'border-dashed'
                                                                                            : (material || isHardware) ? 'border-green-400/50' : 'border-yellow-400/50'
                                                                                            }`}
                                                                                    />
                                                                                </div>

                                                                                {/* Status icon */}
                                                                                {el.sku && (material || isHardware) && (
                                                                                    <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                                                                                )}
                                                                                {el.sku && !material && !isHardware && (
                                                                                    <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                                                                                )}

                                                                                {/* Delete element button */}
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleRemoveElements(el.ids, el.source);
                                                                                    }}
                                                                                    className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-500 transition-colors opacity-50 hover:opacity-100"
                                                                                    title="Usuń element"
                                                                                >
                                                                                    <X className="w-3 h-3" />
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )
                                                        }
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>
                </div>

            </div>

            {/* Modal */}
            {
                modal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setModal({ isOpen: false, position: { x: 0, y: 0 }, targetComponentId: null })}>
                        <div className="bg-card p-6 rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                            <h3 className="font-bold text-lg mb-4">Dodaj element</h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Typ</Label>
                                    <Select value={newElementType} onValueChange={setNewElementType}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{ELEMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Wymiary (mm)</Label>
                                    <Input value={newElementDimensions} onChange={e => setNewElementDimensions(e.target.value)} placeholder="np. 500x400" />
                                </div>
                                <Button className="w-full" onClick={handleAddElement}>Dodaj</Button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
