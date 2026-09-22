# Rundgang-Videos fertig machen: video/hilfe/tmp/rundgang-*.webm und keynote-*.webm + Musik -> video/hilfe/out/<name>.mp4 (H.264, klein genug für WhatsApp)
#   python video/hilfe/compose_tour.py            alle Rundgänge
#   python video/hilfe/compose_tour.py rat        nur rundgang-ratsmitglieder
import re, subprocess, sys, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
TMP = ROOT / 'video' / 'hilfe' / 'tmp'
OUT = ROOT / 'video' / 'hilfe' / 'out'; OUT.mkdir(parents=True, exist_ok=True)
MUSIC = ROOT / 'video' / 'hilfe' / 'music.wav'
FFMPEG = str(ROOT / 'node_modules' / 'ffmpeg-static' / 'ffmpeg.exe')
only = sys.argv[1] if len(sys.argv) > 1 else ''

def duration(path):
    r = subprocess.run([FFMPEG, '-hide_banner', '-i', str(path)], capture_output=True, text=True)
    m = re.search(r'Duration: (\d+):(\d+):([\d.]+)', r.stderr)
    return int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3]) if m else 0

for webm in sorted(list(TMP.glob('rundgang-*.webm')) + list(TMP.glob('keynote-*.webm')) + list(TMP.glob('app-*.webm')) + list(TMP.glob('[0-9][0-9]-*.webm'))):
    if only and only not in webm.stem: continue
    mp4 = OUT / (webm.stem + '.mp4')
    d = duration(webm)
    trim = 0.0
    try: trim = float(json.loads((TMP / (webm.stem + '.json')).read_text(encoding='utf-8')).get('trim') or 0)
    except Exception: trim = 0.0
    d = max(1.0, d - trim)
    musik = ROOT / 'video' / 'hilfe' / ('music.wav' if webm.stem.startswith('rundgang') else 'keynote.wav')
    cmd = [FFMPEG, '-hide_banner', '-loglevel', 'error', '-y',
           '-ss', f'{trim:.2f}', '-i', str(webm), '-stream_loop', '-1', '-i', str(musik),
           '-filter_complex', f'[1:a]volume={0.5 if webm.stem.startswith("rundgang") else 0.6 if webm.stem[:2].isdigit() else 0.7},afade=t=in:st=0:d=1.5,afade=t=out:st={max(0, d - 3):.2f}:d=3[a]',
           '-map', '0:v:0', '-map', '[a]', '-t', f'{d:.2f}',
           '-c:v', 'libx264', '-preset', 'medium', '-crf', '26', '-pix_fmt', 'yuv420p', '-r', '25', '-profile:v', 'main', '-level', '4.0',
           '-c:a', 'aac', '-b:a', '80k', '-ac', '1', '-movflags', '+faststart', str(mp4)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print('FEHLER', webm.stem, r.stderr[-800:]); continue
    print(f'{webm.stem}: {d:.0f} s, {mp4.stat().st_size / 1e6:.1f} MB -> {mp4}')
