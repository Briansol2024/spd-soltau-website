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
| Mitgliederbereich (`/mitglieder/`): Konten, Zu-/Absagen, Helferlisten, Fahrgemeinschaften, Umfragen, Dokumente, Ratsvorbereitung, Verzeichnis/Profile, Push, „Wer wird benachrichtigt?“, „Wer darf was?“ | Wix-Mitglieder + CMS-Sammlungen (`Zusagen`, `Helferlisten`, `Helfer`, `Fahrgemeinschaften`, `Umfragen`, `UmfragenOeffentlich`, `Stimmen`, `Dokumente`, `Ratsvorbereitung`, `Profile`, `PushSubscriptions`, `Benachrichtigungen`, `Aktionen`, `AppMitglieder`) | in der App; Dashboard → CMS zum Nachsehen |
| Kontakt- und Mitmachen-Formular | CMS-Sammlung `Anfragen` | Push an den Vorstand, „Erledigt“ in der App |
| Kalender-Abo (`assets/termine.ics`, intern mit Geheimnis) | aus den Wix-Events beim Bauen | automatisch |
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

**Vorschau ohne Konto:** `/mitglieder/?demo` zeigt den kompletten Mitgliederbereich mit Beispieldaten (nichts wird gespeichert).

**Bereiche nach der Anmeldung:** Start (Überblick) · Termine (Zu-/Absage mit Grund, Helferlisten mit Schichten, Fahrgemeinschaften, Kalender-Abo) ·
Umfragen (intern oder öffentlich als „Umfrage der Woche“ auf der Startseite, Auswertung intern) · Dokumente (Protokolle, Anträge – per Link) ·
Rat (Tagesordnung mit Einordnung der Fraktion) · Mitglieder (Verzeichnis mit freiwilligen Kontaktdaten, Geburtstage, Jubiläen) · Profil (Angaben, Push, App) ·
Vorstand (Eingang, Wer wird benachrichtigt?, Wer darf was?, Nachricht an alle, WhatsApp-Gruppen).

**Rechte:** Standard = der gesamte Vorstand darf alles. Unter Vorstand → „Wer darf was?“ legt man fest, **wer zum Vorstand gehört** und wer je Recht
(Beiträge schreiben, Termine anlegen, Umfragen, Helferlisten, Dokumente, Ratsvorbereitung, Nachrichten, Eingang, Verwaltung) etwas darf – alles in der App,
nichts im Wix-Dashboard. Der Push-Dienst spiegelt den Vorstand in die Wix-Rolle „Vorstandsmitglied“ und prüft die Rechte ebenfalls (Einträge ohne Recht werden
entfernt). Startvorstand beim allerersten Lauf: `VORSTAND_EMAILS` in `.env` (wird automatisch freigeschaltet und als Vorstand gesetzt). Logik: `src/lib/rights.mjs`.

**Beiträge und Termine aus der App:** Wer das Recht hat, schreibt unter „Beiträge“ einen Beitrag (Überschrift, Anriss, Text, Kategorie, Titelbild) oder legt unter
„Termine“ einen Termin an bzw. sagt einen ab. Der Push-Dienst trägt das innerhalb weniger Minuten bei Wix Blog bzw. Wix Events ein; die Website übernimmt es beim
nächsten Bau (alle 30 Minuten).

**Eingang:** Registrierungs-, Buchungs- und Kontaktanfragen landen als persönliche Kopie bei jeder zuständigen Person (Sammlung `Eingang`, nur die jeweilige
Person kann ihre Einträge lesen) – zusätzlich zur Push-Nachricht. Freischalten/Annehmen/Erledigen direkt dort.

**WhatsApp:** In Gruppen posten kann die App nicht automatisch (WhatsApp hat dafür keine Schnittstelle). Stattdessen: „WhatsApp“-Knopf an Terminen, Helferlisten,
Umfragen, Dokumenten und Nachrichten – öffnet WhatsApp mit dem fertigen Text, Gruppe auswählen, abschicken. Einladungslinks der Gruppen pflegt der Vorstand
unter „WhatsApp-Gruppen“, Mitglieder sehen sie auf der Startseite des Mitgliederbereichs. Auf der öffentlichen Terminseite gibt es „Per WhatsApp teilen“ je Termin.

## Veröffentlichen auf GitHub Pages (Testphase, mit Passwort)

Einmalig: GitHub-Konto anlegen, dann in einem Terminal `winget install --id GitHub.cli`, neues Fenster, `gh auth login` (Browser-Anmeldung).
Danach `tools\GitHub Pages einrichten.cmd` doppelklicken – legt das Repository an, überträgt alle Einstellungen aus `.env` als Variablen/Secrets,
schaltet Pages ein und startet den Bau. Die alte Wix-Seite bleibt unter spd-soltau.de unverändert online.

**Stand 18.09.2026:** Die Testversion läuft unter **https://neu.spd-soltau.de** (GitHub Pages, eigenes Zertifikat, Passwort wie bisher).
Dafür: CNAME `neu` → `briansol2024.github.io` in den DNS-Einträgen bei Wix, Repository-Variable `CNAME=neu.spd-soltau.de`, `BASE_PATH` leer,
Umleitungs-URI `https://neu.spd-soltau.de/mitglieder/` in den Headless-Einstellungen. Die Adresse `briansol2024.github.io/spd-soltau-website` leitet dorthin um.
Go-live später: `www` bei Wix genauso auf GitHub Pages zeigen lassen, `CNAME=www.spd-soltau.de`, Passwort und `NOINDEX` entfernen.

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

- Dokumente werden als Link eingestellt (Datei vorher in der Wix-Medienverwaltung/Dateifreigabe oder einer Cloud ablegen). Direkter Upload aus der App wäre mit einem kleinen Server-Teil nachrüstbar.
- Antwort an Anfragende (Buchung bestätigt/abgelehnt) schickt der Vorstand noch selbst – automatische E-Mails wären über Wix „Ausgelöste E-Mails“ möglich.
- Umfrage zählt nur lokal im Browser. Geplant: Zählung über eine CMS-Sammlung.
- Impressum/Datenschutz mit den Mustern des SPD-Landesverbands abgleichen.
- „Soltau in Zahlen“ (Startseite) prüfen/aktualisieren: Werte stehen in `build.mjs` unter `facts`.
