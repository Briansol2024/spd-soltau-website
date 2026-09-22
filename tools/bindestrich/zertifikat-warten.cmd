@echo off
rem Wartet, bis GitHub das HTTPS-Zertifikat fuer spdsoltau.de ausgestellt hat, und schaltet dann HTTPS scharf.
setlocal
:schleife
for /f %%s in ('gh api repos/Briansol2024/spdsoltau.de/pages --jq ".https_certificate.state // \"keins\""') do set STATE=%%s
echo %date% %time% Zertifikat: %STATE% >> "%~dp0zertifikat.log"
if /i "%STATE%"=="approved" goto scharf
timeout /t 120 /nobreak > nul
goto schleife
:scharf
gh api -X PUT repos/Briansol2024/spdsoltau.de/pages -f cname=spdsoltau.de -F https_enforced=true >> "%~dp0zertifikat.log" 2>&1
echo %date% %time% HTTPS scharf geschaltet >> "%~dp0zertifikat.log"
