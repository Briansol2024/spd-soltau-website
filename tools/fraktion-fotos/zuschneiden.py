# Schneidet die Fraktionsfotos einheitlich zu: quadratisch, Kopf und Schultern, alle Köpfe gleich groß,
# Augen auf gleicher Höhe. Quelle: tools/fraktion-fotos/original/<slug>.jpg  ->  src/images/fraktion/<slug>.jpg
# Es wird nur die Lage der Augen bestimmt (OpenCV-Kaskaden), keine Person erkannt.
# Kopfgröße = Mittel aus Augenabstand und Kopfhöhe (Scheitel bis Kinn, von Hand gemessen in masse.json).
# Nur der Augenabstand allein täuscht bei leicht gedrehten Köpfen, nur die Kopfhöhe bei Frisur und Bart.
# Aufruf:  python tools/fraktion-fotos/zuschneiden.py  [--rahmen 6.2] [--augen 0.39]
import argparse, glob, os
import cv2, numpy as np
from PIL import Image, ImageFilter

HIER = os.path.dirname(os.path.abspath(__file__))
QUELLE = os.path.join(HIER, 'original')
ZIEL = os.path.join(HIER, '..', '..', 'src', 'images', 'fraktion')

ap = argparse.ArgumentParser()
ap.add_argument('--rahmen', type=float, default=6.2, help='Bildbreite als Vielfaches des Augenabstands (kleiner = näher dran)')
ap.add_argument('--augen', type=float, default=0.39, help='Höhe der Augenlinie von oben, Anteil der Bildhöhe')
ap.add_argument('--groesse', type=int, default=800, help='Kantenlänge des fertigen Quadrats in Pixeln')
ap.add_argument('--ziel', default=ZIEL)
a = ap.parse_args()

gesicht = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_alt2.xml')
augen = [cv2.CascadeClassifier(cv2.data.haarcascades + f) for f in ('haarcascade_eye_tree_eyeglasses.xml', 'haarcascade_eye.xml')]

def augenpaar(g):
    f = gesicht.detectMultiScale(g, 1.03, 5, minSize=(150, 150)).tolist()
    if not f: raise SystemExit('kein Gesicht gefunden')
    x, y, w, h = sorted(f, key=lambda r: r[1])[0]          # oberstes Gesicht (unten gibt es Fehltreffer an Händen)
    oy = y + int(h * .15); roi = g[oy:y + int(h * .6), x:x + w]
    for c in augen:
        for mn in (6, 4, 3):
            e = c.detectMultiScale(roi, 1.05, mn, minSize=(w // 10, w // 10), maxSize=(w // 3, w // 3)).tolist()
            L = [r for r in e if r[0] + r[2] / 2 < w / 2]; R = [r for r in e if r[0] + r[2] / 2 >= w / 2]
            if L and R:
                l = max(L, key=lambda r: r[2]); r = max(R, key=lambda r: r[2])
                return (x + l[0] + l[2] / 2, oy + l[1] + l[3] / 2), (x + r[0] + r[2] / 2, oy + r[1] + r[3] / 2)
    raise SystemExit('Augen nicht gefunden')

import json
MASSE = {k: v for k, v in json.load(open(os.path.join(HIER, 'masse.json'), encoding='utf-8')).items() if not k.startswith('_')}
os.makedirs(a.ziel, exist_ok=True)
daten = {}
for pfad in sorted(glob.glob(os.path.join(QUELLE, '*.jpg'))):
    bild = cv2.imread(pfad)
    (lx, ly), (rx, ry) = augenpaar(cv2.cvtColor(bild, cv2.COLOR_BGR2GRAY))
    daten[pfad] = (bild, lx, ly, rx, ry, ((rx - lx) ** 2 + (ry - ly) ** 2) ** .5)
# Verhältnis Kopfhöhe : Augenabstand im Mittel aller Fotos
K = sum((MASSE[os.path.basename(p)[:-4]]['kinn'] - MASSE[os.path.basename(p)[:-4]]['scheitel']) / v[5] for p, v in daten.items()) / len(daten)
bericht = []
for pfad, (bild, lx, ly, rx, ry, d) in daten.items():
    name = os.path.basename(pfad); H, W = bild.shape[:2]
    m = MASSE[name[:-4]]; kopf = m['kinn'] - m['scheitel']
    d_eff = (d + kopf / K) / 2
    seite = d_eff * a.rahmen
    mx, my = (lx + rx) / 2, (ly + ry) / 2
    x0, y0 = mx - seite / 2, my - seite * a.augen
    # Ragt der Ausschnitt oben/seitlich etwas über das Foto hinaus, wird der rote Hintergrund gespiegelt fortgesetzt
    rand = int(max(0, -x0, -y0, x0 + seite - W, y0 + seite - H)) + 2
    if rand > 2: bild = cv2.copyMakeBorder(bild, rand, rand, rand, rand, cv2.BORDER_REFLECT)
    else: rand = 0
    M = np.float32([[a.groesse / seite, 0, -(x0 + rand) * a.groesse / seite], [0, a.groesse / seite, -(y0 + rand) * a.groesse / seite]])
    aus = cv2.warpAffine(bild, M, (a.groesse, a.groesse), flags=cv2.INTER_LANCZOS4)
    pil = Image.fromarray(cv2.cvtColor(aus, cv2.COLOR_BGR2RGB))
    faktor = a.groesse / seite
    if faktor > 1.05: pil = pil.filter(ImageFilter.UnsharpMask(radius=1.2, percent=40, threshold=2))
    pil.save(os.path.join(a.ziel, name), quality=86, optimize=True, progressive=True)
    bericht.append((name, d * faktor, kopf * faktor, (m['scheitel'] - y0) * faktor, (m['kinn'] - y0) * faktor, faktor, rand))
print(f'Kopfhöhe/Augenabstand im Mittel: {K:.2f}')
print('Foto                   Augenabstand  Kopfhöhe  Scheitel  Kinn   (Pixel im fertigen Bild)  Vergr.  Rand')
for n, dd, kk, sc, ki, f, r in bericht:
    print(f'{n:22s} {dd:8.1f}  {kk:9.1f}  {sc:8.1f}  {ki:6.1f}                          {f:5.2f}  {r:4d}')
