# Drehplan „Was ist unabhängiger?“ – Overlays zum Skript

Clips liegen in `video/insta/out/unabhaengig-NN-….` (grün = CapCut Chroma-Key, alpha = Resolve/Premiere/CapCut PC).
Reihenfolge = Skript. Jeder Clip hat eine Ein-Animation, hält und bleibt stehen – in CapCut einfach kürzen oder verlängern.
Empfehlung: Du stehst rechts im Bild, die Overlays füllen die Mitte/links; bei den Listen (06, 08, 15) und der Frage (01) kurz Pause machen, bis alle Punkte stehen.

| Nr. | Gesprochener Satz (Einsatz) | Overlay | Sek. |
|---|---|---|---|
| 01 | „Was ist eigentlich unabhängiger: kein Parteibuch zu haben oder den Mut, der eigenen Partei zu widersprechen?“ | **frage** – A/B-Karten, „oder“ dazwischen | 7 |
| 02 | „… einen Satz immer und immer wieder gehört: ‚Wir brauchen jemanden, der unabhängig ist.‘“ | **zitat** – Zitatkarte, „unabhängig“ rot | 5 |
| 03 | „Und mit unabhängig war meistens gemeint: parteilos.“ | **gross** – „Unabhängig = parteilos?“ | 4 |
| 04 | „Glauben wir wirklich, ich gebe … meine Meinung ab, bekomme ein Parteibuch und …“ | **gross** – „Meinung abgeben, Parteibuch holen – und dann?“ | 5 |
| 05 | „So funktionieren Parteien nicht.“ | **stempel** – „SO NICHT“ knallt rein | 4 |
| 06 | „Wir diskutieren. Wir streiten. Wir widersprechen uns.“ | **liste** – drei Punkte, je Satz einer | 6 |
| 07 | „Und genau das ist doch Demokratie.“ | **gross** – „Das ist Demokratie.“ (extra groß) | 4 |
| 08 | „Menschen, die Plakate aufhängen, Anträge schreiben, auf Parteitagen diskutieren, Verantwortung übernehmen.“ | **liste** – vier Punkte, je Halbsatz einer | 7 |
| 09 | „Das finde ich absurd.“ | **stempel** – „ABSURD“ | 4 |
| 10 | „Kein Parteibuch zu haben bedeutet nicht, keine politische Haltung zu haben.“ | **gross** – „Kein Parteibuch ≠ keine Haltung“ | 5 |
| 11 | „… als sei ein fehlendes Parteibuch plötzlich ein politisches Reinheitszertifikat.“ | **stempel** – „Reinheitszertifikat?“ (schwarz) | 4 |
| 12 | „Dann wird das Parteibuch zur Seite gelegt und die Akte der Verwaltung nach vorne.“ | **buch** – Parteibuch fliegt weg, Akte kommt nach vorn | 6 |
| 13 | „Ein Landrat ist nicht Landrat der SPD. Nicht der CDU. Nicht der Parteilosen. Er ist Landrat für alle Menschen im Heidekreis.“ | **gegen** – drei Zeilen werden durchgestrichen, die vierte bleibt rot | 7 |
| 14 | „Und genau das erwarte ich auch von Sebastian Zinke.“ | **aufruf** – Foto, 27. September, Name | 6 |
| 15 | „Wer kann Menschen zusammenbringen? Wer kann den eigenen Leuten widersprechen? Wer übernimmt Verantwortung? Wem traue ich acht Jahre zu?“ | **liste** – vier Fragen mit „?“ | 8 |
| 16 | „Denn parteilos kann man auf einen Wahlzettel schreiben. Unabhängigkeit muss man beweisen.“ | **zettel** – Stimmzettel, Handschrift, dann der Satz | 6 |
| 17 | „Ein Parteibuch sagt dir, welcher Partei ein Mensch angehört. Es sagt dir nicht, wem sein Gewissen gehört.“ | **zitat** – Schlusszitat, Ende rot | 7 |
| 18 | Abspann | **aufruf** – „27. September · Stichwahl“ | 6 |

Dazu aus dem Grundkit: Bauchbinde `binde-brian-weber` am Anfang, `outro` am Ende.

Texte ändern: `video/insta/skripte/unabhaengig.json` (Zeilen mit `|` trennen, `*rot*` für rote Wörter), dann
`node video/insta/render.mjs skript unabhaengig`. Für das nächste Video: neue JSON-Datei mit denselben Bausteinen
(frage, zitat, gross, stempel, liste, gegen, buch, zettel, aufruf, wort, binde).
