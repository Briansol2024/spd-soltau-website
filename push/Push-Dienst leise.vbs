' Startet den Push-Dienst ohne sichtbares Fenster (fuer die Aufgabenplanung).
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = Replace(WScript.ScriptFullName, "\Push-Dienst leise.vbs", "")
sh.Run "cmd /c """ & sh.CurrentDirectory & "\Push-Dienst ausfuehren.cmd""", 0, False
