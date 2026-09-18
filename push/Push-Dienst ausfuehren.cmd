@echo off
rem Ein Durchlauf des Push-Dienstes (wird von der Aufgabenplanung alle 5 Minuten aufgerufen).
cd /d "%~dp0.."
if not exist "push\log" mkdir "push\log"
node push\send.mjs >> "push\log\push-%date:~-4%-%date:~3,2%.log" 2>&1
