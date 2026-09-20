@echo off
rem Richtet den KI-Agenten auf diesem Rechner ein: Claude-Code-Befehl pruefen, Aufgabe "SPD Soltau KI-Agent" anlegen
rem (alle 5 Minuten - der Agent laeuft dauerhaft und startet sich nur neu, wenn er nicht mehr laeuft) und sofort starten.
rem Entfernen:  schtasks /Delete /TN "SPD Soltau KI-Agent" /F
cd /d "%~dp0.."
set "PATH=%PATH%;%APPDATA%\npm"
echo ==========================================================
echo   SPD Soltau - KI-Agent einrichten (Claude Code, Abo-Login)
echo ==========================================================
set "EXE=%~dp0claude
ode_modules\@anthropic-ai\claude-codein\claude.exe"
if not exist "%EXE%" (cd /d "%~dp0claude" && npm install @anthropic-ai/claude-code --no-audit --no-fund && cd /d "%~dp0..")
for /f "delims=" %%v in ('"%EXE%" --version') do echo Claude Code: %%v
schtasks /Create /TN "SPD Soltau KI-Agent" /SC MINUTE /MO 5 /TR "wscript.exe \"%~dp0KI-Agent leise.vbs\"" /F
schtasks /Run /TN "SPD Soltau KI-Agent"
echo.
echo Der Agent laeuft jetzt im Hintergrund (Protokoll: agent\log). Falls Claude noch nicht angemeldet ist:
echo   "Claude anmelden.cmd" doppelklicken, dort /login - danach meldet sich der Agent von selbst als "angemeldet".
pause
