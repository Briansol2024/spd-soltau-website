@echo off
setlocal EnableDelayedExpansion
rem Einrichtung des Push-Dienstes in einem Rutsch: Wix-API-Schluessel abfragen, Zugang pruefen,
rem Sammlungen einrichten, Website neu bauen, Aufgabenplanung (alle 5 Minuten) anlegen, Testnachricht.
rem Entfernen der Aufgabe:  schtasks /Delete /TN "SPD Soltau Push-Dienst" /F
cd /d "%~dp0.."
echo ==========================================================
echo   SPD Soltau - Push-Dienst einrichten
echo ==========================================================
if not exist ".env" echo .env fehlt im Projektordner. && pause && exit /b 1
set "KEY="
for /f "usebackq tokens=1,* delims==" %%a in (".env") do if /i "%%a"=="WIX_API_KEY" set "KEY=%%b"
if not "!KEY!"=="" goto :haskey
echo.
echo Schritt 1: Admin-API-Schluessel von Wix
echo   Seite: https://manage.wix.com/account/api-keys
echo   "API-Schluessel generieren" - Name "SPD Soltau Push-Dienst" - Sites: nur SPD Soltau
echo   - "Alle Website-Berechtigungen" ankreuzen - "Schluessel generieren" - kopieren.
echo.
echo Bitte den Schluessel hier einfuegen - Rechtsklick ins Fenster = Einfuegen - und Enter druecken:
set /p "KEY=> "
if "!KEY!"=="" echo Kein Schluessel eingegeben. && pause && exit /b 1
node -e "const fs=require('fs');const k=process.argv[1].trim();let s=fs.readFileSync('.env','utf8');s=/^WIX_API_KEY=.*$/m.test(s)?s.replace(/^WIX_API_KEY=.*$/m,'WIX_API_KEY='+k):s+(s.endsWith('\n')?'':'\n')+'WIX_API_KEY='+k+'\n';fs.writeFileSync('.env',s);" "!KEY!"
echo Schluessel in .env gespeichert - bleibt nur auf diesem PC.
:haskey
echo.
echo Schritt 2: Zugang pruefen und Sammlungen einrichten ...
call node push\setup.mjs
if errorlevel 1 goto :err
echo.
echo Schritt 3: Erster Lauf - Mitglieder abgleichen, Startvorstand setzen ...
call node push\send.mjs
if errorlevel 1 goto :err
echo.
echo Schritt 4: Website neu bauen ...
call node build.mjs
if errorlevel 1 goto :err
call node protect.mjs
if errorlevel 1 goto :err
echo.
echo Schritt 5: Aufgabenplanung - alle 5 Minuten, ohne Fenster ...
schtasks /Create /TN "SPD Soltau Push-Dienst" /SC MINUTE /MO 5 /TR "wscript.exe \"%~dp0Push-Dienst leise.vbs\"" /F
if errorlevel 1 goto :err
echo.
echo Fertig. Der Push-Dienst laeuft jetzt alle 5 Minuten, solange dieser PC an und angemeldet ist.
echo Protokolle: push\log\
echo.
set "T="
set /p "T=Testnachricht an alle Geraete mit aktivierten Benachrichtigungen schicken? j/n "
if /i "!T!"=="j" call node push\send.mjs --test
pause
exit /b 0
:err
echo.
echo Da ist etwas schiefgegangen - Ausgabe oben pruefen.
echo Bei "Admin-Zugang fehlgeschlagen": Schluessel und Berechtigungen kontrollieren. Zum Neueingeben in .env die Zeile
echo WIX_API_KEY= leeren und dieses Skript erneut starten.
pause
exit /b 1
