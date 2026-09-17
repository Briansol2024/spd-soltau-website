# Website SPD Ortsverein Soltau

Die Website ist eine **statisch generierte Seite** im Design des Referenz-Entwurfs D.
Inhalte (Beiträge, Termine, Team, Vorstand) kommen aus dem **Wix-Backend** (Headless) und
werden beim Bauen der Seite abgeholt. Ihr pflegt alles weiter im gewohnten Wix-Dashboard.

## So fließen die Inhalte

| Auf der Website | Woher | Wo pflegen |
|---|---|---|
| Aktuelles / Beiträge | Wix Blog | Dashboard → Blog |
| Termine | Wix Events | Dashboard → Veranstaltungen |
| Vorstand | CMS-Sammlung „Vorstand“ (ID `Team`) | Dashboard → CMS |
| Team (27 Personen), „Wer kümmert sich um was?“ | CMS-Sammlung „Kandidat*innen zur Stadtratswahl“ | Dashboard → CMS |
| Ratsfraktion | CMS-Sammlung „Stadtrat“ | Dashboard → CMS |
| 10-Punkte-Plan, Texte der festen Seiten | im Code (`src/data-fallback.mjs`, `src/templates.mjs`) | hier im Projekt |

Die Seite wird **alle 30 Minuten** automatisch neu gebaut (GitHub Actions). Neue Beiträge oder Termine
erscheinen also spätestens nach einer halben Stunde – oder sofort, wenn man den Workflow von Hand startet.

**Tipp für das CMS „Kandidat*innen“:** Ein Feld `Themen` (Tags/Mehrfachauswahl) mit Werten wie
„Kita & Schule“, „Ortschaften“, „Verkehr & Bahn“ steuert die Zuordnung in „Wer kümmert sich um was?“.
Solange das Feld fehlt, gilt die Beispielzuordnung aus `src/data-fallback.mjs`.
Felder, die die Seite versteht: `name`, `beruf`, `rolle`/`position`, `beschreibung`/`kurztext`, `themen`, `listenplatz`, `foto`/`photo`.

## Projektstruktur

```
build.mjs            Baut alle Seiten nach dist/ (holt Inhalte von Wix, wenn WIX_CLIENT_ID gesetzt ist)
protect.mjs          Testphase: verschlüsselt dist/ mit Passwort nach dist-protected/
serve.mjs            Lokaler Vorschau-Server
src/templates.mjs    Seitenvorlagen (HTML)
src/render.mjs       Bausteine (Karten, Termine, Personen …) – laufen im Build und im Browser
src/site.js          Interaktion und Animationen im Browser
src/styles.css       Gestaltung (Entwurf D)
src/data-fallback.mjs  Beispiel-/Ersatzinhalte und feste Texte (10-Punkte-Plan, Themenreihenfolge)
src/lib/wix.mjs      Anbindung an Wix (Blog, Events, CMS) inkl. Rich-Text- und Bild-Umwandlung
.github/workflows/deploy.yml   Automatischer Bau + Veröffentlichung auf GitHub Pages
```

## Lokal bauen und ansehen

```bash
npm install
npm run dev            # baut nach dist/ und startet http://localhost:8080
```

Mit echten Wix-Inhalten:

```bash
WIX_CLIENT_ID=... node build.mjs
```

Passwortgeschützte Testversion:

```bash
PREVIEW_PASSWORD=geheim npm run build:preview
npm run serve:protected      # http://localhost:8081
```

## Einstellungen für den automatischen Bau (GitHub → Settings → Secrets and variables → Actions)

| Name | Typ | Bedeutung |
|---|---|---|
| `WIX_CLIENT_ID` | Variable | Client-ID der Wix-Headless-OAuth-App (Dashboard → Einstellungen → Headless-Einstellungen) |
| `SITE_URL` | Variable | Öffentliche Adresse, z. B. `https://www.spd-soltau.de` |
| `BASE_PATH` | Variable | Nur ohne eigene Domain: `/spd-soltau-website` (Unterpfad bei GitHub Pages) |
| `CNAME` | Variable | Eigene Domain für GitHub Pages, z. B. `www.spd-soltau.de` |
| `HERO_IMAGE` | Variable | URL des Fotos im Hero (z. B. das Luftbild aus der Wix-Medienverwaltung) |
| `SITE_EMAIL` | Variable | Kontaktadresse für Impressum/Kontakt |
| `NOINDEX` | Variable | `1` in der Testphase (Suchmaschinen aussperren), sonst leer |
| `PREVIEW_PASSWORD` | Secret | Gesetzt = Seite ist passwortgeschützt (Testphase). Löschen = Seite ist offen. |

## Go-live (wenn ihr zufrieden seid)

1. `PREVIEW_PASSWORD` löschen, `NOINDEX` leeren, `SITE_URL`/`CNAME` setzen.
2. Bei Wix unter *Einstellungen → Domains* die DNS-Einträge auf GitHub Pages umstellen
   (CNAME `www` → `<github-benutzer>.github.io`, A-Records für die Root-Domain).
   E-Mail-Einträge (MX) unverändert lassen.
3. In GitHub unter *Settings → Pages* die Domain eintragen und HTTPS erzwingen.

Die Wix-Editor-Seite bleibt unangetastet bestehen und ist weiterhin unter der wixsite-Adresse erreichbar.

## Noch offen (bewusst für später)

- Formulare senden noch nicht (zeigen nur die Bestätigung). Geplant: Übergabe an Wix Forms/Posteingang.
- Umfrage zählt nur lokal im Browser. Geplant: Zählung über eine CMS-Sammlung.
- Instagram-Kacheln sind Platzhalter. Geplant: Abruf über die Meta-API (Business-/Creator-Konto nötig).
- Impressum/Datenschutz mit den Mustern des SPD-Landesverbands abgleichen.
