# Musik für die Keynote-Rundgänge – selbst erzeugt (keine Lizenzfragen): ruhiger, dramatischer Anfang, dann treibender Beat.
#   python video/hilfe/keynote_music.py     -> video/hilfe/keynote.wav (ca. 170 s)
import numpy as np, wave, os
SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(7)
def note(n): return 440 * 2 ** ((n - 69) / 12)

class Track:
    def __init__(self, seconds): self.N = int(seconds * SR); self.mix = np.zeros(self.N)
    def add(self, sig, start):
        s = int(start * SR)
        if s >= self.N or s < 0: return
        n = min(len(sig), self.N - s); self.mix[s:s + n] += sig[:n]

def env(n, a, d, sustain=0.0):
    e = np.ones(n); na = int(a * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    tt = np.arange(n) / SR
    return e * np.maximum(sustain, np.exp(-tt / d))

def kick(gain, punch=90, dur=0.28):
    n = int(dur * SR); tt = np.arange(n) / SR
    f = punch * np.exp(-tt * 20) + 44
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 12) * gain
def boom(gain):  # tiefer Schlag mit langem Ausklang (Kapitelanfang)
    n = int(1.6 * SR); tt = np.arange(n) / SR
    f = 120 * np.exp(-tt * 9) + 38
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 2.2) + 0.2 * rng.standard_normal(n) * np.exp(-tt * 30)) * gain
def hat(gain, dur=0.05):
    n = int(dur * SR); noise = np.diff(np.concatenate([[0], rng.standard_normal(n)]))
    return noise * np.exp(-np.arange(n) / SR * 70) * gain
def clap(gain, dur=0.14):
    n = int(dur * SR); noise = np.convolve(rng.standard_normal(n), np.ones(5) / 5, mode='same')
    return noise * np.exp(-np.arange(n) / SR * 28) * gain
def bass(freq, dur, gain):
    n = int(dur * SR); tt = np.arange(n) / SR
    w = np.sin(2 * np.pi * freq * tt) + 0.35 * np.sin(2 * np.pi * 2 * freq * tt) * np.exp(-tt * 5) + 0.12 * np.sign(np.sin(2 * np.pi * freq * tt)) * np.exp(-tt * 3)
    return w * env(n, 0.005, 0.3) * gain
def pad(freqs, dur, gain, attack=0.6, release=0.6):
    n = int(dur * SR); tt = np.arange(n) / SR; w = np.zeros(n)
    for f in freqs: w += np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt + 0.4) + np.sin(2 * np.pi * f * 1.004 * tt + 1.0) + 0.5 * np.sin(2 * np.pi * f * 0.5 * tt)
    e = np.ones(n); na = int(attack * SR); e[:na] = np.linspace(0, 1, na) ** 2; nr = int(release * SR); e[-nr:] *= np.linspace(1, 0, nr)
    return w / (len(freqs) * 2.8) * e * gain
def pluck(freq, dur, gain, cutoff=1.0):
    n = int(dur * SR); tt = np.arange(n) / SR; w = np.zeros(n)
    for k in range(1, 8): w += np.sin(2 * np.pi * k * freq * tt) / k * np.exp(-tt * (2 + k * 4) / cutoff)
    return w * env(n, 0.003, 0.3) * gain
def riser(dur, gain):  # Rauschen, das anschwillt – vor dem Einsatz
    n = int(dur * SR); tt = np.arange(n) / SR
    noise = np.convolve(rng.standard_normal(n), np.ones(3) / 3, mode='same')
    return noise * (tt / dur) ** 2.5 * gain
def finish(track, level=0.62):
    m = track.mix
    for sec, g in ((0.17, 0.15), (0.31, 0.09)):
        d = int(sec * SR); o = m.copy(); o[d:] += g * m[:-d]; m = o
    m = np.convolve(m, np.ones(4) / 4, mode='same')
    fade = int(1.0 * SR); m[:fade] *= np.linspace(0, 1, fade); m[-fade:] *= np.linspace(1, 0, fade)
    return np.tanh(m / (np.max(np.abs(m)) + 1e-9) * 1.7) * level

BPM = 112; BEAT = 60 / BPM; BAR = 4 * BEAT
# D-Moll: Dm – B – F – C (i – VI – III – VII), Bass-Grundtöne
PROG = [[62, 65, 69], [58, 62, 65], [57, 60, 65], [60, 64, 67]]
ROOTS = [38, 34, 41, 36]
BARS = 56  # ca. 120 s Beat + 10 s Intro
INTRO = 9.5
t = Track(INTRO + BARS * BAR + 3)
# Intro: Fläche schwillt, drei tiefe Schläge, Riser in den Beat
t.add(pad([note(m) for m in [50, 57, 62]], INTRO + 0.5, 0.5, attack=2.5, release=0.4), 0)
for k, at in enumerate([0.8, 3.6, 6.4]): t.add(boom(0.55 + 0.1 * k), at)
t.add(riser(3.2, 0.16), INTRO - 3.2)
pos = INTRO
for bar in range(BARS):
    chord, root = PROG[bar % 4], ROOTS[bar % 4]
    full = bar >= 4           # ab Takt 5 alles
    if bar % 8 == 0: t.add(boom(0.5), pos)
    if bar % 8 == 7: t.add(riser(BAR, 0.12), pos)
    for b in range(4):
        t.add(kick(0.62, punch=100), pos + b * BEAT)
        if b % 2 == 1: t.add(clap(0.13), pos + b * BEAT)
        for e in range(4):
            if full or e % 2 == 0: t.add(hat(0.05 if e % 2 == 0 else 0.028, 0.05 if e % 2 == 0 else 0.035), pos + b * BEAT + e * BEAT / 4)
        t.add(bass(note(root), BEAT * 0.48, 0.3), pos + b * BEAT)
        t.add(bass(note(root), BEAT * 0.3, 0.2), pos + b * BEAT + BEAT / 2)
    if full:
        tones = sorted(set(chord + [c + 12 for c in chord]))
        seq = [0, 3, 5, 3, 1, 4, 5, 4, 2, 5, 3, 5, 0, 4, 2, 4]
        for e, idx in enumerate(seq): t.add(pluck(note(tones[idx % len(tones)] + 12), 0.4, 0.085 if e % 4 == 0 else 0.06, cutoff=1.0 if e % 4 == 0 else 0.75), pos + e * BEAT / 4)
    t.add(pad([note(m) for m in chord], BAR, 0.16, attack=0.15, release=0.2), pos)
    pos += BAR
t.add(boom(0.6), pos)
data = finish(t)
with wave.open(os.path.join(HERE, 'keynote.wav'), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((data * 32767).astype(np.int16).tobytes())
print('ok', round(len(data) / SR, 1), 's')
