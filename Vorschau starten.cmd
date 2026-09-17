@echo off
rem Baut die Website mit den aktuellen Wix-Inhalten, verschluesselt sie mit dem Vorschau-Passwort
rem und startet den lokalen Server (Port 8081). Tailscale leitet https://tvdash.tail37ded4.ts.net:8443 dorthin.
cd /d "%~dp0"
for /f "usebackq tokens=1,* delims==" %%a in (".env") do set "%%a=%%b"
echo [1/3] Inhalte von Wix holen und Seiten bauen ...
call node build.mjs || goto :err
echo [2/3] Passwortschutz ...
call node protect.mjs || goto :err
echo [3/3] Server starten (Fenster offen lassen; Strg+C beendet) ...
node serve.mjs --protected --port 8081
goto :eof
:err
echo Fehler beim Bauen. Fenster offen lassen und Ausgabe pruefen.
pause
