# KI-Agent (SKM-Server)

Beantwortet Anfragen aus dem Filmdreh („Unser KI-Agent“) mit Claude Code und dem Abo-Login dieses Rechners.

- `ki-agent.mjs` – der Agent (Dauerbetrieb: alle 15 s Anfragen aus `KiAuftraege`, Herzschlag in `KiStatus`, Push an den Fragenden).
- `Claude anmelden.cmd` – einmalig: Claude Code mit dem Abo anmelden (`/login`), danach `/exit`.
- `KI-Agent einrichten.cmd` – Aufgabe „SPD Soltau KI-Agent“ anlegen (alle 5 Minuten als Wächter; der Agent läuft dauerhaft) und starten.
- Claude Code liegt projektintern unter `agent/claude/` (nicht im Git) – so sieht es auch die Aufgabenplanung.
- Voraussetzungen: Node, `.env` mit `WIX_API_KEY` (wie Push-Dienst). Optional in `.env`: `KI_MODELL=claude-sonnet-5`, `CLAUDE_BIN=…`.
- Test ohne Aufgabe: `node agent/ki-agent.mjs --einmal` · Protokoll: `agent/log/` · Entfernen: `schtasks /Delete /TN "SPD Soltau KI-Agent" /F`
