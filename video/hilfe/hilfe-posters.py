# Hochkant-Cover der Hilfevideos: das erste Bild (Cover) des Android-Videos -> src/hilfe/NN-id-hoch.jpg; die Querformat-Poster (Kartenraster) bleiben von posters.py
#   python video/hilfe/hilfe-posters.py
import subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent.parent
OUT = ROOT / 'src' / 'hilfe'
FFMPEG = str(ROOT / 'node_modules' / 'ffmpeg-static' / 'ffmpeg.exe')
n = 0
for mp4 in sorted(OUT.glob('[0-9][0-9]-*-android.mp4')):
    poster = OUT / (mp4.stem[:-8] + '-hoch.jpg')
    r = subprocess.run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', '-ss', '0.4', '-i', str(mp4), '-frames:v', '1', '-q:v', '4', str(poster)], capture_output=True, text=True)
    if r.returncode: print('FEHLER', mp4.name, r.stderr[-300:]); continue
    n += 1
print('fertig:', n, 'Cover')
