# Push-Dienst (App-Benachrichtigungen)

Der Push-Dienst ist ein kleines Node-Skript (`send.mjs`), das regelmäßig läuft und

1. die Wix-Mitglieder mit der CMS-Sammlung **AppMitglieder** abgleicht (Name, Rollen, „Push aktiv“),
2. **Aktionen des Vorstands** ausführt, die in der App ausgelöst wurden (Registrierung freischalten/ablehnen, Buchung annehmen/ablehnen, Nachricht an alle),
3. **Push-Nachrichten** verschickt:

| Thema | Wer bekommt es | Auslöser |
|---|---|---|
| Aktuelles | alle Geräte mit Thema „Aktuelles“ | neuer Blog-Beitrag bei Wix (in den letzten 48 h veröffentlicht) |
| Termine | alle Geräte mit Thema „Termine“ (Mitglieder-Termine nur an angemeldete Mitglieder) | neuer Termin bei Wix Events; Erinnerung am Vortag ab 17 Uhr |
| Registrierungsanfrage | Vorstand laut „Wer wird benachrichtigt?“ | neues Mitglied wartet auf Freigabe |
| Buchungsanfrage | Vorstand laut „Wer wird benachrichtigt?“ | neue Anfrage über `/roter-bahnhof/` (Sammlung Buchungen, Status „offen“) |
| Zu-/Absage | Vorstand laut „Wer wird benachrichtigt?“ | Mitglied hat in der App zu- oder abgesagt |
| Nachricht | alle Mitglieder oder alle Abonnent*innen | Vorstand schreibt in der App unter „Nachricht an alle“ |

Jede Nachricht wird in **PushLog** vermerkt – nichts geht doppelt raus. Einstellungen aus „Wer wird benachrichtigt?“ zählen nur, wenn sie von einem Vorstandsmitglied gespeichert wurden (Rolle „Vorstandsmitglied“ bei Wix). Solange für ein Thema nichts gespeichert ist, bekommt der gesamte Vorstand die Nachricht.

## Einrichtung (einmalig)

1. **Admin-API-Schlüssel** bei Wix erstellen: <https://manage.wix.com/account/api-keys> → „API-Schlüssel erstellen“ → Name „SPD Soltau Push-Dienst“ → Berechtigungen: *Wix CMS (alle)*, *Mitglieder & Kontakte (alle)*, *Blog (lesen)*, *Wix Events (lesen)* → Schlüssel kopieren.
2. In `.env` eintragen: `WIX_API_KEY=…` (die Zeile ist schon vorbereitet). Der Schlüssel bleibt auf diesem PC und kommt nie in den Build oder ins Git.
3. `node push/setup.mjs` – prüft den Zugang und legt die Felder der App-Sammlungen im CMS an (Spalten im Dashboard).
4. `node push/send.mjs --test` – Testnachricht an alle Geräte, die Benachrichtigungen aktiviert haben.
5. `push\Push-Dienst einrichten.cmd` doppelklicken – legt die Aufgabe „SPD Soltau Push-Dienst“ an (alle 5 Minuten, ohne Fenster). Protokolle liegen in `push/log/`.

Sobald der Build auf GitHub Pages läuft, übernimmt `.github/workflows/push.yml` den Dienst (Secrets `WIX_API_KEY`, `VAPID_PRIVATE_KEY`, Vars `WIX_SITE_ID`, `VAPID_PUBLIC_KEY`, `PUSH_SITE_URL`) – dann muss kein PC mehr laufen.

## Werte in `.env`

| Variable | Bedeutung |
|---|---|
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Schlüsselpaar für Web Push (von `setup.mjs` erzeugt). Der öffentliche Teil steckt im Website-Build, der private bleibt geheim. |
| `VAPID_SUBJECT` | Kontaktadresse für die Push-Dienste der Browser (`mailto:…`) |
| `WIX_SITE_ID` | ID der Website (steht in der Dashboard-Adresse) |
| `WIX_API_KEY` | Admin-API-Schlüssel (siehe oben) |
| `PUSH_SITE_URL` | Adresse, auf die Benachrichtigungen verlinken (Vorschau: Tailscale-Adresse, später `https://www.spd-soltau.de`) |
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
