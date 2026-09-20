@echo off
rem Startet den KI-Agenten (Dauerbetrieb). Die Aufgabenplanung ruft das alle 5 Minuten - laeuft er schon, beendet er sich sofort.
cd /d "%~dp0.."
if not exist "agent\log" mkdir "agent\log"
set "PATH=%PATH%;%APPDATA%\npm"
node agent\ki-agent.mjs >> "agent\log\ki-agent-%date:~-4%-%date:~3,2%.log" 2>&1
