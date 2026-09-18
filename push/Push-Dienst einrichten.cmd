@echo off
rem Richtet die Windows-Aufgabenplanung ein: alle 5 Minuten ein Durchlauf des Push-Dienstes (ohne Fenster).
rem Entfernen:  schtasks /Delete /TN "SPD Soltau Push-Dienst" /F
cd /d "%~dp0"
if not exist "..\.env" ( echo .env fehlt & pause & exit /b 1 )
findstr /B "WIX_API_KEY=." "..\.env" >nul || ( echo In .env fehlt noch WIX_API_KEY - siehe push\README.md & pause & exit /b 1 )
schtasks /Create /TN "SPD Soltau Push-Dienst" /SC MINUTE /MO 5 /TR "wscript.exe \"%~dp0Push-Dienst leise.vbs\"" /F
if errorlevel 1 ( echo Aufgabe konnte nicht angelegt werden. & pause & exit /b 1 )
echo.
echo Fertig: Der Push-Dienst laeuft jetzt alle 5 Minuten im Hintergrund, solange dieser PC an und angemeldet ist.
echo Protokoll: push\log
echo Testnachricht:  node push\send.mjs --test
pause
