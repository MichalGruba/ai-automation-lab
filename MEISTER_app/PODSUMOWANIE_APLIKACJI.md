# AI Kosztorysant Stolarski

## Opis Aplikacji

Inteligentna aplikacja webowa do automatycznego generowania kosztorysów stolarskich na podstawie rysunków technicznych. Wykorzystuje AI (Gemini 3 Pro Preview Vision) do analizy obrazów i automatycznie wylicza potrzebne materiały oraz okucia.

---

## Główne Funkcjonalności

### 1. Analiza Rysunków AI (Geometry-First)
- **Strategia:** Geometry-First. AI wykrywa obiekty (Bounding Box), a Backend dopasowuje Markery Użytkownika.
- Upload rysunku technicznego (JPG, PNG, PDF)
- AI Gemini 3 Pro Preview analizuje rysunek i zwraca `box_2d` dla szafek
- **Geometric Matching:** Precyzyjne przypisanie ID markera do wykrytej ramki (korekta błędów AI)
- Automatyczne rozpoznawanie wymiarów, ilości, typów elementów
- **Słownik mebli** - szczegółowe reguły dla różnych typów szafek

### 2. Automatyczna Ekspansja Komponentów
- **Szuflady** → Prowadnice Blum (MERIVOBOX/Movento/Tandembox/Legrabox), sprzęgła, fronty
- **Drzwi/Fronty** → Zawiasy Blum (ilość zależna od wysokości)
- **Półki** → Podpórki
- **CARGO/WYSUW** → Traktowane jako kompletne systemy (bez dodatkowego okucia)

### 3. Słownik Typów Szafek (furniture-dictionary.ts)
Kompleksowe szablony dla różnych typów mebli:
| Typ | ID | Wzorce nazw |
|-----|-----|-------------|
| Dolna standardowa | LOWER_STANDARD | D30, D40, D50, D60, D80, D90, D100 |
| Górna standardowa | UPPER_STANDARD | G30, G40, G50, G60, G80, G90 |
| Cargo/Wysuw | CARGO | CARGO, WYSUW |
| Obudowa AGD | APPLIANCE | LODÓWKA, PIEKARNIK, MIKROFALA |
| Szufladowa | DRAWER_CABINET | SZUFLADY, KOMODA |
| Witryna | VITRINE | WITRYNA, SZKLANA |
| Szafa wnękowa | WARDROBE | SZAFA, GARDEROBA |
| Pod zlew | SINK_CABINET | ZLEW, ZLEWOZMYWAK |
| Narożna | CORNER_CABINET | NAROŻNIK, ROGOWA |

### 4. Katalog Materiałów
- Integracja katalogu **EGGER** (płyty, laminaty)
- Integracja cennika **Blum** (okucia, prowadnice, zawiasy)
- Cennik **Woodeco** (alternatywne płyty)
- Katalog Blum rozszerzony (Katalog_blum_1.csv, Katalog_blum_2.csv)
- Fuzzy matching SKU (rozpoznaje podobne kody)

### 5. Kosztorys
- Automatyczne wyliczanie ilości arkuszy materiału
- Osobne liczenie okuć (szt.) i materiałów (arkusze)
- Edytowalne ilości i kody SKU
- Marża i koszt montażu (%)
- Grupowanie elementów wg komponentu
- Drukowanie/eksport

---

## Architektura Techniczna

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 16)                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Upload    │  │  Drawing    │  │   Cost      │     │
│  │   Panel     │  │  Analyzer   │  │  Estimate   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Settings   │  │   Export    │  │   Quote     │     │
│  │   Panel     │  │   Panel     │  │   Print     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                   SERVER ACTIONS                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │            analyze-drawing.ts                    │   │
│  │  - Wywołanie Gemini API                          │   │
│  │  - Component Rules Engine                        │   │
│  │  - Blum Drawer Expansion                         │   │
│  │  - CARGO/WYSUW Detection                         │   │
│  └─────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                      BIBLIOTEKI                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │ gemini.ts    │ │ furniture-   │ │ component-   │    │
│  │ (AI API)     │ │ dictionary.ts│ │ rules.ts     │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │ blum-        │ │ blum-        │ │ catalog-     │    │
│  │ catalog.ts   │ │ prices.ts    │ │ Service.ts   │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
│  ┌──────────────┐ ┌──────────────┐                     │
│  │ knowledge-   │ │ smart-       │                     │
│  │ base.ts      │ │ reader.ts    │                     │
│  └──────────────┘ └──────────────┘                     │
└─────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                      BAZA DANYCH                         │
│  Database/                                               │
│  ├── CENNIK EGGER - Arkusz1.csv    (materiały EGGER)    │
│  ├── Cennik blum.csv               (okucia Blum)        │
│  ├── Cennik płyt Woodeco.csv       (płyty Woodeco)      │
│  ├── Katalog_blum_1.csv            (katalog rozszerzony)│
│  ├── Katalog_blum_2.csv            (katalog rozszerzony)│
│  └── instrukcje_odczytu_projektow.csv (knowledge base)  │
└─────────────────────────────────────────────────────────┘
```

---

## Proces Działania

### Krok 1: Upload Rysunku
Użytkownik wgrywa rysunek techniczny (projekt mebla).

### Krok 2: Analiza AI
```
Rysunek → Gemini 3 Pro Preview API → JSON z elementami
```
AI wykrywa:
- Wymiary główne (szerokość, wysokość, głębokość)
- Elementy składowe (boki, wieńce, półki, fronty, szuflady)
- Ilości (x2, x4, itp.)
- Lokalizację elementów na rysunku (bounding box)
- ID komponentu (np. D60_Zlew) → do nazwy elementu

### Krok 3: Furniture Dictionary
```
Typ szafki → Dopasowanie wzorca → Szablon komponentów
```
Przykład:
- "D60" → LOWER_STANDARD → 2x bok, 1x wieniec dolny, 1x listwa górna
- "CARGO" → CARGO → pełna szafka, BEZ okuć (kompletny system)

### Krok 4: Component Rules Engine
```
Element AI → Sprawdzenie reguł → Ekspansja na okucia
```
Przykład:
- "SZUFLADA L-500" → Merivobox 500mm (komplet)
- "FRONT 720mm" → Zawiasy Blum (3x)

### Krok 5: Matching Materiałów
```
SKU z rysunku → Fuzzy matching → Cena z katalogu
```
- EGGER: W980, U960, H1176 → ceny płyt
- Blum: 760H5000S, 71B3590 → ceny okuć
- SKU domyślnie: "NIEZNANY" (do ręcznego uzupełnienia)

### Krok 6: Generowanie Kosztorysu
```
Elementy + Ceny → Kalkulacja → Kosztorys
```
- Powierzchnia materiałów → ilość arkuszy
- Okucia → ilość sztuk
- + Marża (%)
- + Montaż (%)
- = SUMA CAŁKOWITA

---

## Pliki Kluczowe

| Plik | Funkcja |
|------|---------|
| `app/actions/analyze-drawing.ts` | Główna logika analizy rysunku |
| `lib/gemini.ts` | Komunikacja z Gemini 3 Pro Preview API + prompt |
| `lib/furniture-dictionary.ts` | **NOWY** Słownik typów szafek z regułami |
| `lib/component-rules.ts` | Reguły ekspansji elementów na okucia |
| `lib/blum-catalog.ts` | Ekspansja szuflad Blum (MERIVOBOX domyślny) |
| `lib/blum-prices.ts` | Cennik Blum (parser CSV) |
| `lib/catalogService.ts` | Serwis katalogów (EGGER, Woodeco, Blum) |
| `lib/knowledge-base.ts` | Instrukcje odczytu dla AI |
| `lib/smart-reader.ts` | Inteligentny odczyt dokumentów |
| `components/estimator/drawing-analyzer.tsx` | UI analizy rysunku |
| `components/estimator/data-table.tsx` | UI kosztorysu |
| `components/estimator/file-upload.tsx` | Obsługa uploadu plików |
| `components/estimator/settings-panel.tsx` | Panel ustawień |
| `components/estimator/export-panel.tsx` | Panel eksportu |
| `components/estimator/print-offer.tsx` | Drukowanie oferty |
| `components/estimator/client-quote.tsx` | Oferta dla klienta |
| `store/useEstimateStore.ts` | Stan aplikacji (Zustand) |

---

## Bazy Danych (CSV)

### CENNIK EGGER - Arkusz1.csv
Kolumny: SKU, Struktura, Nazwa, Cena_18mm, Cena_Trudnozap, Cena_Laminat

### Cennik blum.csv
Kolumny: Symbol, Nazwa, Cena_PLN, Opis

### Cennik płyt Woodeco - Sheet1.csv (NOWE)
Alternatywny cennik płyt meblowych

### Katalog_blum_1.csv / Katalog_blum_2.csv (NOWE)
Rozszerzony katalog Blum z dodatkowymi produktami

### instrukcje_odczytu_projektow.csv
Kolumny: element, typ_rysunku, lokalizacja, jak_odczytac, format, przykład
(81+ typów elementów z instrukcjami dla AI)

---

## Specjalne Przypadki

### CARGO / WYSUW
- Traktowane jako **kompletne systemy** - bez dodatkowego okucia
- AI wykrywa na podstawie nazwy komponentu
- Pomijane przy ekspansji szuflad/zawiasów

### Domyślny System Szuflad
- **MERIVOBOX** jako domyślny system prowadnic
- Automatyczne rozpoznawanie alternatyw: TANDEMBOX, MOVENTO, LEGRABOX

### Grupowanie Elementów
- Elementy grupowane wg **typu + wymiarów + ID komponentu**
- Hardware grupowany oddzielnie per komponent
- Ułatwia weryfikację i wycenę

---

## Zmienne Środowiskowe

```env
GEMINI_API_KEY=your_gemini_api_key
```

---

## Uruchomienie

```bash
# Instalacja zależności
npm install

# Uruchomienie dev server
npm run dev

# Aplikacja dostępna na http://localhost:3000
```

---

## Stack Technologiczny

- **Frontend:** Next.js 16.1.6, React 19.2.3, TypeScript
- **Styling:** Tailwind CSS 4
- **Stan:** Zustand 5.0.10
- **AI:** Google Gemini 3 Pro Preview (Vision)
- **UI Components:** shadcn/ui (Radix), Lucide icons
- **PDF:** pdfjs-dist (obsługa PDF)

---

## Ostatnia Aktualizacja

Data: 2026-02-04

### Zmiany od pierwszej wersji:
1. **Nowy plik `furniture-dictionary.ts`** - słownik typów szafek z regułami ekspansji
2. **Rozszerzony katalog Blum** - Katalog_blum_1.csv, Katalog_blum_2.csv
3. **Cennik Woodeco** - dodatkowy dostawca płyt
4. **MERIVOBOX jako domyślny** - system szuflad
5. **CARGO/WYSUW** - obsługa kompletnych systemów
6. **Grupowanie per komponent** - hardware przypisany do ID szafki
7. **SKU domyślnie "NIEZNANY"** - do ręcznego uzupełnienia
8. **Nowe komponenty UI** - print-offer, client-quote, export-panel

---

## Autor

Projekt stworzony z pomocą AI (Antigravity/Claude).
