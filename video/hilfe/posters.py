# Videocover für die Hilfevideos: große Nummer, Titel, SPD-Look. Je Thema quer (1280×720) und hoch (720×1280).
#   python video/hilfe/posters.py   → src/hilfe/NN-id.jpg und NN-id-hoch.jpg
import json, os, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent.parent
OUT = ROOT / 'src' / 'hilfe'; OUT.mkdir(parents=True, exist_ok=True)
F_VERSAL = str(ROOT / 'video' / 'fonts' / 'thesans-versal-extrabold.ttf')
F_BOLD = str(ROOT / 'video' / 'fonts' / 'thesans-bold.ttf')
F_REG = str(ROOT / 'video' / 'fonts' / 'thesans-regular.ttf')
LOGO = ROOT / 'src' / 'images' / 'logo-spd-soltau-weiss.png'
ROT, SCHWARZ, WEISS = (227, 0, 15), (15, 15, 15), (255, 255, 255)

# Themen aus der gemeinsamen Quelle (src/lib/hilfe.mjs) über Node lesen
topics = json.loads(subprocess.run(['node', '-e', "import('./src/lib/hilfe.mjs').then(m => console.log(JSON.stringify(m.HELP_TOPICS.map(t => ({ n: t.n, id: t.id, title: t.title, group: t.group })))))"], cwd=ROOT, capture_output=True, text=True, check=True).stdout)

def font(p, size): return ImageFont.truetype(p, size)
def wrap(draw, text, fnt, width):
    words, lines, cur = text.split(' '), [], ''
    for w in words:
        test = (cur + ' ' + w).strip()
        if draw.textlength(test, font=fnt) <= width or not cur: cur = test
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def logo(h):
    im = Image.open(LOGO).convert('RGBA'); return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)

def poster(t, W, H, path):
    im = Image.new('RGB', (W, H), ROT); d = ImageDraw.Draw(im)
    portrait = H > W
    m = 56 if portrait else 64
    lg = logo(84 if portrait else 96); im.paste(lg, (m, m), lg)
    f_small = font(F_BOLD, 26 if portrait else 28)
    d.text((m + lg.width + 24, m + (lg.height - 30) // 2), 'Hilfe & Anleitungen', font=f_small, fill=WEISS)
    # große Nummer
    f_num = font(F_VERSAL, 400 if portrait else 300)
    num_y = 240 if portrait else 150
    bb = d.textbbox((m - 8, num_y), t['n'], font=f_num)
    d.text((m - 8, num_y), t['n'], font=f_num, fill=WEISS)
    # Titel im schwarzen Kasten, unter der Nummer
    f_title = font(F_VERSAL, 52 if portrait else 54)
    box_w = W - 2 * m
    lines = wrap(d, t['title'].upper(), f_title, box_w - 60)
    lh = (f_title.size + 10)
    box_h = 40 + lh * len(lines) + 20
    box_y = bb[3] + 36
    if box_y + box_h > H - m - 70: box_y = H - m - 70 - box_h
    d.rectangle((m, box_y, m + box_w, box_y + box_h), fill=SCHWARZ)
    y = box_y + 30
    for line in lines:
        d.text((m + 30, y), line, font=f_title, fill=WEISS); y += lh
    # Gruppe + Hinweis
    f_meta = font(F_REG, 26 if portrait else 28)
    d.text((m, H - m - 34), f"{t['group']}  ·  SPD Soltau App", font=f_meta, fill=WEISS)
    # Play-Dreieck rechts unten
    r = 44
    cx, cy = W - m - r, H - m - r
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=WEISS)
    d.polygon([(cx - 14, cy - 22), (cx - 14, cy + 22), (cx + 24, cy)], fill=ROT)
    im.save(path, 'JPEG', quality=86, optimize=True)

for t in topics:
    poster(t, 1280, 720, OUT / f"{t['n']}-{t['id']}.jpg")
    poster(t, 720, 1280, OUT / f"{t['n']}-{t['id']}-hoch.jpg")
print('ok', len(topics) * 2, 'Poster ->', OUT)
