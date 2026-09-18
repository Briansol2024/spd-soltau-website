# Push-Dienst (App-Benachrichtigungen)

Der Push-Dienst ist ein kleines Node-Skript (`send.mjs`), das regelmäßig läuft und

1. die Wix-Mitglieder mit der CMS-Sammlung **AppMitglieder** abgleicht (Name, Rollen, „Push aktiv“),
2. **Aktionen des Vorstands** ausführt, die in der App ausgelöst wurden (Registrierung freischalten/ablehnen, Buchung annehmen/ablehnen, Nachricht an alle),
3. **Push-Nachrichten** verschickt:

| Thema | Wer bekommt es | Auslöser |
|---|---|---|
| Aktuelles | alle Geräte mit Thema „Aktuelles“ | neuer Blog-Beitrag bei Wix (in den letzten 48 h veröffentlicht) |
| Termine | alle Geräte mit Thema „Termine“ – öffentliche und Ratstermine an alle, Mitglieder-/Fraktions-/Vorstandstermine nur an Mitglieder, die den Termintyp laut „Wer sieht was?“ sehen dürfen | neuer Termin bei Wix Events; Erinnerung am Vortag ab 17 Uhr |
| Registrierungsanfrage | Vorstand laut „Wer wird benachrichtigt?“ | neues Mitglied wartet auf Freigabe |
| Buchungsanfrage | Vorstand laut „Wer wird benachrichtigt?“ | neue Anfrage über `/roter-bahnhof/` (Sammlung Buchungen, Status „offen“) |
| Zu-/Absage | Vorstand laut „Wer wird benachrichtigt?“ | Mitglied hat in der App zu- oder abgesagt |
| Kontakt-/Mitgliedsanfrage | Vorstand laut „Wer wird benachrichtigt?“ | Formular auf der Website abgeschickt (Sammlung Anfragen) |
| Geburtstag / Jubiläum | Vorstand laut „Wer wird benachrichtigt?“ | morgens ab 8 Uhr, aus den freiwilligen Profilangaben (Geburtstag freigegeben, Eintrittsjahr) |
| Mitglieder-Infos | angemeldete Mitglieder mit Thema „Mitglieder-Infos“, die den Bereich laut „Wer sieht was?“ sehen dürfen | neue Umfrage, Helferliste, Dokument, Ratsvorbereitung |
| Nachricht | alle Mitglieder oder alle Abonnent*innen | Vorstand schreibt in der App unter „Nachricht an alle“ |

Aktionen aus der App, die der Dienst bei Wix ausführt (nur mit dem jeweiligen Recht): Registrierung freischalten/ablehnen, Buchung annehmen/ablehnen, Anfrage erledigen, Nachricht senden, **Termin anlegen/absagen (Wix Events)**, **Beitrag anlegen/veröffentlichen (Wix Blog, Titelbild in die Medienverwaltung)**, Vorstand ↔ Wix-Rolle abgleichen.

Jede Nachricht wird in **PushLog** vermerkt – nichts geht doppelt raus. Einstellungen aus „Wer wird benachrichtigt?“, „Wer darf was?“ und „Wer sieht was?“ zählen nur, wenn sie jemand mit dem Recht „Verwaltung“ gespeichert hat (Standard: Vorstand, Wix-Rolle „Vorstandsmitglied“). Solange für ein Thema nichts gespeichert ist, bekommt der gesamte Vorstand die Nachricht. Der Dienst prüft außerdem die Rechte: Umfragen, Helferlisten, Dokumente und Ratsvorbereitungen von Mitgliedern ohne das jeweilige Recht werden entfernt, Aktionen ohne Recht abgelehnt.

## Einrichtung (einmalig)

1. **Admin-API-Schlüssel** bei Wix erstellen: <https://manage.wix.com/account/api-keys> → „API-Schlüssel generieren“ → Name „SPD Soltau Push-Dienst“ → Sites: nur SPD Soltau → „Alle Website-Berechtigungen“ → „Schlüssel generieren“ → kopieren.
2. `push\Push-Dienst einrichten.cmd` doppelklicken: fragt den Schlüssel ab (bleibt in `.env` auf diesem PC), prüft den Zugang, legt die CMS-Felder an, macht den ersten Lauf (Mitglieder abgleichen, Startvorstand aus `VORSTAND_EMAILS` setzen), baut die Website neu und legt die Aufgabe „SPD Soltau Push-Dienst“ an (alle 5 Minuten, ohne Fenster). Protokolle: `push/log/`.
3. Einzeln bei Bedarf: `node push/setup.mjs`, `node push/send.mjs`, `node push/send.mjs --test` (Testnachricht), `node push/send.mjs --dry` (nur anzeigen).

Sobald der Build auf GitHub Pages läuft, übernimmt `.github/workflows/push.yml` den Dienst (Secrets `WIX_API_KEY`, `VAPID_PRIVATE_KEY`, Vars `WIX_SITE_ID`, `VAPID_PUBLIC_KEY`, `PUSH_SITE_URL`) – dann muss kein PC mehr laufen.

## Werte in `.env`

| Variable | Bedeutung |
|---|---|
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Schlüsselpaar für Web Push (von `setup.mjs` erzeugt). Der öffentliche Teil steckt im Website-Build, der private bleibt geheim. |
| `VAPID_SUBJECT` | Kontaktadresse für die Push-Dienste der Browser (`mailto:…`) |
| `WIX_SITE_ID` | ID der Website (steht in der Dashboard-Adresse) |
| `WIX_API_KEY` | Admin-API-Schlüssel (siehe oben) |
| `PUSH_SITE_URL` | Adresse, auf die Benachrichtigungen verlinken (Vorschau: Tailscale-Adresse, später `https://www.spd-soltau.de`) |
| `VORSTAND_EMAILS` | Startvorstand (E-Mail-Adressen, kommagetrennt): wird beim ersten Lauf freigeschaltet und als Vorstand gesetzt, solange bei Wix niemand die Rolle hat |
| `WIX_CLIENT_ID` | wird auch vom Dienst gebraucht (persönlicher Eingang wird im Namen des Mitglieds geschrieben) |
| `VORSTAND_ROLLE` | optional, Muster für die Vorstandsrolle (Standard: `vorstand`) |

## CMS-Sammlungen der App

| Sammlung | Inhalt | Rechte |
|---|---|---|
| `Zusagen` | Zu-/Absagen zu Terminen mit Grund | Mitglieder lesen + anlegen, eigene ändern |
| `PushSubscriptions` | Push-Abonnements der Geräte | jeder darf anlegen, lesen nur Admin/Push-Dienst |
| `Benachrichtigungen` | „Wer wird benachrichtigt?“ (je Speichern ein Eintrag, der neueste gilt) | Mitglieder lesen + anlegen |
| `Aktionen` | Aufträge des Vorstands an den Push-Dienst | Mitglieder anlegen, eigene lesen |
| `AppMitglieder` | Name, Rollen, Push-Status je Mitglied (vom Dienst gepflegt) | Mitglieder lesen |
| `Buchungen` | Buchungsanfragen Roter Bahnhof | jeder darf anlegen, lesen nur Admin/Push-Dienst |
| `PushLog` | Versandprotokoll | nur Admin/Push-Dienst |
| `Umfragen`, `Helferlisten`, `Helfer`, `Dokumente`, `Ratsvorbereitung`, `Profile`, `Fahrgemeinschaften` | Inhalte des Mitgliederbereichs | Mitglieder lesen + anlegen, eigene ändern/löschen |
| `UmfragenOeffentlich` | Umfrage der Woche (Startseite) | jeder liest, Mitglieder legen an |
| `Stimmen` | Abstimmungen (intern und öffentlich) | jeder darf abstimmen, Mitglieder lesen die Auswertung |
| `Anfragen` | Kontakt- und Mitgliedsanfragen der Website | jeder darf anlegen, lesen nur Admin/Push-Dienst |
| `Eingang` | persönliche Kopie jeder Anfrage je zuständiger Person (vom Dienst im Namen des Mitglieds angelegt) | Mitglieder anlegen, eigene lesen/ändern |
