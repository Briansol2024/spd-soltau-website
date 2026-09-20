# Insta-Kit: Overlays für Reels und Stories

Fertige Einblendungen im Design der neuen Website (Schrift TheSans SPD, Rot/Schwarz/Weiß), Hochkant 1080 × 1920, 30 Bilder/s.
Liegen in `video/insta/out/`, jeweils in zwei Fassungen:

| Datei | Wofür |
|---|---|
| `…-gruen.mp4` | **CapCut am Handy und PC**, Instagram-Editor, Canva: über das Video legen, Grün per „Chroma-Key“ entfernen |
| `…-alpha.mov` | **DaVinci Resolve, Premiere, Final Cut, CapCut am PC**: echte Transparenz (ProRes 4444), kein Keying nötig |

## Was drin ist

- **intro** (4 s) – „Moin, Soltau!“ mit Buchstaben-Animation, darunter „Aus Liebe zu Soltau“, blendet sich selbst aus
- **outro** (6 s, grün/alpha) – Logo, „Aus Liebe zu Soltau“, spd-soltau.de, @spd_soltau – für über das letzte Bild
- **outro-rot.mp4** (6 s, deckend rot) – Schlusskarte als eigene Szene ans Ende schneiden
- **binde-‹name›** (6 s) – Bauchbinde unten links: Name (rot) + Rolle (schwarz); fährt rein, bleibt 4 s, fährt raus – für Vorstand und alle Gewählten
- **wort-‹text›-links / -rechts** (3 s) – große Wörter neben der Person („Neue Website“, „Ab Dienstag 18 Uhr“, „Mitglieder-App“, „Jetzt mitreden“ …). *links* = Text links, du stehst rechts; *rechts* = umgekehrt (lässt rechts Platz für die Instagram-Symbole)

## Neue Bausteine (Werkstatt in der App)

- **foto** – Polaroid-Karte neben der Person, leicht gedreht, schwebt: Foto aus dem Material des Projekts, Bildunterschrift, links/rechts, oben/mitte
- **riesen** – Riesentitel, ein Wort bildschirmfüllend: in CapCut **hinter die Person** legen (Video → Kopie als Überlagerung → Hintergrund entfernen → Titel-Overlay dazwischen). Auf Grün deckend gerendert – die Durchsicht stellst du in CapCut über „Deckkraft“ (70–80 %) ein
- **schild** – Datenschild mit Linie und Punkt, zum **Anheften an ein Gebäude**: siehe unten „Anheften (Tracking)“
- **liste** mit Art **Fokus** – alle Punkte stehen unscharf da, einer nach dem anderen wird scharf und bekommt den Rahmen; die Zeit verteilt sich auf die Clip-Länge (Sekunden in der Werkstatt hochsetzen bei vielen Punkten)

## Anheften (Tracking): Schrift klebt am Gebäude, obwohl die Kamera sich bewegt

1. Drehen: langsam und gleichmäßig (Gimbal, oder mit gebeugten Knien gehen), das Gebäude bleibt im Bild, eine markante Stelle (Fensterecke, Schild) muss die ganze Zeit sichtbar sein.
2. CapCut: Video in die Hauptspur → **Überlagerung hinzufügen** → `schild-…-gruen.mp4` → **Chroma-Key** wie gewohnt.
3. Überlagerung antippen → **Tracking** (bei manchen Versionen „Verfolgen“ / „Bewegungsverfolgung“) → den Rahmen auf die markante Stelle am Gebäude ziehen → **Start**. CapCut rechnet den Weg aus, das ganze Overlay wandert mit.
4. Im ersten Bild die Überlagerung so verschieben und skalieren, dass der **rote Punkt** auf der Stelle sitzt – die Karte hängt dann daran und bleibt beim Schwenk am Gebäude.
5. Falls die Tracking-Funktion nur für Text und Sticker angeboten wird: Karte als Text-Sticker nachbauen oder die Windows-Version nehmen – dort heißt es „Bewegungsverfolgung“ und geht mit jeder Überlagerung.

## Animationsarten

Jeder Baustein kann auf fünf Arten ins Bild kommen – in der App unter „Baustein bauen“ per Chip vergleichen, Claude wählt sie im Skript mit (`anim`):

| `anim` | Wirkung | Passt zu |
|---|---|---|
| `pop` (Standard) | springt mit kleinem Überschwung rein | Energie, Betonung |
| `wisch` | wischt von der Seite ins Bild | Bewegung im Bild, Schnittwechsel |
| `weich` | blendet weich ein, leicht unscharf → scharf | ruhige, seriöse Aussagen |
| `fall` | fällt von oben und wippt nach | eine Zahl, ein Ergebnis |
| `tipp` | Buchstabe für Buchstabe mit Cursor | Stichworte, Listen, Adressen |

Direkt auf der Bühne: `stage.html?clip=gross&text=…&anim=weich`.

## So geht's in CapCut (Handy)

1. Eigenes Video in die Zeitleiste, dann **Overlay → Overlay hinzufügen** → den `…-gruen.mp4`-Clip wählen.
2. Overlay antippen → **Chroma-Key** → Farbwähler auf das Grün setzen → „Intensität“ hochziehen, bis alles Grün weg ist (meist 60–80), „Schatten“ ganz runter.
3. Overlay so ziehen, dass es das ganze Bild füllt (Zwei-Finger-Zoom), und auf der Zeitleiste an die richtige Stelle schieben.
4. **Wörter hinter dir statt vor dir:** eigenes Video duplizieren → obere Kopie: **Freistellen → Hintergrund entfernen** → das Wort-Overlay zwischen die beiden Videospuren legen.
5. Untertitel: **Text → Automatische Untertitel** – die meisten schauen ohne Ton.
6. Alles einmal als **Vorlage speichern**, dann dauert das nächste Video zehn Minuten.

Tipp für den Dreh: Handy hochkant auf Stativ, du stehst auf einer Bildseite, die andere bleibt frei für die Wörter. Beim Sprechen an der Stelle,
wo das Wort kommen soll, kurz Pause oder eine Geste – dann sitzt der Schnitt.

## Neue Clips machen

Website einmal bauen (`node build.mjs`, wegen des Logos), dann:

    node video/insta/render.mjs                                 # alle Clips neu
    node video/insta/render.mjs intro outro                     # nur diese
    node video/insta/render.mjs binde "Max Mustermann" "Beisitzer"
    node video/insta/render.mjs wort "Sommerfest|#12. Juli" rechts

Wort-Popper: Zeilen mit `|` trennen. Am Zeilenanfang `*` = rot, `#` = weiße Schrift im roten Kasten, `-` = mittelgroß, `_` = klein (Vorzeile).
Wer wo mit welcher Rolle eine Bauchbinde bekommt, steht in `render.mjs` (`BINDEN`), die fertigen Wörter in `WORTE`.
Bühne und Animationen: `stage.html` (reines HTML/CSS – neue Clip-Arten kommen dort dazu).
