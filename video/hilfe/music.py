# Fröhliche, leichte Hintergrundmusik für die Hilfevideos – selbst erzeugt (keine Lizenzfragen):
# flotter Puls mit weichem Kick und Shaker, hüpfender Bass, gezupfte Melodie in Dur, dazu ein paar Glöckchen.
# Ausgabe: video/hilfe/music.wav (ca. 74 s, nahtlos wiederholbar)
#   python video/hilfe/music.py
import numpy as np, wave, os
SR = 44100
BPM = 106
BEAT = 60 / BPM
BAR = 4 * BEAT
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'music.wav')
rng = np.random.default_rng(3)

def note(n): return 440 * 2 ** ((n - 69) / 12)

# Akkordfolge in C-Dur, je ein Takt: C – G – Am – F (fröhlich, vertraut), zweimal mit kleiner Variante (C – G – F – G)
PROG = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]] * 3 + [[60, 64, 67], [55, 59, 62], [53, 57, 60], [55, 59, 62]]
ROOTS = [48, 43, 45, 41] * 3 + [48, 43, 41, 43]
TOTAL = len(PROG) * BAR * 2  # zwei Durchläufe
N = int(TOTAL * SR)
mix = np.zeros(N)

def add(sig, start):
    s = int(start * SR)
    if s >= N: return
    n = min(len(sig), N - s)
    mix[s:s + n] += sig[:n]

def env_ad(n, a, d, sustain=0.0):
    e = np.ones(n); na = int(a * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    tt = np.arange(n) / SR
    e *= np.maximum(sustain, np.exp(-tt / d))
    return e

def pluck(freq, dur, gain):  # gezupfter Ton: schneller Anschlag, weicher Ausklang, leichte Obertöne
    n = int(dur * SR); tt = np.arange(n) / SR
    w = np.sin(2 * np.pi * freq * tt) + 0.45 * np.sin(2 * np.pi * 2 * freq * tt) * np.exp(-tt * 6) + 0.2 * np.sin(2 * np.pi * 3 * freq * tt) * np.exp(-tt * 9)
    return w * env_ad(n, 0.004, 0.42) * gain

def bell(freq, dur, gain):  # Glöckchen: hell, schnell abklingend, leicht unharmonisch
    n = int(dur * SR); tt = np.arange(n) / SR
    w = np.sin(2 * np.pi * freq * tt) + 0.5 * np.sin(2 * np.pi * freq * 2.76 * tt) * np.exp(-tt * 8) + 0.25 * np.sin(2 * np.pi * freq * 5.4 * tt) * np.exp(-tt * 12)
    return w * env_ad(n, 0.002, 0.5) * gain

def bass(freq, dur, gain):
    n = int(dur * SR); tt = np.arange(n) / SR
    w = np.sin(2 * np.pi * freq * tt) + 0.3 * np.sin(2 * np.pi * 2 * freq * tt) * np.exp(-tt * 4)
    return w * env_ad(n, 0.006, 0.28, 0.0) * gain

def pad(freqs, dur, gain):
    n = int(dur * SR); tt = np.arange(n) / SR
    w = np.zeros(n)
    for f in freqs:
        w += np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * 2 * f * tt + 0.4) + np.sin(2 * np.pi * f * 1.003 * tt + 1.0)
    e = np.ones(n); na = int(0.08 * SR); e[:na] = np.linspace(0, 1, na); nr = int(0.25 * SR); e[-nr:] *= np.linspace(1, 0, nr)
    return w / (len(freqs) * 2.25) * e * gain

def kick(gain):
    n = int(0.22 * SR); tt = np.arange(n) / SR
    f = 95 * np.exp(-tt * 22) + 42
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 16) * gain

def shaker(gain, dur=0.07):
    n = int(dur * SR); noise = rng.standard_normal(n)
    noise = np.diff(np.concatenate([[0], noise]))  # hell (Hochpass)
    return noise * np.exp(-np.arange(n) / SR * 55) * gain

def clap(gain):
    n = int(0.12 * SR); noise = rng.standard_normal(n)
    noise = np.convolve(noise, np.ones(6) / 6, mode='same')
    return noise * np.exp(-np.arange(n) / SR * 32) * gain

# Melodie-Muster (Achtel) über Akkordtöne + Durchgangstöne der C-Dur-Pentatonik, je Takt eine Figur; -1 = Pause
PATTERNS = [
    [0, 1, 2, 1, 0, 2, -1, 1],
    [2, -1, 1, 0, 1, 2, 3, -1],
    [0, 2, 3, 2, 1, -1, 0, 1],
    [1, 0, -1, 1, 2, 1, 0, -1],
]
PENTA = [0, 2, 4, 7, 9]  # Halbtöne über C (Pentatonik)
def melody_note(chord, idx, octave_up):
    tones = sorted(set(chord + [c + 12 for c in chord]))
    return tones[idx % len(tones)] + (12 if octave_up else 0)

pos = 0.0
for rnd in range(2):
    for bar_i, (chord, root) in enumerate(zip(PROG, ROOTS)):
        # Fläche (leise, weich)
        add(pad([note(m + 12) for m in chord], BAR + 0.1, 0.10), pos)
        # Bass: Grundton auf 1 und 3, Quinte auf 2 und 4 (hüpfend)
        for b in range(4):
            m = root if b % 2 == 0 else root + 7
            add(bass(note(m), BEAT * 0.9, 0.30), pos + b * BEAT)
        # Schlagwerk: Kick auf 1 und 3, Clap auf 2 und 4 (leise), Shaker auf jeder Achtel mit Akzent auf den Und-Zählzeiten
        for b in range(4):
            if b % 2 == 0: add(kick(0.55), pos + b * BEAT)
            else: add(clap(0.06), pos + b * BEAT)
        for e in range(8):
            add(shaker(0.030 if e % 2 else 0.018, 0.06 if e % 2 else 0.045), pos + e * BEAT / 2 + rng.random() * 0.004)
        # Melodie: gezupft, Achtel-Figur; im zweiten Durchlauf eine Oktave höher und etwas lauter
        pat = PATTERNS[(bar_i + rnd) % len(PATTERNS)]
        for e, idx in enumerate(pat):
            if idx < 0: continue
            m = melody_note(chord, idx, rnd == 1)
            add(pluck(note(m + 12), 0.9, 0.16 + rng.random() * 0.03), pos + e * BEAT / 2 + rng.random() * 0.006)
        # Glöckchen beim Akkordwechsel (jeden zweiten Takt), auf der 1
        if bar_i % 2 == 0: add(bell(note(chord[0] + 36), 1.4, 0.05), pos)
        pos += BAR

# etwas Raum, weicher Höhenschliff, nahtlose Schleife
def delay(sig, sec, g):
    d = int(sec * SR); out = sig.copy(); out[d:] += g * sig[:-d]; return out
mix = delay(mix, 0.19, 0.16)
mix = delay(mix, 0.31, 0.10)
mix = np.convolve(mix, np.ones(6) / 6, mode='same')
fade = int(1.5 * SR)
mix[:fade] *= np.linspace(0, 1, fade)
mix[-fade:] *= np.linspace(1, 0, fade)
# sanfte Begrenzung, dann Pegel
mix = np.tanh(mix / (np.max(np.abs(mix)) + 1e-9) * 1.6) * 0.62
data = (mix * 32767).astype(np.int16)
with wave.open(OUT, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())
print('ok', OUT, round(TOTAL, 1), 's')
