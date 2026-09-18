# Macht aus den Aufnahmen (video/hilfe/tmp/*.webm) fertige Hilfevideos mit Hintergrundmusik: src/hilfe/<name>.mp4
#   python video/hilfe/compose.py            alle neuen Aufnahmen
#   python video/hilfe/compose.py 05-zusagen-ios   nur eine
#   FORCE=1 …                                vorhandene mp4 neu erzeugen
#   python video/hilfe/compose.py --nur-musik   nur die Hintergrundmusik in allen fertigen Videos austauschen
import os, subprocess, sys, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
TMP = ROOT / 'video' / 'hilfe' / 'tmp'
OUT = ROOT / 'src' / 'hilfe'; OUT.mkdir(parents=True, exist_ok=True)
MUSIC = ROOT / 'video' / 'hilfe' / 'music.wav'
FFMPEG = str(ROOT / 'node_modules' / 'ffmpeg-static' / 'ffmpeg.exe')
FORCE = bool(os.environ.get('FORCE'))
NUR_MUSIK = '--nur-musik' in sys.argv  # nur die Musik austauschen (Video bleibt, keine Neukodierung)
only = next((a for a in sys.argv[1:] if not a.startswith('--')), None)

def duration(path):
    r = subprocess.run([FFMPEG, '-hide_banner', '-i', str(path)], capture_output=True, text=True)
    m = re.search(r'Duration: (\d+):(\d+):([\d.]+)', r.stderr)
    return int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3]) if m else 0

done = 0
sources = sorted(OUT.glob('*.mp4')) if NUR_MUSIK else sorted(TMP.glob('*.webm'))
for src in sources:
    name = src.stem
    if only and name != only: continue
    mp4 = OUT / (name + '.mp4')
    if NUR_MUSIK:
        tmp_out = OUT / (name + '.neu.mp4'); d = duration(src)
        cmd = [FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(src), '-stream_loop', '-1', '-i', str(MUSIC),
               '-filter_complex', f'[1:a]volume=0.55,afade=t=in:st=0:d=1.5,afade=t=out:st={max(0, d - 2.5):.2f}:d=2.5[a]',
               '-map', '0:v:0', '-map', '[a]', '-t', f'{d:.2f}', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '80k', '-ac', '1', '-movflags', '+faststart', str(tmp_out)]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0: print('FEHLER', name, r.stderr[-600:]); continue
        os.replace(tmp_out, mp4); done += 1; print(f'{name}: Musik neu, {mp4.stat().st_size / 1e6:.1f} MB'); continue
    webm = src
    if mp4.exists() and not FORCE and mp4.stat().st_mtime > webm.stat().st_mtime:
        continue
    d = duration(webm)
    # Musik: Endlosschleife, leise, sanft ein- und ausblenden; Video: H.264, klein, überall abspielbar
    cmd = [FFMPEG, '-hide_banner', '-loglevel', 'error', '-y',
           '-i', str(webm), '-stream_loop', '-1', '-i', str(MUSIC),
           '-filter_complex', f'[1:a]volume=0.55,afade=t=in:st=0:d=2,afade=t=out:st={max(0, d - 2.5):.2f}:d=2.5[a]',
           '-map', '0:v:0', '-map', '[a]', '-t', f'{d:.2f}',
           '-c:v', 'libx264', '-preset', 'medium', '-crf', '27', '-pix_fmt', 'yuv420p', '-r', '25', '-profile:v', 'main', '-level', '4.0',
           '-c:a', 'aac', '-b:a', '80k', '-ac', '1', '-movflags', '+faststart', str(mp4)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print('FEHLER', name, r.stderr[-800:]); continue
    done += 1
    print(f'{name}: {d:.0f} s, {mp4.stat().st_size / 1e6:.1f} MB')
total = sum(p.stat().st_size for p in OUT.glob('*.mp4')) / 1e6
print(f'fertig: {done} neu, {len(list(OUT.glob("*.mp4")))} Videos, {total:.0f} MB gesamt')
