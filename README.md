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
push/                Push-Dienst: send.mjs (Versand + Vorstands-Aktionen), setup.mjs (Einrichtung) – läuft auf GitHub Actions, siehe push/README.md
.github/workflows/deploy.yml   Automatischer Bau + Veröffentlichung auf GitHub Pages
.github/workflows/push.yml     Push-Dienst alle 5 Minuten auf GitHub Actions (seit 19.09.2026, kein PC mehr nötig)
```

## App und Mitgliederbereich

Die Website ist eine **installierbare App** (PWA): „Zum Home-Bildschirm“ auf dem iPhone bzw. „App installieren“ in Chrome/Android.
Unter `/mitglieder/` melden sich Mitglieder mit ihrem Wix-Mitgliederkonto an (Registrierung mit E-Mail-Bestätigung, Freigabe durch den Vorstand),
sagen zu Terminen zu oder ab (mit Grund), aktivieren Push-Benachrichtigungen (Aktuelles, Termine, Mitglieder-Infos) und der Vorstand
legt fest, **wer über Registrierungs- und Buchungsanfragen benachrichtigt wird**, bearbeitet Anfragen im „Eingang“ und schickt Nachrichten an alle.
Alle Daten bleiben bei Wix. Voraussetzungen: Wix → Headless-Einstellungen → erlaubte Umleitungs-URIs (`…/mitglieder/` je Adresse, ist eingetragen)
und der Push-Dienst (`push/README.md`).

**Vorschau ohne Konto:** `/mitglieder/?demo` zeigt den kompletten Mitgliederbereich mit Beispieldaten (nichts wird gespeichert).

**Website und App sind getrennt (Konzept B):** Der Mitgliederbereich (`/mitglieder/`) hat einen eigenen schwarzen App-Kopf (SPD-Kachel,
„Mitgliederbereich“, Globus-Knopf **Website**, Initialen → Profil) statt des roten Website-Kopfs, und einen schlanken Fuß (Impressum, Datenschutz).
Am Handy eine feste App-Leiste unten – Start · Termine · Umfragen · Vorstand (mit Zähler offener Anfragen; ohne Vorstandsrechte: Dokumente bzw. Profil) ·
Mehr; „Mehr“ öffnet ein Blatt mit allen Bereichen (*Für alle / Persönlich / Vorstand*) plus Abmelden. Am PC (ab 900 px) dieselbe Liste als
Seitenleiste links. Die Website enthält keinen App-Bezug: rote Kopfzeile, Burger-Menü ohne Eintrag „Mitgliederbereich“, nur das Personen-Symbol
führt zur Anmeldung (angemeldet zeigt es die Initialen).

**Website aus der App heraus:** Der Globus öffnet die Website in derselben Ansicht, oben mit einem schwarzen Streifen „← Zurück zum
Mitgliederbereich“ (Klasse `from-app`, gemerkt in `sessionStorage`; in der installierten App auf allen Website-Seiten, solange man angemeldet ist).
**Installierte App (PWA):** `start_url` ist die Website-Startseite; ist jemand angemeldet, leitet ein Inline-Skript beim Start sofort in den
Mitgliederbereich (einmal je Sitzung). Besucher ohne Konto sehen in der App einfach die Website und kommen über das Personen-Symbol zur Anmeldung.
Zum Ausprobieren im Browser: `?app=1`.

**Website-Struktur (Wünsche Vorsitz, 18.09.2026):** Startseite = Hero („Aus Liebe zu Soltau“, „Moin!“, Textbox mit „Unsere 11 Gewählten“) →
Laufband (bis zur Stichwahl „Am 27.09. Zinke zum Landrat wählen!“, danach Termine; langsam) → Stichwahl-Abschnitt mit Foto (bis 27.09.) → „Was können wir für Sie tun?“ mit drei Kacheln
(Anliegen · Mitmachen · **„Ich will wissen, was im Rathaus läuft“** = Aus Rat & Rathaus, s. u.) → Soltau in Zahlen → Aktuelles → Instagram → Termine (schlank, nur öffentliche).

**Aus Rat & Rathaus (automatisch, `src/lib/stadt.mjs`):** Beim Bau (alle 30 Minuten) liest der Build die öffentlichen Seiten der Stadt Soltau – Bürgerinformationssystem
(nächste Sitzungen von Rat und Ausschüssen mit Ort/Uhrzeit; Link zur Tagesordnung, sobald sie im Monatskalender veröffentlicht ist), soltau.de-Neuigkeiten (Titel, Datum,
Anrisssatz, Link; Stichwortfilter gegen Feste/Kino), Amtsblatt (Nummer, Datum, Themen, PDF), laufende Bauleitplanverfahren („Jetzt mitreden … bis <Frist>“) und Baustellen.
Keine KI, keine Schlüssel, keine Kosten – reiner Mustervergleich; amtliche Bekanntmachungen sind gemeinfrei, von Meldungen nur Überschrift + Anriss. Auf der Startseite ist es
die **dritte Bürger-Kachel** „Ich will wissen, was im Rathaus läuft“ (Variante P1, 19.09.): gleiche Form wie „Ich habe ein Anliegen“ / „Ich will vorbeikommen“, darin die drei
aktuellsten Punkte (Mitreden mit Frist, nächste Sitzung, Amtsblatt – `stadtKacheln(d.stadt, 3)`), „Alle Meldungen →“ und darunter eine Stand-Zeile. Die Punkte verlinken direkt
zur Stadt, Kopf und „Alle Meldungen“ zur Seite `/rat-und-rathaus/` (Mitreden-Streifen, drei Spalten Sitzungen / Rathaus / Amtsblatt + Baustellen, Quellenangaben). Fällt eine
Quelle aus, fehlt nur ihr Punkt; sind alle Quellen weg, gibt es wieder nur zwei Kacheln (`d.stadt = null`). **Jede Website-Seite endet gleich** (`pageEnd()` im
Layout): drei Kästen Vorstand · Ratsfraktion · Roter Bahnhof buchen, dann „Nichts verpassen“. Ortsverein und Fraktion nutzen dieselbe Vorlage
(`teamPage()`): Kopf → Zahlenband → Team nach Funktion sortiert (`byRole`, große Namen, quadratische Fotos) → zwei Kästen → Beiträge. Ziele als Karten mit
Piktogrammen (`zielCards`). Alle 27 Kandidat*innen stehen weiterhin unter „Unsere 11 im Stadtrat“.

**Hilfe & Anleitungen (`#hilfe`):** 13 nummerierte Themen für alle Mitglieder (01 Registrieren und Anmelden … 13 Zur Website und zurück), je Thema
ein kurzes Video für Android, iPhone/iPad, Windows und Mac – ohne Sprecherstimme, alle Schritte als Untertitel, mit fröhlicher Ukulele-Hintergrundmusik –
und darunter dieselben Schritte als Text. Erreichbar über „Mehr“ bzw. die Seitenleiste und ohne Anmeldung vom Anmeldebildschirm aus.
Vorstands-Werkzeuge (Termine anlegen, Rechte, Eingang …) sind bewusst nicht Teil der Videos. Quelle der Themen und Schritte: `src/lib/hilfe.mjs`;
Videos und Cover liegen in `src/hilfe/` (→ `assets/hilfe/`) und entstehen mit `video/hilfe/` (siehe dort: `record.mjs`, `compose.py`, `posters.py`, `music.py`).
Die Demo (`?demo`) heißt jetzt Max Mustermann; `?demo&mitglied` zeigt die Sicht eines normalen Mitglieds, `?demo&video` dasselbe ohne Vorschau-Hinweis (für die Aufnahmen).

**Bereiche nach der Anmeldung:** Start (Überblick mit Karten: Ratsarbeit, Jahresplan, Ideen) · Termine (Liste oder **Monatskalender** mit farbigen Punkten je
Termintyp – blau Öffentlich, schwarz Rat, rot Mitglieder, orange Fraktion, grau Vorstand; Zu-/Absage mit Grund, Helferlisten direkt am Termin, Fahrgemeinschaften,
Kalender-Abo, **Stammtisch-Umfrage** nur für Zusagen) · Umfragen · **Ideen** (ein Satz, 👍, Rückmeldung, „Als Antrag aufgreifen“) · Dokumente · **Sitzungen** (alle
Sitzungsarten mit Haltung/Argumenten/Redner/intern besprochen/Ergebnis je Punkt, Import aus dem Bürgerinformationssystem, **Sitzungsmodus**) · **Versammlungen**
(Tagesordnung, Anträge, „Ich bin da“, Abstimmung per Handy, Protokoll) · **Wahlkampf** (Straßenliste mit Fortschritt, Plakat-Standorte mit Foto) · **Jahresplan**
(Planungen aus Vorlagen, Aufgaben mit Zuständigkeit und Erinnerung) · **Wissen** (**Grundwissen für neue Ratsmitglieder** – Lernpfad in zehn Schritten mit Lesestand und Checkliste, `src/lib/grundwissen.mjs`; dazu die Suche über Dokumente, Sitzungen, Versammlungen, Beiträge, Anträge, Planungen) ·
**Ratsarbeit** (Fraktion: Aufgaben, Dokumente, **Anträge** mit Fraktions-Abstimmung, Druck/PDF und Übergabe an Beiträge) · Mitglieder · Profil · Vorstand als Kacheln
(**Anliegen & Anfragen** mit Zuständigkeit/Stand/Notizen, Nachricht, **Newsletter**, **Presse**, Jahresplan, Benachrichtigen, Gruppen, Rechte, Sichtbarkeit, WhatsApp,
**Stammtisch-Umfrage**). **Menü nach Rolle:** Für alle (Start, Termine, **Mitmachen** = Umfragen · Ideen · Versammlungen · Wahlkampf, **Dokumente & Wissen** = Dokumente · Grundwissen · Suche, Mitglieder) · Rat & Fraktion (Sitzungen – standardmäßig nur Gruppen Rat/Fraktion, per Sichtbarkeit änderbar –, Ratsarbeit) · Organisation (Vorstand, Jahresplan, Beiträge) · Persönlich (Profil, Hilfe). Sammel-Bereiche zeigen ihre Teile als Reiter über dem Inhalt (`HUBS` in `src/members.js`); alle alten Links gelten weiter. Alles nach demselben Muster – Liste → Karte → Blatt, große Knöpfe, wenige Worte. Code: `src/members.js` (Kern), `src/ratsarbeit.js`,
`src/vorstand.js`, `src/vorstand-mehr.js`, `src/bereiche.js`, `src/schluessel.js` (Geräteschlüssel für Fraktion und Vorstand).

**Anliegen & Anfragen (statt „Eingang“):** Der Push-Dienst legt für jede Registrierung, Buchung und Anfrage einen Vorgang an (Sammlung `Vorgaenge`, Inhalt mit dem
Vorstandsschlüssel verschlüsselt – lesbar nur auf Geräten von Vorstand/Verwaltern/Personen mit Recht „freigaben“). Zuständigkeit, Stand (offen · in Arbeit · beantwortet),
Notizen (verschlüsselt), Erinnerung nach sieben Tagen. Push-Nachrichten, die auf dem Gerät ankamen, erscheinen zusätzlich.

**Rechte (neu):** versammlung, wahlkampf, newsletter, presse, planung, statistik.

**Statistik ohne Cookies (Vorstand → Statistik):** `src/site.js` (und die Countdown-Seite) schreiben je Seitenaufruf einen Eintrag in `Seitenaufrufe` (Seite, Herkunft nur als Domain, Gerät, Sprache, Ladezeit, Einstieg ja/nein, App ja/nein – keine IP, keine Kennung); Klicks auf Instagram, Kalender-Abo, Mail/Telefon, Mitgliederbereich, Teilen, PDFs sowie Formulare, Umfrage-Stimmen und App-Installationen zählen als Ereignis. Der Push-Dienst (`statistik()` in `push/send.mjs`) verdichtet die Rohdaten alle 5 Minuten zu Tageswerten in `Statistik` (JSON je Tag) und löscht sie. Auswertung in `src/statistik.js`: Zeitraum 7/30/90 Tage/12 Monate, Aufrufe/Besuche/Seiten je Besuch/App/Ladezeit mit Vergleich zum Vorzeitraum, Verlauf, Seiten, Beiträge, Quellen, Ereignisse, Geräte, Sprachen, Uhrzeit, Wochentag, CSV-Export. Datenschutzerklärung Abschnitt 8. **Benachrichtigen (neu):** Thema „Neue Anträge und Ideen“ – wer prüft Anträge (Fraktionsvorsitz).

**E-Mail (Newsletter, Presse, Newsletter-Bestätigung):** der Push-Dienst verschickt über SMTP – `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` in `.env`
(`push/mail.mjs`). Ohne diese Werte bleiben Newsletter-/Presse-Aufträge mit Hinweis stehen. Abonnenten kommen über „Nichts verpassen“ (Website → Sammlung `Abonnenten`),
Bestätigung/Abmeldung über `/newsletter/?bestaetigen=…` bzw. `?abmelden=…` (Double-Opt-in).

**Mitgliederverzeichnis = Opt-in:** Im Verzeichnis steht nur, wer es unter Profil → „Was andere Mitglieder von dir sehen“ eingeschaltet hat
(`Profile.verzeichnisSichtbar`); der Vorstand steht immer drin (er steht auch auf der Website). Telefon, E-Mail und Geburtstag sind eigene Häkchen. Wer noch nicht
drinsteht, sieht auf Start und im Verzeichnis einen Hinweis.

**Ratsarbeit (`#ratsarbeit`, nur Gruppe Fraktion):** Der Working Space der Ratsfraktion – bewusst ohne Chats (die bleiben in WhatsApp) und so einfach wie möglich:
*Meine Aufgaben* (alles, was mir zugeteilt ist, nach Frist), *Alle Aufgaben der Fraktion* (nach Bereich oder nach Person) und fünf **Bereiche** – Fraktion/Rat plus die
Ausschüsse Stadtentwicklung, Soziales, Schule & Kultur, Wirtschaft – jeweils mit Aufgaben (abhaken per Kreis, Frist, überfällig rot, Erledigte einblendbar) und
Dokumenten (Datei hochladen bis 10 MB oder Link; Protokoll/Bericht/Vorlage/Antrag). Aufgabe und Dokument öffnen als Blatt (Was · Bereich · Wer · Bis wann · Notiz ·
„Per WhatsApp erinnern“ · Erledigt · Löschen). Am Handy 4. Reiter der App-Leiste (wenn keine Vorstandsrechte), sonst unter „Mehr“/Seitenleiste „Fraktion“; Zähler =
meine offenen Aufgaben; Karte auf Start. Sichtbar nur für Mitglieder der Gruppe **Fraktion** (Vorstand → Gruppen; Ratsmitglieder zählen automatisch dazu) – auch der
Vorstand sieht es nur, wenn er dort eingetragen ist. Push: „Neue Aufgabe für dich“, „Bald fällig“ zwei Tage vor der Frist, „Neu in der Ratsarbeit“ bei Dokumenten.
Datenschutz: Aufgabentexte und Dateien liegen **verschlüsselt** bei Wix (AES-GCM, ein Fraktionsschlüssel), den Schlüssel bekommen nur Geräte von Fraktionsmitgliedern
vom Push-Dienst (Einzelheiten in `src/lib/rat.mjs` und `push/README.md`). Beim ersten Öffnen auf einem Gerät heißt es deshalb einmal „Dein Zugang wird eingerichtet“
(bis zu fünf Minuten, die Seite prüft selbst nach). Code: `src/ratsarbeit.js`; Vorschau: `?demo` (Max ist dort Ratsmitglied).

**Gruppen („Wer gehört wozu?“):** Unter Vorstand → Gruppen hakt man je Person **Vorstand**, **Rat** (gewählte Ratsmitglieder) und **Fraktion**
(alle, die in der Ratsfraktion mitarbeiten – Ratsmitglieder zählen automatisch dazu, hinzugewählte Ausschussmitglieder werden extra angehakt) an. Mitglied ist
jede freigeschaltete Person. Die Gruppen erscheinen im Mitgliederverzeichnis und steuern die Sichtbarkeit. Schnappschüsse `vorstand`, `gruppe:rat`, `gruppe:fraktion`.

**Rechte:** Standard = der gesamte Vorstand darf alles. Unter Vorstand → „Wer darf was?“ legt man fest, wer je Recht
(Beiträge schreiben, Termine anlegen, Umfragen, Helferlisten, Dokumente, Ratsvorbereitung, Nachrichten, Eingang, Verwaltung) etwas darf – alles in der App,
nichts im Wix-Dashboard. Der Push-Dienst spiegelt den Vorstand in die Wix-Rolle „Vorstandsmitglied“ und prüft die Rechte ebenfalls (Einträge ohne Recht werden
entfernt). Startvorstand beim allerersten Lauf: `VORSTAND_EMAILS` in `.env` (wird automatisch freigeschaltet und als Vorstand gesetzt). Logik: `src/lib/rights.mjs`.

**Sichtbarkeit („Wer sieht was?“):** Unter Vorstand → Sichtbarkeit legt man je Bereich fest, was normale Mitglieder in der App sehen: Termine getrennt nach
Typ (Öffentlich, Rat, Mitglieder, Fraktion, Vorstand – der Typ ergibt sich aus Titel/Beschreibung des Wix-Termins bzw. der Auswahl beim Anlegen in der App),
Helferlisten, Umfragen, Dokumente, Ratsvorbereitung, Mitgliederverzeichnis. Je Bereich: *Alle Mitglieder* oder *Nur Vorstand + Auswahl* – dann beliebig
kombinierbar aus den Gruppen Rat und Fraktion plus einzelnen Personen (z. B. Vorstand + Rat, Vorstand + Fraktion + zwei Gäste).
Standard: alles für alle, Fraktionstermine nur Vorstand + Fraktion, Vorstandstermine nur Vorstand. Vorstand und Verwalter sehen immer alles; der Push-Dienst richtet sich bei „Neuer Termin“ und
„Mitglieder-Infos“ nach derselben Einstellung. Öffentliche Website und ICS-Feed zeigen weiterhin nur öffentliche Termine (Öffentlich, Rat).

**Beiträge und Termine aus der App:** Wer das Recht hat, schreibt unter „Beiträge“ einen Beitrag (Überschrift, Anriss, Text, Kategorie, Titelbild) oder legt unter
„Termine“ einen Termin an bzw. sagt einen ab. Der Push-Dienst trägt das innerhalb weniger Minuten bei Wix Blog bzw. Wix Events ein; die Website übernimmt es beim
nächsten Bau (alle 30 Minuten).

**Eingang:** Registrierungs-, Buchungs- und Kontaktanfragen landen als persönliche Kopie bei jeder zuständigen Person (Sammlung `Eingang`, nur die jeweilige
Person kann ihre Einträge lesen) – zusätzlich zur Push-Nachricht. Drei Reiter: **Mitgliederanfragen** (Registrierungen), **Mietanfragen** (Roter Bahnhof),
**Allgemeine Anfragen** (Kontakt-/Mitmachen-Formular), jeweils mit Zähler der offenen Vorgänge; Erledigtes lässt sich einblenden.

**WhatsApp:** In Gruppen posten kann die App nicht automatisch (WhatsApp hat dafür keine Schnittstelle). Stattdessen: „WhatsApp“-Knopf an Terminen, Helferlisten,
Umfragen, Dokumenten und Nachrichten – öffnet WhatsApp mit dem fertigen Text, Gruppe auswählen, abschicken. Einladungslinks der Gruppen pflegt der Vorstand
unter „WhatsApp-Gruppen“, Mitglieder sehen sie auf der Startseite des Mitgliederbereichs. Auf der öffentlichen Terminseite gibt es „Per WhatsApp teilen“ je Termin.

## Veröffentlichen auf GitHub Pages (Testphase, mit Passwort)

Einmalig: GitHub-Konto anlegen, dann in einem Terminal `winget install --id GitHub.cli`, neues Fenster, `gh auth login` (Browser-Anmeldung).
Danach `tools\GitHub Pages einrichten.cmd` doppelklicken – legt das Repository an, überträgt alle Einstellungen aus `.env` als Variablen/Secrets,
schaltet Pages ein und startet den Bau. Die alte Wix-Seite bleibt unter spd-soltau.de unverändert online.

**Stand 19.09.2026 – live unter https://spd-soltau.de:** Die DNS-Einträge bei Wix zeigen auf GitHub Pages (A `spd-soltau.de` → 185.199.108/109/110/111.153,
CNAME `www` → `briansol2024.github.io`; `www` leitet auf die Root-Domain um), Repository-Variablen `CNAME=spd-soltau.de`, `SITE_URL`/`PUSH_SITE_URL=https://spd-soltau.de`,
Umleitungs-URI `https://spd-soltau.de/mitglieder/` in den Headless-Einstellungen. Die alte Wix-Seite ist damit nicht mehr erreichbar (im Editor unverändert).
Bis zum Start zeigt die Domain die **Countdown-Seite** (`src/countdown.mjs`, immer auch unter `/bald/`), gesteuert über die Variable `LAUNCH_AT`
(`2026-09-22T18:00:00+02:00`): davor Countdown als Startseite, echte Startseite unter `/start/`, Passwort und NOINDEX aktiv; ab dem Zeitpunkt
schaltet der halbstündliche Build von selbst um – echte Startseite, kein Passwort, indexierbar – und `WELCOME_HOURS` (24) lang begrüßt `/bald/?willkommen=1`
jeden Erstbesucher mit Null und Konfetti (gemerkt in `localStorage`). Aufräumen danach: Variablen `LAUNCH_AT`, `NOINDEX` und Secret `PREVIEW_PASSWORD` entfernen.

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

## Go-live (erledigt am 19.09.2026, Ablauf zur Erinnerung)

1. Bei Wix unter *Domains → DNS-Einträge verwalten* A-Records auf GitHub Pages und CNAME `www` → `briansol2024.github.io` (alte Werte: A 185.230.63.171/.186/.107, www → cdn3.wixdns.net).
2. GitHub Pages: Domain `spd-soltau.de` (`gh api -X PUT repos/…/pages -f cname=…`), nach dem Zertifikat `https_enforced=true`.
3. Variablen `CNAME`, `SITE_URL`, `PUSH_SITE_URL`, `LAUNCH_AT` setzen; Headless-Umleitungs-URI ergänzen.
4. Der Start selbst läuft über `LAUNCH_AT` automatisch (siehe oben); Passwort/NOINDEX danach aufräumen.

Die Wix-Editor-Seite bleibt unangetastet bestehen und ist weiterhin unter der wixsite-Adresse erreichbar. E-Mail-DNS (MX/SPF) zeigt noch auf das alte,
nicht mehr existierende Microsoft-365-Postfach und wird mit dem neuen Postfach ersetzt.

## Zeitgesteuert

- Der Aufruf zur Landrats-Stichwahl (Sebastian Zinke) erscheint automatisch nur bis einschließlich 27.09.2026 (`STICHWAHL.datum`).

## Gestaltung: Symbolbilder statt Farbbänder

Wunsch des Vorsitzes (19.09.2026): nicht durchgehend Rot/Schwarz/Weiß, sondern abschnittsweise eigene Fotos als Hintergrund. `motiv(name)` in
`src/templates.mjs` legt ein Bild aus `src/images/motiv-*.jpg` (1600 × 900, eigene Fotos aus Beiträgen und dem Drohnenflug) hinter einen Abschnitt;
die Klasse `foto` sorgt für den dunklen Verlauf, `foto foto-rot` für die SPD-rote Tönung (Zahlenbänder). Jeder Seitenkopf hat sein Motiv (`pageHead(…, foto)`),
die drei Kästen am Seitenende sind Fotokästen, das Newsletter-Band ist hell. Neue Motive: Bild nach `src/images/motiv-<name>.jpg`, Name in `MOTIVE` eintragen. Fremde Fotos (Wikimedia Commons, CC BY-SA 4.0: Altes Rathaus, Rathaus bei Nacht, Marktstraße, Hagen, Bahnhofsgebäude, Heide, Allee bei Timmerloh, Poststraße 11) stehen mit Urheber in `MOTIV_CREDITS` und erscheinen automatisch unter Impressum → Bildnachweise.

## Rechtliches

Impressum (§ 5 DDG, § 18 MStV), Datenschutzerklärung (Hosting GitHub Pages, Wix, Formulare, Newsletter, Mitgliederbereich inkl. Art. 9, Push, reCAPTCHA, Gerätespeicher,
Betroffenenrechte, LfD Niedersachsen) und Transparenzbekanntmachung stehen in `src/templates.mjs`. Die E-Mail-Adresse kommt aus der GitHub-Variable `SITE_EMAIL` – solange
sie fehlt, steht im Impressum ein gelber Platzhalter.

## Noch offen (bewusst für später)

- Dokumente werden als Link eingestellt (Datei vorher in der Wix-Medienverwaltung/Dateifreigabe oder einer Cloud ablegen). Direkter Upload aus der App wäre mit einem kleinen Server-Teil nachrüstbar.
- Antwort an Anfragende (Buchung bestätigt/abgelehnt) schickt der Vorstand noch selbst – automatische E-Mails wären über Wix „Ausgelöste E-Mails“ möglich.
- Umfrage zählt nur lokal im Browser. Geplant: Zählung über eine CMS-Sammlung.
- Impressum/Datenschutz mit den Mustern des SPD-Landesverbands abgleichen.
- „Soltau in Zahlen“ (Startseite) prüfen/aktualisieren: Werte stehen in `build.mjs` unter `facts`.
