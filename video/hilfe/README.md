# Hilfevideos

Kurze Anleitungsvideos für den Mitgliederbereich – je Thema (`src/lib/hilfe.mjs`) und Plattform (Android, iPhone/iPad, Windows, Mac)
eins. Ohne Sprecherstimme: Die Schritte laufen als Untertitel mit, dazu ruhige Hintergrundmusik. Das Demo-Konto heißt Max Mustermann
und ist ein normales Mitglied (`?demo&video`).

    node build.mjs                    # Website bauen
    node serve.mjs                    # Server auf http://localhost:8080 (in einem zweiten Fenster)
    python video/hilfe/music.py       # Hintergrundmusik erzeugen (einmalig, video/hilfe/music.wav)
    python video/hilfe/posters.py     # Videocover mit großer Nummer → src/hilfe/NN-thema.jpg (+ -hoch.jpg)
    node video/hilfe/record.mjs       # Aufnahmen → video/hilfe/tmp/*.webm  (auch: record.mjs 05 ios, FORCE=1 …)
    python video/hilfe/compose.py     # Musik dazu, H.264 → src/hilfe/NN-thema-plattform.mp4
    node build.mjs                    # Videos landen unter assets/hilfe/

`stage.html` ist die Bühne: Geräterahmen, Untertitel, Titel-/Schlusskarte, Tipp- und Mausanzeige sowie schematisch nachgebaute
Systemdialoge (Chrome-Menü, iOS-Teilen, Windows-Installieren, macOS-Menüleiste, Benachrichtigungs-Abfragen, Kalender-Abos).
Die App läuft darin im iframe (localhost). `record.mjs` enthält je Thema das Drehbuch (Aktionen zu den Schritten); die Texte
kommen ausschließlich aus `src/lib/hilfe.mjs`, damit Video und Hilfeseite immer dasselbe sagen.

Ändert sich ein Thema: Text in `hilfe.mjs` anpassen, ggf. Drehbuch in `record.mjs`, dann `FORCE=1 node video/hilfe/record.mjs 05`
und `FORCE=1 python video/hilfe/compose.py` – die Nummerierung bleibt stabil.
