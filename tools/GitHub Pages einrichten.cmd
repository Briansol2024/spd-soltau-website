@echo off
setlocal EnableDelayedExpansion
rem Veroeffentlicht das Projekt auf GitHub und richtet GitHub Pages ein (passwortgeschuetzte Testversion).
rem Voraussetzung: GitHub CLI installiert und angemeldet:
rem   winget install --id GitHub.cli        (danach neues Fenster oeffnen)
rem   gh auth login                          (Browser-Anmeldung bei GitHub)
cd /d "%~dp0.."
where gh >nul 2>nul || ( echo GitHub CLI fehlt. Bitte zuerst:  winget install --id GitHub.cli   und dann  gh auth login & pause & exit /b 1 )
gh auth status >nul 2>nul || ( echo Nicht bei GitHub angemeldet. Bitte zuerst:  gh auth login & pause & exit /b 1 )
for /f "usebackq tokens=1,* delims==" %%a in (".env") do set "ENV_%%a=%%b"
for /f "delims=" %%u in ('gh api user -q .login') do set "GHUSER=%%u"
set "REPO=spd-soltau-website"
echo GitHub-Konto: !GHUSER!   Repository: !REPO!
git remote get-url origin >nul 2>nul || (
  echo Repository anlegen und Code hochladen ...
  gh repo create !REPO! --public --source=. --remote=origin --push --description "Website und App des SPD Ortsvereins Soltau (Wix Headless, GitHub Pages)" || goto :err
)
echo Einstellungen fuer den automatischen Bau setzen ...
gh variable set WIX_CLIENT_ID --body "!ENV_WIX_CLIENT_ID!" || goto :err
gh variable set NOINDEX --body "1"
gh variable set BASE_PATH --body "/!REPO!"
gh variable set VAPID_PUBLIC_KEY --body "!ENV_VAPID_PUBLIC_KEY!"
gh variable set VAPID_SUBJECT --body "!ENV_VAPID_SUBJECT!"
gh variable set WIX_SITE_ID --body "!ENV_WIX_SITE_ID!"
gh variable set ICS_TOKEN --body "!ENV_ICS_TOKEN!"
gh variable set VORSTAND_EMAILS --body "!ENV_VORSTAND_EMAILS!"
gh variable set PUSH_SITE_URL --body "https://!GHUSER!.github.io/!REPO!"
gh secret set PREVIEW_PASSWORD --body "!ENV_PREVIEW_PASSWORD!" || goto :err
gh secret set VAPID_PRIVATE_KEY --body "!ENV_VAPID_PRIVATE_KEY!"
if not "!ENV_WIX_API_KEY!"=="" gh secret set WIX_API_KEY --body "!ENV_WIX_API_KEY!"
echo GitHub Pages einschalten (Quelle: GitHub Actions) ...
gh api -X POST "repos/!GHUSER!/!REPO!/pages" -f build_type=workflow >nul 2>nul || gh api -X PUT "repos/!GHUSER!/!REPO!/pages" -f build_type=workflow >nul 2>nul
echo Code hochladen und Bau starten ...
git push -u origin main || goto :err
gh workflow run deploy.yml >nul 2>nul
echo.
echo Fertig. In 2-3 Minuten ist die Testversion erreichbar unter:
echo    https://!GHUSER!.github.io/!REPO!/        (Passwort wie bisher)
echo.
echo Noch eintragen bei Wix (Einstellungen - Headless-Einstellungen - SPD Soltau Website - Umleitungs-URIs):
echo    https://!GHUSER!.github.io/!REPO!/mitglieder/
echo Fortschritt des Baus:  gh run watch   oder im Browser unter Actions.
pause
exit /b 0
:err
echo Fehler - Ausgabe oben pruefen.
pause
exit /b 1
