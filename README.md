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
| Ratsfraktion | CMS-Sammlung „Stadtrat“ (ID `Team1`) | Dashboard → CMS |
| Instagram-Kacheln | Zwischenspeicher der Wix-Instagram-App (`@vanyadoing/instagram/ig-media`) – Bilder werden beim Bauen auf den eigenen Host kopiert | Instagram posten, Wix-App bleibt verbunden |
| 10-Punkte-Plan, Texte der festen Seiten | im Code (`src/data-fallback.mjs`, `src/templates.mjs`) | hier im Projekt |
| Wahlergebnis 2026 (Seite „Unsere 11 im Stadtrat“), Stichwahl-Aufruf | `src/data-wahl2026.mjs` – Fotos/Berufe kommen automatisch aus der Kandidat*innen-Sammlung | hier im Projekt |
| Mitgliederbereich (`/mitglieder/`): Konten, Zu-/Absagen, Push-Abos, „Wer wird benachrichtigt?“ | Wix-Mitglieder + CMS-Sammlungen `Zusagen`, `PushSubscriptions`, `Benachrichtigungen`, `Aktionen`, `AppMitglieder` | Dashboard → Kunden & Leads bzw. CMS; Freigaben direkt in der App |
| Buchungsanfragen Roter Bahnhof (`/roter-bahnhof/`) | CMS-Sammlung `Buchungen` | Push an den Vorstand, Annehmen/Ablehnen in der App |

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
src/fonts/           SPD-Hausschrift TheSans SPD (Regular, Bold, Extrabold, Versal) – aus eurer Wix-Medienverwaltung, selbst gehostet
src/images/          Logo (rot und weiß) – Hero-Standbild und Instagram-Bilder werden beim Bauen erzeugt
src/data-fallback.mjs  Beispiel-/Ersatzinhalte und feste Texte (10-Punkte-Plan, Themenreihenfolge)
src/lib/wix.mjs      Anbindung an Wix (Blog, Events, CMS) inkl. Rich-Text- und Bild-Umwandlung
src/members.js       Mitgliederbereich (Anmeldung/Registrierung über Wix, Zu-/Absagen, Push, Vorstands-Werkzeuge) → gebündelt nach assets/mitglieder.js
src/sw.js            Service Worker (App-Installation, Offline-Grundgerüst, Push-Anzeige, Eingang für den Vorstand)
push/                Push-Dienst: send.mjs (Versand + Vorstands-Aktionen), setup.mjs (Einrichtung), Aufgabenplanung – siehe push/README.md
.github/workflows/deploy.yml   Automatischer Bau + Veröffentlichung auf GitHub Pages
.github/workflows/push.yml     Push-Dienst alle 5 Minuten (sobald das Projekt auf GitHub liegt)
```

## App und Mitgliederbereich

Die Website ist eine **installierbare App** (PWA): „Zum Home-Bildschirm“ auf dem iPhone bzw. „App installieren“ in Chrome/Android.
Unter `/mitglieder/` melden sich Mitglieder mit ihrem Wix-Mitgliederkonto an (Registrierung mit E-Mail-Bestätigung, Freigabe durch den Vorstand),
sagen zu Terminen zu oder ab (mit Grund), aktivieren Push-Benachrichtigungen (Aktuelles, Termine, Mitglieder-Infos) und der Vorstand
legt fest, **wer über Registrierungs- und Buchungsanfragen benachrichtigt wird**, bearbeitet Anfragen im „Eingang“ und schickt Nachrichten an alle.
Alle Daten bleiben bei Wix. Voraussetzungen: Wix → Headless-Einstellungen → erlaubte Umleitungs-URIs (`…/mitglieder/` je Adresse, ist eingetragen)
und der Push-Dienst (`push/README.md`).

## Vorschau über Tailscale (Testphase)

`Vorschau starten.cmd` baut die Seite mit aktuellen Wix-Inhalten, verschlüsselt sie mit dem Passwort aus `.env`
und startet den Server auf Port 8081. Tailscale Funnel leitet **https://tvdash.tail37ded4.ts.net:8443** dorthin
(öffentlich erreichbar, Passwort nötig). Abschalten: `tailscale funnel --https=8443 off`.

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
| `VAPID_PUBLIC_KEY` | Variable | Öffentlicher Push-Schlüssel (aus `.env`, von `push/setup.mjs` erzeugt) |
| `VAPID_PRIVATE_KEY`, `WIX_API_KEY` | Secret | Für den Push-Dienst (`push.yml`) |
| `WIX_SITE_ID`, `PUSH_SITE_URL` | Variable | Für den Push-Dienst |

## Go-live (wenn ihr zufrieden seid)

1. `PREVIEW_PASSWORD` löschen, `NOINDEX` leeren, `SITE_URL`/`CNAME` setzen.
2. Bei Wix unter *Einstellungen → Domains* die DNS-Einträge auf GitHub Pages umstellen
   (CNAME `www` → `<github-benutzer>.github.io`, A-Records für die Root-Domain).
   E-Mail-Einträge (MX) unverändert lassen.
3. In GitHub unter *Settings → Pages* die Domain eintragen und HTTPS erzwingen.

Die Wix-Editor-Seite bleibt unangetastet bestehen und ist weiterhin unter der wixsite-Adresse erreichbar.

## Zeitgesteuert

- Der Aufruf zur Landrats-Stichwahl (Sebastian Zinke) erscheint automatisch nur bis einschließlich 27.09.2026 (`STICHWAHL.datum`).

## Noch offen (bewusst für später)

- Kontakt- und Mitmachen-Formular senden noch nicht (zeigen nur die Bestätigung). Die Buchungsanfrage funktioniert bereits (CMS `Buchungen`); Kontakt/Mitmachen können genauso angeschlossen werden.
- Antwort an Anfragende (Buchung bestätigt/abgelehnt) schickt der Vorstand noch selbst – automatische E-Mails wären über Wix „Ausgelöste E-Mails“ möglich.
- Umfrage zählt nur lokal im Browser. Geplant: Zählung über eine CMS-Sammlung.
- Impressum/Datenschutz mit den Mustern des SPD-Landesverbands abgleichen.
- „Soltau in Zahlen“ (Startseite) prüfen/aktualisieren: Werte stehen in `build.mjs` unter `facts`.
