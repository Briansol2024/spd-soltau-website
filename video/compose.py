# Schneidet das Instagram-Video (1080×1920, 30 fps, ~30 s) aus Screencast, Texttafeln, Untertiteln und Sprecherstimme.
#   python video/compose.py
import asyncio, os, re, subprocess, sys, math, shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
V = ROOT / 'video'; TMP = V / 'tmp'; OUT = V / 'out'; FR = TMP / 'frames'; SC = TMP / 'sc'
FFMPEG = str(ROOT / 'node_modules' / 'ffmpeg-static' / 'ffmpeg.exe')
W, H, FPS = 1080, 1920, 30
ROT, SCHWARZ, WEISS = (227, 0, 15), (15, 15, 15), (255, 255, 255)
F_VERSAL = str(V / 'fonts' / 'thesans-versal-extrabold.ttf')
F_BOLD = str(V / 'fonts' / 'thesans-bold.ttf')
F_REG = str(V / 'fonts' / 'thesans-regular.ttf')
LOGO = ROOT / 'src' / 'images' / 'logo-spd-soltau-weiss.png'
VOICE = os.environ.get('VOICE', 'de-DE-KatjaNeural')

# ---------- Drehbuch ----------
TITLE_END, SC_END, TOTAL = 3.0, 26.0, 30.0
VOICE_SEGS = [  # (Startzeit, Text) – Segmente dürfen sich nicht überlappen
    (0.35, 'Moin Soltau! Die SPD Soltau hat eine neue Website.'),
    (5.0,  'Alles auf einen Blick: Aktuelles aus dem Rat, alle Termine und unser Team.'),
    (14.4, 'Unsere elf Ratsmitglieder – mit Foto und Kurzprofil.'),
    (20.4, 'Ihr habt ein Anliegen? Schreibt uns direkt – wir antworten.'),
    (26.3, 'Jetzt entdecken auf spd-soltau.de.'),
]
CAPTIONS = [  # (von, bis, Text)
    (3.0, 14.2, 'ALLES AUF EINEN BLICK:\nAKTUELLES, TERMINE, TEAM'),
    (14.2, 20.2, 'UNSERE 11 IM STADTRAT\nMIT FOTO UND PROFIL'),
    (20.2, 26.0, 'IHR ANLIEGEN?\nSCHREIBT UNS DIREKT.'),
]

def font(path, size): return ImageFont.truetype(path, size)

def text_center(draw, y, text, fnt, fill, spacing=10):
    lines = text.split('\n')
    for line in lines:
        w = draw.textlength(line, font=fnt)
        draw.text(((W - w) / 2, y), line, font=fnt, fill=fill)
        y += fnt.size + spacing
    return y

def logo(height):
    im = Image.open(LOGO).convert('RGBA')
    return im.resize((round(im.width * height / im.height), height), Image.LANCZOS)

def title_card():
    im = Image.new('RGB', (W, H), ROT); d = ImageDraw.Draw(im)
    lg = logo(240); im.paste(lg, ((W - lg.width) // 2, 430), lg)
    y = text_center(d, 760, 'NEUE\nWEBSITE', font(F_VERSAL, 190), WEISS, spacing=0)
    text_center(d, y + 40, 'spd-soltau.de', font(F_BOLD, 76), WEISS)
    text_center(d, 1500, 'AUS LIEBE ZU SOLTAU', font(F_VERSAL, 48), WEISS)
    return im

def end_card():
    im = Image.new('RGB', (W, H), SCHWARZ); d = ImageDraw.Draw(im)
    lg = logo(200); im.paste(lg, ((W - lg.width) // 2, 400), lg)
    text_center(d, 700, 'JETZT\nENTDECKEN', font(F_VERSAL, 170), WEISS, spacing=0)
    # roter Balken mit Adresse
    d.rectangle((120, 1110, W - 120, 1260), fill=ROT)
    text_center(d, 1136, 'spd-soltau.de', font(F_BOLD, 80), WEISS)
    text_center(d, 1420, 'AUS LIEBE ZU SOLTAU.', font(F_VERSAL, 54), ROT)
    text_center(d, 1500, 'SPD Ortsverein & Ratsfraktion Soltau', font(F_REG, 34), (200, 200, 200))
    return im

# Handy-Rahmen: Inhalt 700×1517 (9:19.5), Rand 16 px, abgerundet
PW, PH_, BZ, R_OUT, R_IN = 700, 1517, 16, 60, 44
PX, PY = (W - PW - 2 * BZ) // 2, 180

def phone_mask():
    m = Image.new('L', (PW, PH_), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, PW - 1, PH_ - 1), R_IN, fill=255); return m
MASK = phone_mask()

def background():
    im = Image.new('RGB', (W, H), ROT); d = ImageDraw.Draw(im)
    lg = logo(96); im.paste(lg, ((W - lg.width) // 2, 48), lg)
    # Schatten + Bezel
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(sh)
    sd.rounded_rectangle((PX + 18, PY + 26, PX + PW + 2 * BZ + 18, PY + PH_ + 2 * BZ + 26), R_OUT, fill=(0, 0, 0, 120))
    sh = sh.filter(ImageFilter.GaussianBlur(22)); im.paste(sh, (0, 0), sh)
    d.rounded_rectangle((PX, PY, PX + PW + 2 * BZ, PY + PH_ + 2 * BZ), R_OUT, fill=SCHWARZ)
    return im
BG = background()

def caption_layer(text):
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    fnt = font(F_VERSAL, 54); lines = text.split('\n'); lh = 64
    y = PY + PH_ + 2 * BZ + 34
    for line in lines:
        w = d.textlength(line, font=fnt)
        d.text(((W - w) / 2, y), line, font=fnt, fill=WEISS); y += lh
    return layer
CAP_LAYERS = [(a, b, caption_layer(t)) for a, b, t in CAPTIONS]

def fade(im, alpha):  # alpha 0..1 → schwarz
    if alpha >= 1: return im
    return Image.blend(Image.new('RGB', im.size, SCHWARZ), im, alpha)

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0: print(r.stderr[-2000:]); sys.exit(1)
    return r

def duration(path):
    r = subprocess.run([FFMPEG, '-hide_banner', '-i', str(path)], capture_output=True, text=True)
    m = re.search(r'Duration: (\d+):(\d+):([\d.]+)', r.stderr); return int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3])

def speech_end(path):
    # Ende der Sprache (ohne die Stille am Schluss, die die TTS anhängt)
    total = duration(path)
    r = subprocess.run([FFMPEG, '-hide_banner', '-i', str(path), '-af', 'silencedetect=noise=-40dB:d=0.25', '-f', 'null', '-'], capture_output=True, text=True)
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', r.stderr)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', r.stderr)]
    if starts and (len(ends) < len(starts) or abs(ends[-1] - total) < 0.05): return starts[-1]
    return total

async def tts():
    import edge_tts, hashlib
    paths = []
    for _, text in VOICE_SEGS:
        p = TMP / ('voice-' + hashlib.md5((VOICE + text).encode()).hexdigest()[:10] + '.mp3')
        if not p.exists():
            await edge_tts.Communicate(text, VOICE, rate='+4%').save(str(p))
        paths.append(p)
    return paths

def main():
    for d in (FR, SC, OUT): d.mkdir(parents=True, exist_ok=True)
    for f in FR.glob('*.jpg'): f.unlink()
    for f in SC.glob('*.jpg'): f.unlink()
    # 1) Sprecherstimme
    voices = asyncio.run(tts())
    durs = [speech_end(p) for p in voices]
    for (t, txt), dur in zip(VOICE_SEGS, durs): print(f'  Stimme {t:5.1f}s + {dur:4.1f}s  bis {t + dur:5.1f}s  {txt}')
    for (t0, _), d0, (t1, _) in zip(VOICE_SEGS, durs, VOICE_SEGS[1:]):
        if t0 + d0 > t1: print(f'  WARNUNG: Überlappung bei {t1}s'); 
    # 2) Screencast in Einzelbilder (30 fps)
    sc_len = SC_END - TITLE_END
    run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(TMP / 'screencast.webm'), '-t', str(sc_len), '-vf', f'fps={FPS}', '-q:v', '3', str(SC / '%05d.jpg')])
    sc_frames = sorted(SC.glob('*.jpg')); print('  Screencast-Frames:', len(sc_frames))
    # 3) Bilder zusammensetzen
    title, end = title_card(), end_card()
    n = int(TOTAL * FPS)
    for i in range(n):
        t = i / FPS
        if t < TITLE_END:
            a = min(1, t / 0.5) * min(1, (TITLE_END - t) / 0.35)
            im = fade(title, a)
        elif t < SC_END:
            k = min(len(sc_frames) - 1, int((t - TITLE_END) * FPS))
            fr = Image.open(sc_frames[k]).convert('RGB').resize((PW, PH_), Image.LANCZOS)
            im = BG.copy(); im.paste(fr, (PX + BZ, PY + BZ), MASK)
            for a0, b0, layer in CAP_LAYERS:
                if a0 <= t < b0:
                    ca = min(1, (t - a0) / 0.3) * min(1, (b0 - t) / 0.25)
                    if ca < 1: layer = Image.eval(layer.split()[3], lambda v, ca=ca: int(v * ca)); layer = Image.merge('RGBA', (*Image.new('RGB', (W, H), WEISS).split(), layer))
                    im.paste(layer, (0, 0), layer)
            a = min(1, (t - TITLE_END) / 0.35) * min(1, (SC_END - t) / 0.35)
            im = fade(im, a)
        else:
            a = min(1, (t - SC_END) / 0.4) * min(1, (TOTAL - t) / 0.6)
            im = fade(end, a)
        im.save(FR / f'{i:05d}.jpg', quality=92)
        if i % 150 == 0: print(f'  Bild {i}/{n}')
    # 4) Ton: Segmente zeitlich platzieren und mischen
    inputs = []; filt = []
    for i, (p, (t, _)) in enumerate(zip(voices, VOICE_SEGS)):
        inputs += ['-i', str(p)]; ms = int(t * 1000); filt.append(f'[{i}]atrim=0:{durs[i] + 0.15:.2f},aresample=48000,adelay={ms}|{ms}[a{i}]')
    filt.append(''.join(f'[a{i}]' for i in range(len(voices))) + f'amix=inputs={len(voices)}:normalize=0:dropout_transition=0,volume=1.6,apad=whole_dur={TOTAL}[a]')
    audio = TMP / 'audio.m4a'
    run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', *inputs, '-filter_complex', ';'.join(filt), '-map', '[a]', '-t', str(TOTAL), '-c:a', 'aac', '-b:a', '160k', str(audio)])
    # 5) Encodieren
    out = OUT / 'spd-soltau-instagram-9x16.mp4'
    run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', '-framerate', str(FPS), '-i', str(FR / '%05d.jpg'), '-i', str(audio),
         '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-c:a', 'copy', '-shortest', '-movflags', '+faststart', str(out)])
    print('  Fertig:', out, round(out.stat().st_size / 1e6, 1), 'MB')

if __name__ == '__main__': main()
