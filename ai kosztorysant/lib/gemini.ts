// Using direct REST API instead of SDK to avoid version issues
// Using Gemini 3 Pro Preview as requested for latest capabilities (available since Jan 2026)

import { formatElectricalSymbolsForPrompt, formatDimensionRulesForPrompt } from './electrical-symbols';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent';

export async function analyzeDrawing(imageBase64: string, description?: string) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }

  // Extract mime type if present (e.g. data:image/png;base64,...)
  const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

  // Clean base64 string - remove data:image/xyz;base64, prefix if present
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  // Pobierz sformatowane sekcje z modułu symboli
  const electricalSymbolsSection = formatElectricalSymbolsForPrompt();
  const dimensionRulesSection = formatDimensionRulesForPrompt();

  // Build prompt with optional user description
  const userDescriptionSection = description?.trim()
    ? `
═══════════════════════════════════════════════════════════════
OPIS PROJEKTU OD UŻYTKOWNIKA (WAŻNE - TO JEST KLUCZ DO ZROZUMIENIA RYSUNKU!)
═══════════════════════════════════════════════════════════════
${description.trim()}
═══════════════════════════════════════════════════════════════

`
    : '';

  // DETECT MARKER MODE
  // DISABLED STRICT MARKER MODE to use Geometry-First strategy.
  const isMarkerMode = false; // description?.includes('CZERWONYCH PUNKTÓW');

  let prompt = '';

  if (isMarkerMode) {
    console.log('🚀 ACTIVATING STRICT MARKER MODE');
    prompt = `${userDescriptionSection}Jesteś ekspertem stolarskim. Analizujesz rysunek techniczny mebla.
ROZPOZNAWANY TRYB: **ANALIZA MODUŁOWA (UNIT-BASED)**.

TWOIM ZADANIEM JEST ZIDENTYFIKOWANIE **CAŁYCH MEBLI (MODUŁÓW)** WIDOCZNYCH NA RYSUNKU.
NIE ROZBIJAJ ICH NA FORMATKI! (Nie wypisuj: Bok, Wieniec, Półka).
Jeden mebel = Jeden obiekt w JSON.

═══════════════════════════════════════════════════════════════
ZASADY IDENTYFIKACJI (CO MASZ ZWRÓCIĆ):
═══════════════════════════════════════════════════════════════

1. **SZAFKI DOLNE (Stojące)**:
   - Zwróć jako: "Szafka Dolna [Szerokość]" (np. "Szafka Dolna 600", "Szafka Zlew 800").
   - System sam policzy boki, dno, trawersy i okucia. Ty podaj tylko TYP i WYMIAR.

2. **SZAFKI GÓRNE (Wiszące)**:
   - Zwróć jako: "Szafka Górna [Szerokość]" (np. "Szafka Górna 600").
   - System sam policzy wieniec górny/dolny i boki.

3. **SŁUPKI / WYSOKA ZABUDOWA**:
   - Zwróć jako: "Słupek [Typ] [Szerokość]" (np. "Słupek Piekarnik 600", "Słupek Cargo 400").

4. **ZMYWARKA**:
   - Zwróć jako: "Zmywarka 600" (lub 450).
   - System wyceni TYLKO front.

5. **SZUFLADY**:
   - Zwróć jako: "Szafka Dolna [Szerokość] Szuflady" (np. "Szafka Dolna 800 Szuflady").
   - Jeśli widzisz np. 3 szuflady w jednej szafce -> To JEST JEDNA SZAFKA (qty: 1).

═══════════════════════════════════════════════════════════════
🚫 CZEGO NIE ROBIĆ (ZAKAZANE!):
═══════════════════════════════════════════════════════════════
- ❌ NIE LISTUJ CZĘŚCI: Nie pisz "Bok", "Wieniec", "Półka". Pisz tylko "Szafka Dolna".
- ❌ NIE DODAWAJ PLECÓW: Ignoruj plecy (HDF).
- ❌ NIE DODAWAJ OKUĆ: Żadnych zawiasów, nóżek, prowadnic.
- ❌ NIE ROZBIJAJ SZUFLAD: Nie pisz "Front szuflady x3". Pisz "Szafka szufladowa x1".

═══════════════════════════════════════════════════════════════
GŁĘBOKOŚCI STANDARTOWE (JEŚLI NIE PODANO NA RYSUNKU):
- Dolne: 510 mm
- Górne: 300 mm
- Wysokie (AGD/Słupki): 560 mm
═══════════════════════════════════════════════════════════════

FORMAT ODPOWIEDZI JSON:
[
  {
    "sku": "NIEZNANY",
    "elements": [
       { 
         "name": "Słupek AGD 600 - M1", 
         "width": 600, 
         "height": 2100, 
         "qty": 1, 
         "box_2d": [120, 300, 500, 450]
       },
       { 
         "name": "Szafka Dolna Zlew 800 - M2", 
         "width": 800, 
         "height": 720, 
         "qty": 1, 
         "box_2d": [500, 100, 700, 300] 
       },
       {
         "name": "Zmywarka 600 - M3",
         "width": 600,
         "height": 720,
         "qty": 1,
         "box_2d": [500, 300, 700, 400]
       }
    ]
  }
]

PAMIĘTAJ:
1. NAJWAŻNIEJSZE JEST OKREŚLENIE TYPU MEBLA (Szafka Dolna / Górna / Słupek).
2. "box_2d" ma obejmować CAŁY MEBEL (obrys zewnętrzny).
3. Numer Markera (M1, M2...) MUSI być w nazwie.

${dimensionRulesSection}`;

  } else {
    // STANDARD MODE (No markers)
    prompt = `${userDescriptionSection}Jesteś ekspertem stolarskim. Analizujesz rysunek techniczny mebla zgodnie z profesjonalnymi standardami.

═══════════════════════════════════════════════════════════════
🚫 ELEMENTY DO CAŁKOWITEGO POMINIĘCIA - NIE LICZ ICH NIGDY!
═══════════════════════════════════════════════════════════════

DRZWI BUDOWLANE - JAK JE ROZPOZNAĆ (POMIŃ!):
• Znajdują się przy KRAWĘDZI rysunku (lewa/prawa strona)
• Mają KLAMKĘ lub ŁUK OTWARCIA (ćwiartka okręgu)
• Są przy wejściu do pomieszczenia, nie w zabudowie kuchennej
• Wysokość ~200-210 cm (pełna wysokość drzwi)
• NIE mają podziałów wewnętrznych jak szafki
• Oznaczenia: "drzwi", "wejście", brak symboli D60/G60
➔ JEŚLI element wygląda jak drzwi wejściowe - CAŁKOWICIE GO POMIŃ!

═══════════════════════════════════════════════════════════════
📏 PRECYZJA WYMIARÓW - CRITICAL RULES:
═══════════════════════════════════════════════════════════════
1. ODCZYTUJ WYMIARY Z LINII WYMIAROWYCH: Jeśli na rysunku są linie wymiarowe (np. "600", "800"), ONE SĄ ŚWIĘTOŚCIĄ. Użyj ich.
2. NIE ZGADUJ: Jeśli widzisz liczbę "900" przy szafce, to ona ma 900mm szerokości. Nie wpisuj 600.
3. Jeśli brak wymiaru -> szukaj opisu (np. "D80" = 800mm, "G45" = 450mm).
4. Jeśli brak opisu -> Dopiero wtedy szacuj na podstawie proporcji (standardy: 150, 300, 400, 450, 500, 600, 800, 900).

OKNA - JAK JE ROZPOZNAĆ (POMIŃ!):
• Prostokąt z podziałami (szprosy)
• Często nad blatem kuchennym
• Oznaczenia: "okno", wymiary typu 120x140
➔ JEŚLI element wygląda jak okno - CAŁKOWICIE GO POMIŃ!

═══════════════════════════════════════════════════════════════
📐 ROZPOZNAWANIE OSOBNYCH SEKCJI ZABUDOWY (dla cokołów!)
═══════════════════════════════════════════════════════════════

KIEDY TO JEST JEDNA SEKCJA (= JEDEN COKÓŁ):
• Szafki stykają się ze sobą bez przerwy
• Ciągła linia zabudowy

KIEDY TO SĄ OSOBNE SEKCJE (= OSOBNE COKOŁY):
• Między szafkami jest PRZERWA (puste miejsce, okno, drzwi)
• Lodówka stoi OSOBNO od reszty szafek
• Wysoka zabudowa (słupek/lodówka) oddzielona od niskich szafek
• Różne głębokości zabudowy (np. szafki 60cm, lodówka 70cm)

PRZYKŁAD Z TEGO RYSUNKU:
• Szafki dolne 2,3,4 = jedna ciągła sekcja = JEDEN cokół
• Lodówka 5 = osobna sekcja = OSOBNY cokół
➔ Licz OSOBNE cokoły dla każdej ciągłej sekcji!

═══════════════════════════════════════════════════════════════

⚠️ KRYTYCZNA ZASADA: ZNAJDŹ I WYLISTUJ **KAŻDĄ** SZAFKĘ/KOMPONENT Z RYSUNKU!
- Przejrzyj CAŁY rysunek od lewej do prawej
- NIE POMIJAJ żadnej szafki, nawet jeśli wygląda podobnie do innej
- Szukaj oznaczeń: D60, D80, G30, G60, Cargo, Zlew, Lodówka, Piekarnik itp.
- Każdy komponent musi mieć UNIKALNY identyfikator w nazwie (np. Bok - D60_Zlew, Bok - D80_Cargo)
- JEŚLI WIDZISZ KILKA TAKICH SAMYCH SZAFEK (np. dwie szafki D60):
  - NIE łącz ich w jeden element!
  - Nadaj im unikalne nazwy: "D60_1", "D60_2", "D60_3" itd.
  - Generuj osobny zestaw komponentów dla KAŻDEJ z nich.
- POMIŃ całkowicie: drzwi wejściowe, okna, elementy przy krawędzi obrazu

1. ZASADY ODCZYTU PROJEKTÓW (z bazy wiedzy):
- Wymiary ogólne: Szukaj linii z grotami strzałek na zewnątrz obrysu. Format "Szerokość x Wysokość" lub "Szerokość x Głębokość".

═══════════════════════════════════════════════════════════════
🏠 ROZPOZNAWANIE TYPU MEBLA - KRYTYCZNE DLA GŁĘBOKOŚCI!
═══════════════════════════════════════════════════════════════

NAJPIERW USTAL TYP MEBLA:

📦 ZABUDOWA KUCHENNA (standardowe głębokości):
Cechy: D60, D80, G60, zlew, zmywarka, piekarnik, lodówka, cargo, blat roboczy
→ Szafki DOLNE: głębokość 510 mm
→ Szafki GÓRNE: głębokość 340 mm
→ Użyj tych głębokości TYLKO dla kuchni!

👔 SZAFA/GARDEROBA (wymiary z rysunku!):
Cechy: drążek na ubrania, duże półki, przegródki, "szafa", "garderoba", "wardrobe"
→ NIE STOSUJ domyślnych głębokości kuchennych!
→ ODCZYTAJ głębokość z rysunku (typowo 500-600mm)
→ Blenda w szafie ma pełną głębokość korpusu (nie 100mm!)

🪑 INNE MEBLE (wymiary z rysunku!):
Cechy: regał, komoda, biurko, łazienka
→ NIE STOSUJ domyślnych głębokości kuchennych!
→ ODCZYTAJ wszystkie wymiary z rysunku

⚠️ KRYTYCZNA ZASADA GŁĘBOKOŚCI:
- Standardowe głębokości (510mm dolne, 340mm górne) = TYLKO KUCHNIA
- Szafy, garderoby, regały = ODCZYTAJ z rysunku!
- Jeśli nie ma wyraźnego wymiaru głębokości = NIE ZGADUJ, oznacz jako "wymaga weryfikacji"

- Szafy do zabudowy: Szukaj prostokąta z podziałami wewnętrznymi. Odczytaj szerokość sekcji, ilość półek, szuflad. GŁĘBOKOŚĆ Z RYSUNKU!
- Blenda w szafie: to płyta pionowa z pełną głębokością korpusu - nie mylić z cokołem!
- Materiały: Szukaj oznaczeń w legendzie lub na rysunku (np. W980, płyta meblowa, MDF).
- Półki: Linia pozioma. Długość = szerokość wnęki minus grubości boków (zazwyczaj 18mm x 2).
- Blat: Ciągła linia obrysu. Standardowa głębokość 60cm (tylko kuchnia!).
- Głębokość: Często oznaczana jako "Gł.", "D", "Depth" lub widoczna na rzucie bocznym/przekroju.

2. ZADANIE:
Wyodrębnij WSZYSTKIE wymiary i oblicz elementy potrzebne do budowy KAŻDEGO mebla na rysunku.
PAMIĘTAJ: Lepiej wylistować za dużo niż pominąć jakiś komponent!

KROK 1 - ZNAJDŹ GŁÓWNE WYMIARY:
- SZEROKOŚĆ (np. "200 cm", "2000 mm")
- WYSOKOŚĆ (np. "235 cm", "2350 mm") 
- GŁĘBOKOŚĆ - jeśli nie podana, użyj standardów:
  * Szafka dolna kuchenna: 510 mm
  * Szafka górna kuchenna: 340 mm
  * Szafa wnękowa: zazwyczaj 500-600 mm

KROK 1.5 - SPRAWDŹ ILOŚCI (MNOŻNIKI):
- Szukaj oznaczeń typu "x8", "8x", "8szt", "8 szt.".
- Jeśli nazwa to np. "Bok x8", to: name="Bok", qty=8.
- JEŚLI nie ma mnożnika, qty=1.

KROK 2 - PRZELICZ NA MILIMETRY:
- cm × 10 = mm (200 cm = 2000 mm)
- m × 1000 = mm (2.35 m = 2350 mm)

KROK 3 - WYLISTUJ WSZYSTKIE ELEMENTY SKŁADOWE (BEZ PLECÓW!):

WAŻNE RÓŻNICE między szafkami DOLNYMI i GÓRNYMI:

SZAFKA DOLNA (D60, D80 itp.):
| Element | Szerokość (mm) | Wysokość (mm) | Ilość |
|---------|----------------|---------------|-------|
| Bok | Głębokość (510) | Wysokość | 2 |
| Wieniec dolny | S-(2*18) | Głębokość (PEŁNA!) | 1 | PEŁNA PŁYTA na dole! |
| Trawers górny | S-(2*18) | 100 | 1 | LISTWA 100mm na górze! |
| Półka | S-(2*18) | Głębokość-20 | ? |
| Front/Drzwi | (S/ilość)-3 | W-3 | ? |
| Cokół | S | 100-150 | 1 | BEZ OKUĆ! |

SZAFKA GÓRNA (G60, G80 itp.):
| Element | Szerokość (mm) | Wysokość (mm) | Ilość |
|---------|----------------|---------------|-------|
| Bok | Głębokość (340) | Wysokość | 2 |
| Wieniec górny | S-(2*18) | Głębokość (pełna!) | 1 | PEŁNA PŁYTA na górze! |
| Wieniec dolny | S-(2*18) | Głębokość (pełna!) | 1 | PEŁNA PŁYTA dół! |
| Półka | S-(2*18) | Głębokość-20 | ? |
| Front/Drzwi | (S/ilość)-3 | W-3 | ? |

UWAGA: NIE LICZ PLECÓW! Plecy nie są częścią wyceny.
UWAGA: COKÓŁ - JEDEN element na całą ciągłą sekcję zabudowy! NIE dziel per szafka!
       Jeśli są oddzielne sekcje (np. szafki kuchenne + oddzielna lodówka) = osobne cokoły.
       Wymiar: szerokość sekcji × wysokość (100-150mm). Cokół to płyta BEZ okuć!
UWAGA: BLENDA to pionowy cokół - liczy się z bokami, pełnym korpusem (wieniec dolny + górny) i okuciami (zawiasy). System sam expanduje.
UWAGA: DRZWI BUDOWLANE (wejściowe, pokojowe, przesuwne) - CAŁKOWICIE POMIŃ! Nie są częścią mebli!
UWAGA: ZMYWARKA - licz TYLKO front dekoracyjny! Boki i trawers NIE są potrzebne - zmywarka ma własną obudowę!

ZASADA SPECJALNA - SZUFLADY (KRYTYCZNE!):

⚠️ SZUFLADY = KORPUS + FRONTY + OKUCIA (MERIVOBOX)

MUSISZ WYLICZYĆ:
1. KORPUS (elementy płytowe - OBOWIĄZKOWE!):
   - Boki: 2x (wymiary: GŁĘBOKOŚĆ × WYSOKOŚĆ korpusu)
   - Wieniec dolny: 1x (wymiary: SZER-(2×18) × GŁĘBOKOŚĆ)
   - Trawers górny: 1x (wymiary: SZER-(2×18) × 100mm)
   
2. FRONTY SZUFLAD (osobne elementy):
   - Tyle frontów ile szuflad (wymiary: szerokość × wysokość frontu)
   - W polu "sku" wpisz: "SZUFLADA MERIVOBOX L-[GŁĘBOKOŚĆ]"
   - Przykłady: "SZUFLADA MERIVOBOX L-500", "SZUFLADA MERIVOBOX L-450"

3. OKUCIA (automatyczne):
   - System automatycznie doda prowadnice MERIVOBOX
   
⚠️ DOMYŚLNY SYSTEM SZUFLAD = MERIVOBOX (KRYTYCZNE!)
- NIE używaj MOVENTO, TANDEMBOX, LEGRABOX - chyba że wyraźnie napisano!
- Każda szuflada = "SZUFLADA MERIVOBOX L-[GŁĘBOKOŚĆ]"
- Brak oznaczenia systemu = MERIVOBOX

ZASADA "OKUCIA TYLKO DLA SZAFEK":
- Okucia (prowadnice, zawiasy) mogą być tylko w: SZAFKACH, SZUFLADACH, CARGO.
- ZABRONIONE jest dodawanie okuć do: Blatów, Cokołów, Paneli, "Inne".
- BLENDA = pionowy cokół z pełnym korpusem i okuciami (System sam expanduje).

SZUFLADY W SZAFACH/GARDERÓBACH:
- Głębokość szuflady = głębokość szafy (nie 510mm!)
- Odczytaj głębokość z rysunku!

ZASADA "UNIKALNOŚCI REGAŁÓW":
- Policz DOKŁADNIE ile jest regałów na rysunku.
- Jeśli widzisz 2 regały, wylistuj komponenty dla 2 regałów. NIE POWIELAJ ich x5!
- Nie generuj duplikatów dla tego samego elementu.
- Jeśli jest opis "Regał x2" -> zwróć elementy z qty=2 (lub pomnożonym). Nie zwracaj osobno komponentów dla Regał 1 i Regał 2 jeśli są identyczne.

═══════════════════════════════════════════════════════════════
SŁOWNIK TYPÓW MEBLI - DOKŁADNE ZASADY ROZBICIA NA KOMPONENTY
═══════════════════════════════════════════════════════════════

📦 SZAFKA DOLNA (D30, D40, D50, D60, D80, D100...)
Głębokość: 510mm
Komponenty:
- Bok: 2x (wymiary: GŁĘBOKOŚĆ × WYSOKOŚĆ)
- Wieniec dolny: 1x (wymiary: SZER-(2×18) × GŁĘBOKOŚĆ) - PEŁNA PŁYTA!
- Trawers górny: 1x (wymiary: SZER-(2×18) × 100mm) - tylko listwa!
- Półka: jeśli jest (wymiary: SZER-(2×18) × GŁĘBOKOŚĆ-20)
- Front: 1-2x (wymiary: SZER-3 × WYS-3)
Okucia: Zawiasy (2-4 na front) jeśli ma drzwi

📦 SZAFKA GÓRNA / NADSTAWKA (G30, G40, G60, G80, N30, N40...)
Głębokość: 340mm
Komponenty:
- Bok: 2x (wymiary: GŁĘBOKOŚĆ × WYSOKOŚĆ)
- Wieniec górny: 1x (wymiary: SZER-(2×18) × GŁĘBOKOŚĆ) - PEŁNA PŁYTA góra!
- Wieniec dolny: 1x (wymiary: SZER-(2×18) × GŁĘBOKOŚĆ) - PEŁNA PŁYTA dół!
- Półka: jeśli jest (wymiary: SZER-(2×18) × GŁĘBOKOŚĆ-20)
- Front: 1-2x (wymiary: SZER-3 × WYS-3)
Okucia: Zawiasy (2-4 na front) jeśli ma drzwi

⚠️ CARGO / WYSUW - SYSTEM KOMPLETNY!
Głębokość: 510mm
TYLKO KORPUS - ZERO OKUĆ:
- Front Cargo: 1x (wymiary: SZER-3 × WYS-3)
ZAKAZANE: boki, wieniec, szuflada, prowadnica, zawias - kupowane jako komplet!
Tylko front jest elementem stolarskim (płyta). Reszta to mechanizm.
ZAKAZANE: szuflada, prowadnica, zawias - kupowane jako komplet!

⚠️ OBUDOWA LODÓWKI / PIEKARNIKA
Głębokość: 580mm
TYLKO KONSTRUKCJA:
- Bok: 2x (wysokie!)
- Trawers górny: 1x
- Blenda dolna: opcjonalnie 1x
ZAKAZANE: półki (półki idą do nadstawki NAD lodówką!)

📦 SZAFKA Z SZUFLADAMI - WAŻNE!
Głębokość: 510mm
MUSISZ WYLICZYĆ KORPUS + FRONTY:
KORPUS (elementy płytowe):
- Bok: 2x (wymiary: GŁĘBOKOŚĆ × WYSOKOŚĆ korpusu)
- Wieniec dolny: 1x (wymiary: SZER-(2×18) × GŁĘBOKOŚĆ)
- Trawers górny: 1x (wymiary: SZER-(2×18) × 100mm)
FRONTY SZUFLAD (osobne elementy):
- Front szuflady: tyle ile szuflad (wymiary: szerokość frontu × wysokość frontu)
OKUCIA: System automatycznie doda prowadnice MERIVOBOX na podstawie szuflad.
NIE STOSUJ MOVENTO ani TANDEMBOX chyba że wyraźnie podano w projekcie!

📦 WITRYNA (szklane fronty)
Głębokość: 340mm
Komponenty: jak szafka górna + szkło
Okucia: Zawiasy (2-4 na front)

📦 OBUDOWA ZMYWARKI - TYLKO FRONT!
Głębokość: 510mm
KOMPONENTY DO WYCENY:
- Front (panel dekoracyjny): TYLKO 1x - to jedyny element do wyceny!
NIE LICZ: boków, trawersu, wieńca - zmywarka ma własną obudowę!
Okucia: BRAK (panel montowany na specjalnych uchwytach zmywarki)

📦 SZAFKA POD ZLEW
Głębokość: 510mm
- Bok: 2x
- Wieniec dolny: 1x
- Trawers górny: 2x (dwa dla wycięcia pod zlew!)
- Fronty: zazwyczaj 2x (dwuskrzydłowe)
Okucia: Zawiasy (2 na każdy front = 4 razem)

📦 SZAFA / GARDEROBA
Głębokość: 500-600mm
- Bok: 2x
- Wieniec górny: 1x
- Wieniec dolny: 1x
- Półki: wiele
- Drążek: jeśli na ubrania
Okucia: Uchwyty drążka, opcjonalnie zawiasy

═══════════════════════════════════════════════════════════════
ZASADA ROZPOZNAWANIA Z RYSUNKU
═══════════════════════════════════════════════════════════════
1. Znajdź WSZYSTKIE oznaczenia szafek (D60, G30, Cargo, Lodówka itp.)
2. Dla KAŻDEGO oznaczenia dopasuj typ z powyższego słownika
3. Oblicz wymiary komponentów według wzorów
4. Dodaj odpowiednie okucia (lub ŻADNE dla Cargo/AGD)
5. Każdy element MUSI mieć suffix z ID szafki np. "Bok - D60_Zlew"

PRZYKŁAD ODPOWIEDZI:

[
  {
    "sku": "NIEZNANY",
    "elements": [
      {"name": "Bok - D60", "width": 510, "height": 720, "qty": 2, "box_2d": [500, 100, 700, 300]},
      {"name": "Wieniec - D60", "width": 564, "height": 510, "qty": 2, "box_2d": [500, 100, 700, 300]},
      {"name": "Półka - D60", "width": 564, "height": 490, "qty": 1, "box_2d": [500, 100, 700, 300]},
      {"name": "Front - D60", "width": 597, "height": 717, "qty": 1, "box_2d": [500, 100, 700, 300]},
      {"name": "Front - D60", "width": 597, "height": 717, "qty": 1, "box_2d": [500, 100, 700, 300]},
      {"name": "Bok - N30_Nadstawka", "width": 340, "height": 300, "qty": 2, "box_2d": [100, 200, 300, 400]},
      {"name": "Wieniec Górny - N30_Nadstawka", "width": 264, "height": 340, "qty": 1, "box_2d": [100, 200, 300, 400]},
      {"name": "Wieniec Dolny - N30_Nadstawka", "width": 264, "height": 340, "qty": 1, "box_2d": [100, 200, 300, 400]},
      {"name": "Front - N30_Nadstawka", "width": 297, "height": 297, "qty": 1, "box_2d": [100, 200, 300, 400]}
    ]
  }
]

KRYTYCZNE ZASADY:
- Dla KAŻDEGO elementu widocznego na rysunku, dodaj pole "box_2d": [ymin, xmin, ymax, xmax] (skala 0-1000). To pozwoli zaznaczyć element na obrazku.
- Wyciągaj ilość z nazwy! "Półka x4" -> name: "Półka", qty: 4.
- W polu "name" ZAWSZE dodawaj identyfikator szafki z projektu! Format: "Typ elementu - ID_szafki" np. "Bok - D50_Zlew", "Wieniec - N30_Nadstawka"
- Pole "sku" ZAWSZE = "NIEZNANY" (użytkownik sam wpisze kod materiału jak W960)
- GRUPUJ elementy o tych samych wymiarach I tym samym ID szafki!
- NIE LICZ PLECÓW! Pomijaj plecy w analizie.
- Nie pomiń elementów: boki, wieńce, półki, fronty.
- Jeśli wymiar jest "w świetle" (wewnętrzny), dodaj grubości płyt (2x18mm) do wymiaru zewnętrznego.
- Wykonaj WSZYSTKIE obliczenia matematyczne. NIE zwracaj działań (np. "500-36"), zwracaj TYLKO wynik (np. "464").
- Dla szafek kuchennych bez podanej głębokości: dolne=510mm, górne=340mm.

${electricalSymbolsSection}

═══════════════════════════════════════════════════════════════
PRECYZYJNY ODCZYT WYMIARÓW - ZASADY KRYTYCZNE
═══════════════════════════════════════════════════════════════

⚠️ HIERARCHIA ŹRÓDEŁ WYMIARÓW (od najbardziej do najmniej wiarygodnych):
1. LINIE WYMIAROWE z grotami strzałek (→ ← lub ↔) - najbardziej wiarygodne
2. TABELE specyfikacji z wymiarami elementów
3. WYMIARY przy konkretnych elementach na rysunku
4. OBLICZENIA na podstawie głównych wymiarów

📏 ROZPOZNAWANIE JEDNOSTEK:
- Wartość > 3000 BEZ jednostki = prawdopodobnie mm (np. 2350 = 2350mm)
- Wartość < 100 przy głównym wymiarze mebla BEZ jednostki = prawdopodobnie cm
- Wartość z przecinkiem dziesiętnym (np. 2.35) = metry
- ZAWSZE szukaj jednostek przy liczbach: mm, cm, m

📐 WERYFIKACJA LOGICZNA (sprawdź przed zwróceniem!):
- Bok szafki NIE MOŻE być szerszy niż cała szafka
- Półka musi być WĘŻSZA od szerokości wewnętrznej (S - 2×18mm)
- Głębokość szafki dolnej: 450-600mm (typowo 510mm)
- Głębokość szafki górnej: 280-400mm (typowo 340mm)
- Wysokość frontu NIE MOŻE być większa niż wysokość korpusu
- Front musi być minimalnie węższy niż otwór (zazwyczaj o 3mm)

⚠️ RED FLAGS - wymiary wymagające weryfikacji:
- element < 50mm (za mały - prawdopodobnie błąd jednostki)
- element > 2500mm (sprawdź czy to nie cm zamiast mm)
- bok szafki szerszy niż wysokość (nietypowe dla szafek stojących)
- półka szersza niż szafka (niemożliwe!)

${dimensionRulesSection}`;
  }

  try {
    console.log('Calling Gemini API (REST)...');
    console.log('Image mime type:', mimeType);
    console.log('Image base64 length:', imageBase64.length);

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: cleanBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1, // Lower temperature to be more deterministic
        maxOutputTokens: 32768, // Increased for complex responses
      },
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error response:', errorData);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Gemini response:', JSON.stringify(data, null, 2));

    // Extract text from response
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    console.log('Raw text:', text);

    // Try to extract JSON from various formats
    let jsonText = text;

    // Try markdown code block first
    const markdownMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    if (markdownMatch) {
      jsonText = markdownMatch[1];
    } else {
      // Try to find array directly
      const arrayMatch = text.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        jsonText = arrayMatch[0];
      }
    }

    // Sanitize JSON text - fix common mathematical expressions AI might leave
    // Looks for patterns like: "key": 500-36, or "key": 500 - 36
    // We will replace them with calculated values.
    console.log('Pre-sanitized JSON:', jsonText);

    jsonText = jsonText.replace(/:\s*"?(\d+)\s*([-+])\s*(\d+)"?/g, (match: string, n1: string, op: string, n2: string) => {
      const val1 = parseInt(n1);
      const val2 = parseInt(n2);
      const result = op === '-' ? val1 - val2 : val1 + val2;
      console.log(`Fixing math in JSON: ${n1} ${op} ${n2} = ${result}`);
      return `: ${result}`;
    });

    console.log('Final JSON text:', jsonText);

    try {
      const parsed = JSON.parse(jsonText.trim());
      console.log('Parsed items count:', parsed.length);
      return parsed;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw text was:', text);
      return [];
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    throw error;
  }
}
