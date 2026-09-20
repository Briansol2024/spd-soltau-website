@echo off
rem Claude Code auf diesem Rechner mit dem Abo anmelden (einmalig; danach nutzt der KI-Agent diese Anmeldung).
rem Es oeffnet sich Claude Code im Terminal: dort  /login  eingeben, im Browser bestaetigen, dann mit  /exit  beenden.
cd /d "%~dp0.."
set "EXE=%~dp0claude\node_modules\@anthropic-ai\claude-code\bin\claude.exe"
if not exist "%EXE%" (
  echo Claude Code fehlt - wird installiert ...
  cd /d "%~dp0claude" && npm install @anthropic-ai/claude-code --no-audit --no-fund && cd /d "%~dp0.."
)
echo.
echo Gleich startet Claude Code. Bitte eingeben:   /login   - dann im Browser bestaetigen - danach   /exit
echo.
"%EXE%"
echo.
echo Fertig. Der KI-Agent meldet sich innerhalb von einer Minute als "angemeldet" (Filmdreh -> Skript -> Unser KI-Agent).
pause
