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
