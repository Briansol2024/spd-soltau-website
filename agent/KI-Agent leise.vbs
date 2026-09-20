' Startet den KI-Agenten ohne sichtbares Fenster (fuer die Aufgabenplanung).
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = Replace(WScript.ScriptFullName, "\KI-Agent leise.vbs", "")
sh.Run "cmd /c """ & sh.CurrentDirectory & "\KI-Agent ausfuehren.cmd""", 0, False
