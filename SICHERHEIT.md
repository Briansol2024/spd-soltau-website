# Wix absichern – Schritt für Schritt

Stand: 29.09.2026. Reihenfolge nach Wirkung, nicht nach Aufwand.

---

## Zuerst: Was schon in Ordnung ist

Damit du nicht suchst, wo nichts zu finden ist. Alles darunter ist **gemessen**,
nicht angenommen – `node tools/sicherheitspruefung.mjs` holt sich mit dem
öffentlichen Schlüssel aus dem Quelltext eurer Seite ein anonymes Besucher-Token
(genau das, was jeder Fremde auch kann) und probiert alle 43 Sammlungen durch.

| | von außen lesen | anlegen | ändern | löschen |
|---|---|---|---|---|
| 6 öffentliche Sammlungen (Team, Ratsberichte …) | ja, so gewollt | nein | nein | nein |
| 10 Einsende-Sammlungen (Anfragen, Buchungen …) | **nein** | ja, so gewollt | nein | nein |
| 27 geschlossene (Profile, Vorgaenge, RatGeheim …) | **nein** | nein | nein | nein |

**Keine einzige Mitglieder- oder Ratssammlung ist von außen lesbar.** Auch
ändern oder löschen kann von außen niemand irgendwo etwas. Dazu: keine
Schlüssel im Quelltext, `.env` nicht im Git, keine Geheimnisse im
ausgelieferten Stand, und der Git-Verlauf ist sauber (alle Treffer auf
`WIX_API_KEY=` sind Anleitungstexte mit „…", nie ein echter Wert).

**Wenn Mitglieder angeschrieben wurden, kam die Liste nicht über die Website.**
Die naheliegenden anderen Wege: ein Postfach, in das jemand hineinkommt, ein
Verteiler, ein weitergeleitetes Mitgliederverzeichnis, oder ein Gerät. Schritt 1
und 2 unten zielen genau darauf.

---

## Schritt 1 – Zwei-Faktor-Anmeldung für alle mit Dashboard-Zugang

**Wix-Konto → Kontoeinstellungen → Sicherheit → Zwei-Faktor-Authentifizierung**

Das ist der wichtigste Punkt der ganzen Liste, und er hat nichts mit Technik zu
tun. Alle Berechtigungen der Welt nützen nichts, wenn jemand an das Passwort
eines Vorstandsmitglieds kommt – aus einem fremden Datenleck, per gefälschter
E-Mail oder weil dasselbe Passwort noch woanders benutzt wird. Wer dann im
Dashboard steht, sieht alles, was ihr seht.

Und: **jeder** mit Zugang, nicht nur du. Die Kette ist so stark wie ihr
schwächstes Glied.

---

## Schritt 2 – Ausmisten, wer überhaupt hineindarf

**Dashboard → Einstellungen → Rollen & Berechtigungen**

Geh die Liste Person für Person durch und stell dir bei jeder drei Fragen:

1. **Wer ist das?** Steht da jemand, den du nicht zuordnen kannst, ist das
   allein schon ein Fund.
2. **Braucht die Person das noch?** Ausgeschiedene Vorstandsmitglieder, ein
   Dienstleister von damals, ein altes Zweitkonto.
3. **Braucht sie wirklich „Admin"?** Wer Beiträge schreibt, braucht keinen
   Vollzugriff auf Mitgliederdaten. Wix kennt abgestufte Rollen, und ihr könnt
   eigene anlegen.

Dasselbe gilt für die Mitgliederrollen der App: **Dashboard → Website-Mitglieder**.

---

## Schritt 3 – Die Sammlungs-Berechtigungen durchgehen

**CMS → Drei-Punkte-Menü neben der Sammlung → „Berechtigungen & Datenschutz"
→ „Erweitert"**

Unter „Erweitert" lassen sich Ansehen, Hinzufügen, Aktualisieren und Löschen
**einzeln** je Rolle einstellen. Das ist der eigentliche Schutz eurer Daten –
und laut Messung steht er schon richtig. Trotzdem lohnt der Durchgang einmal von
Hand, weil eine neue Sammlung standardmäßig zu offen anfängt.

So soll es aussehen:

**Gruppe A – öffentlich** (`Team`, `Team1`, `Ratsberichte`, `Startseite`,
`UmfragenOeffentlich`, `Unterstuetzung`)
Ansehen: *Jeder*. Hinzufügen, Aktualisieren, Löschen: *Admin*.

**Gruppe B – Einsendungen** (`Anfragen`, `Buchungen`, `Abonnenten`, `Stimmen`,
`Seitenaufrufe`, `Fragen`, `Feedback`, `Ideen`, `Newsletter`,
`PushSubscriptions`)
Hinzufügen: *Jeder* – das **muss** so sein, sonst kann niemand das
Kontaktformular abschicken. Ansehen, Aktualisieren, Löschen: *Admin*.
Wichtig ist hier vor allem: **Ansehen auf gar keinen Fall auf „Jeder"**. Sonst
könnte jeder Fremde alle je eingegangenen Anfragen samt Namen und Adressen
abrufen.

**Gruppe C – alles Übrige** (`Profile`, `AppMitglieder`, `Zusagen`, `Vorgaenge`,
`Postfach`, `RatGeheim`, `RatSchluessel`, `Kalenderlinks` …)
Alle vier Rechte: *Admin* bzw. *Website-Mitglieder*, wo die App es braucht –
niemals *Jeder*.

**Danach zur Kontrolle:**

```bash
node tools/sicherheitspruefung.mjs
```

Es muss am Ende stehen: *Keine Sammlung offen, die geschlossen sein soll.*
Wenn du eine neue Sammlung anlegst, trag sie oben im Skript in die Liste ein –
sonst wird sie nicht geprüft.

---

## Schritt 4 – Den Admin-Schlüssel des Push-Dienstes prüfen

Der Push-Dienst läuft alle fünf Minuten auf GitHub Actions und benutzt dafür
einen **Wix-Admin-API-Schlüssel**. Der darf alles – er ist das eine Geheimnis,
das wirklich weh täte.

* **Wo er liegt:** GitHub → euer Repository → Settings → Secrets and variables →
  Actions. Dort ist er eingetragen und von dort nicht mehr auslesbar, auch nicht
  von euch. Richtig so.
* **Wo er verwaltet wird:** Wix-Konto → API-Schlüssel-Verwaltung. Prüf dort:
  Gibt es Schlüssel, die niemand mehr braucht? Weg damit.
* **Wenn jemand aus dem Vorstand ausscheidet**, der den Schlüssel je in der Hand
  hatte: neuen erzeugen, in GitHub eintragen, alten löschen.
* Er gehört **nie** in eine Datei im Projekt. `.env` ist dafür da und steht in
  `.gitignore`.

---

## Schritt 5 – Headless: erlaubte Umleitungs-Adressen

**Wix-Dashboard → Einstellungen → Headless-Einstellungen → OAuth-App**

Dort stehen die erlaubten Umleitungs-Adressen für die Anmeldung. Es dürfen nur
**eure** Adressen darin stehen (`https://spd-soltau.de/mitglieder/` und die
GitHub-Pages-Adresse). Steht dort ein Platzhalter wie `*` oder eine fremde
Domain, könnte jemand die Anmeldung auf seine eigene Seite umleiten und den
Anmelde-Code abfangen.

---

## Schritt 6 – Vier Zeilen löschen, die ich hinterlassen habe

**CMS → `PushSubscriptions`**

Bei der Prüfung am 29.09.2026 sind vier Zeilen mit dem Titel `PRUEFUNG-…`
entstanden. Wix erlaubt dem Besucher-Token zwar das Anlegen, aber nicht das
Löschen – deshalb konnte ich sie nicht selbst wegräumen. Der Push-Dienst
entfernt sie inzwischen beim nächsten Lauf von allein; von Hand geht es
schneller.

---

## Schritt 7 – Optional: Push nur noch für Mitglieder

`PushSubscriptions` nimmt Einträge von jedem an. **Das ist Absicht**: Auch
Besucher ohne Konto dürfen Benachrichtigungen über neue Beiträge und Termine
einschalten. Interne Nachrichten bekommen sie nicht – die hängen an einer echten
Mitgliedskennung mit Rechteprüfung.

Wenn ihr das trotzdem nicht wollt, stell unter „Berechtigungen & Datenschutz"
das **Hinzufügen** auf *Website-Mitglieder*. Preis: Wer kein Konto hat, bekommt
gar keine Benachrichtigungen mehr.

---

## Warum der Zugangsschlüssel im Quelltext stehen bleiben muss

Im Quelltext eurer Seite steht `clientId: "730eceea-…"`. Das sieht nach einem
Geheimnis aus, ist aber keines – es ist eine **Kennung**, keine Zutrittskarte.
Ungefähr wie die Hausnummer: Sie verrät, wo ihr wohnt, aber sie schließt nichts
auf.

Sie muss dort stehen, weil der Browser eines Besuchers damit sagt: „Ich möchte
etwas an die Seite mit dieser Kennung schicken." Ohne sie könnte niemand das
Kontaktformular abschicken und keine Umfrage mitmachen.

**Was tatsächlich schützt, sind die Berechtigungen aus Schritt 3.** Deshalb
bringt es nichts, die Kennung zu verstecken oder zu verschleiern, und es bringt
auch nichts, das GitHub-Repository privat zu machen – die veröffentlichte Seite
gibt sie ohnehin an jeden Browser heraus. Der Schutz liegt nicht darin, dass
niemand die Kennung kennt, sondern darin, dass sie niemandem etwas nützt.

---

## Was regelmäßig dran ist

* **Nach jeder neuen Sammlung:** in `tools/sicherheitspruefung.mjs` eintragen und
  das Skript laufen lassen.
* **Alle paar Monate:** Schritt 2 wiederholen – wer darf ins Dashboard?
* **Wenn jemand ausscheidet:** Dashboard-Zugang entziehen, Mitgliedsrolle
  entfernen, und falls die Person den Admin-Schlüssel kannte, Schritt 4.
* **Wenn wieder Spam kommt:** `push/log/` ansehen. Der Dienst protokolliert
  jede aussortierte Anfrage mit Begründung.

---

## Quellen für die Menüwege

* [CMS: Die Berechtigungen für deine Sammlung ändern](https://support.wix.com/en/article/cms-changing-your-collection-permissions)
* [CMS: Überblick über Sammlungsberechtigungen](https://support.wix.com/en/article/cms-collection-permissions-overview)
* [Rollen & Berechtigungen: Überblick](https://support.wix.com/de/article/rollen-berechtigungen-%C3%BCberblick)
* [Über Wix-API-Schlüssel](https://support.wix.com/en/article/about-wix-api-keys)
