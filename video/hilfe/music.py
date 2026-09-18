# Hintergrundmusik für die Hilfevideos – selbst erzeugt (keine Lizenzfragen), in mehreren Stilen:
#   python video/hilfe/music.py                → Stil „ukulele“ (Standard) nach video/hilfe/music.wav
#   python video/hilfe/music.py ukulele        → video/hilfe/music.wav im Stil ukulele
#   python video/hilfe/music.py alle           → Proben aller Stile nach video/hilfe/proben/<stil>.wav
# Stile: pop (flott, Kick/Shaker, gezupfte Melodie) · ukulele (Sommer, geschrammelt, Klatschen, Pfeifmelodie)
#        piano (warm, leichte Klavier-Arpeggien, Besen) · elektro (frisch, Synth-Pluck, sanfter Vierviertel-Puls)
import numpy as np, wave, os, sys
SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(3)
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

def pluck(freq, dur, gain, bright=0.45):
    n = int(dur * SR); tt = np.arange(n) / SR
    w = np.sin(2 * np.pi * freq * tt) + bright * np.sin(2 * np.pi * 2 * freq * tt) * np.exp(-tt * 6) + 0.2 * np.sin(2 * np.pi * 3 * freq * tt) * np.exp(-tt * 9)
    return w * env(n, 0.004, 0.42) * gain

def piano(freq, dur, gain):  # klavierähnlich: mehrere Obertöne, unterschiedlich schnell abklingend, weicher Anschlag
    n = int(dur * SR); tt = np.arange(n) / SR
    w = (np.sin(2 * np.pi * freq * tt) * np.exp(-tt * 1.2) + 0.5 * np.sin(2 * np.pi * 2 * freq * tt) * np.exp(-tt * 2.5)
         + 0.25 * np.sin(2 * np.pi * 3 * freq * tt) * np.exp(-tt * 4) + 0.12 * np.sin(2 * np.pi * 4 * freq * tt) * np.exp(-tt * 6))
    return w * env(n, 0.006, 1.6) * gain

def bell(freq, dur, gain):
    n = int(dur * SR); tt = np.arange(n) / SR
    w = np.sin(2 * np.pi * freq * tt) + 0.5 * np.sin(2 * np.pi * freq * 2.76 * tt) * np.exp(-tt * 8) + 0.25 * np.sin(2 * np.pi * freq * 5.4 * tt) * np.exp(-tt * 12)
    return w * env(n, 0.002, 0.5) * gain

def bass(freq, dur, gain, soft=False):
    n = int(dur * SR); tt = np.arange(n) / SR
    w = np.sin(2 * np.pi * freq * tt) + (0.15 if soft else 0.3) * np.sin(2 * np.pi * 2 * freq * tt) * np.exp(-tt * 4)
    return w * env(n, 0.006, 0.28 if not soft else 0.5) * gain

def pad(freqs, dur, gain, attack=0.08, release=0.25):
    n = int(dur * SR); tt = np.arange(n) / SR; w = np.zeros(n)
    for f in freqs: w += np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * 2 * f * tt + 0.4) + np.sin(2 * np.pi * f * 1.003 * tt + 1.0)
    e = np.ones(n); na = int(attack * SR); e[:na] = np.linspace(0, 1, na); nr = int(release * SR); e[-nr:] *= np.linspace(1, 0, nr)
    return w / (len(freqs) * 2.25) * e * gain

def synth(freq, dur, gain, cutoff=1.0):  # Synth-Pluck: Sägezahn-artig (Obertonreihe), Filter „öffnet“ kurz beim Anschlag
    n = int(dur * SR); tt = np.arange(n) / SR; w = np.zeros(n)
    for k in range(1, 7): w += np.sin(2 * np.pi * k * freq * tt) / k * np.exp(-tt * (2 + k * 4) / cutoff)
    return w * env(n, 0.003, 0.35) * gain

def whistle(freq, dur, gain):  # Pfeifen: reiner Ton mit Vibrato und weichem Ein-/Ausschwingen
    n = int(dur * SR); tt = np.arange(n) / SR
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.5 * tt) * np.minimum(1, tt * 4)
    w = np.sin(2 * np.pi * freq * vib * tt) + 0.08 * np.sin(2 * np.pi * 2 * freq * tt)
    e = np.ones(n); na = int(0.06 * SR); e[:na] = np.linspace(0, 1, na) ** 2; nr = int(0.12 * SR); e[-nr:] *= np.linspace(1, 0, nr)
    return w * e * gain

def kick(gain, punch=95):
    n = int(0.22 * SR); tt = np.arange(n) / SR
    f = punch * np.exp(-tt * 22) + 42
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 16) * gain

def shaker(gain, dur=0.07):
    n = int(dur * SR); noise = np.diff(np.concatenate([[0], rng.standard_normal(n)]))
    return noise * np.exp(-np.arange(n) / SR * 55) * gain

def clap(gain, dur=0.12):
    n = int(dur * SR); noise = np.convolve(rng.standard_normal(n), np.ones(6) / 6, mode='same')
    return noise * np.exp(-np.arange(n) / SR * 32) * gain

def brush(gain):  # Besen: weiches, längeres Rauschen
    n = int(0.16 * SR); noise = np.convolve(rng.standard_normal(n), np.ones(14) / 14, mode='same')
    return noise * env(n, 0.03, 0.05) * gain

def strum(chord_midi, dur, gain, down=True):  # Ukulele-Schrammeln: Saiten kurz nacheinander
    n = int(dur * SR); out = np.zeros(n)
    order = chord_midi if down else chord_midi[::-1]
    for i, m in enumerate(order):
        s = int(i * 0.012 * SR); p = pluck(note(m), dur, gain, bright=0.6); out[s:] += p[:n - s]
    return out

def finish(track, room=(0.19, 0.16, 0.31, 0.10), smooth=6, level=0.62):
    m = track.mix
    for sec, g in ((room[0], room[1]), (room[2], room[3])):
        d = int(sec * SR); o = m.copy(); o[d:] += g * m[:-d]; m = o
    m = np.convolve(m, np.ones(smooth) / smooth, mode='same')
    fade = int(1.5 * SR); m[:fade] *= np.linspace(0, 1, fade); m[-fade:] *= np.linspace(1, 0, fade)
    return np.tanh(m / (np.max(np.abs(m)) + 1e-9) * 1.6) * level

# ---------------- Stile ----------------
def stil_pop():
    BPM = 106; BEAT = 60 / BPM; BAR = 4 * BEAT
    PROG = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]] * 3 + [[60, 64, 67], [55, 59, 62], [53, 57, 60], [55, 59, 62]]
    ROOTS = [48, 43, 45, 41] * 3 + [48, 43, 41, 43]
    PATTERNS = [[0, 1, 2, 1, 0, 2, -1, 1], [2, -1, 1, 0, 1, 2, 3, -1], [0, 2, 3, 2, 1, -1, 0, 1], [1, 0, -1, 1, 2, 1, 0, -1]]
    t = Track(len(PROG) * BAR * 2); pos = 0.0
    for rnd in range(2):
        for i, (chord, root) in enumerate(zip(PROG, ROOTS)):
            t.add(pad([note(m + 12) for m in chord], BAR + 0.1, 0.10), pos)
            for b in range(4):
                t.add(bass(note(root if b % 2 == 0 else root + 7), BEAT * 0.9, 0.30), pos + b * BEAT)
                t.add(kick(0.55) if b % 2 == 0 else clap(0.06), pos + b * BEAT)
            for e in range(8): t.add(shaker(0.030 if e % 2 else 0.018, 0.06 if e % 2 else 0.045), pos + e * BEAT / 2)
            tones = sorted(set(chord + [c + 12 for c in chord]))
            for e, idx in enumerate(PATTERNS[(i + rnd) % 4]):
                if idx >= 0: t.add(pluck(note(tones[idx % len(tones)] + 12 + (12 if rnd else 0)), 0.9, 0.17), pos + e * BEAT / 2)
            if i % 2 == 0: t.add(bell(note(chord[0] + 36), 1.4, 0.05), pos)
            pos += BAR
    return finish(t)

def stil_ukulele():
    BPM = 112; BEAT = 60 / BPM; BAR = 4 * BEAT
    # C – G – Am – F in Ukulele-Lage, Schrammelmuster: ab, ab, auf, auf, ab, auf (Achtel)
    PROG = [[60, 64, 67, 72], [55, 59, 62, 67], [57, 60, 64, 69], [53, 57, 60, 65]] * 4
    ROOTS = [48, 43, 45, 41] * 4
    MEL = [[72, 74, 76, -1, 79, 76, -1, 74], [71, -1, 74, 71, 67, -1, 69, 71], [72, 76, -1, 74, 72, -1, 69, -1], [69, 72, 74, -1, 72, 69, 67, -1]]
    t = Track(len(PROG) * BAR); pos = 0.0
    for i, (chord, root) in enumerate(zip(PROG, ROOTS)):
        pattern = [(0, True, .9), (1, True, .6), (2, False, .5), (3, False, .6), (4, True, .9), (5, False, .5), (6, True, .6), (7, False, .5)]
        for e, down, g in pattern: t.add(strum(chord, 0.6, 0.11 * g, down), pos + e * BEAT / 2)
        for b in range(4):
            t.add(bass(note(root if b % 2 == 0 else root + 7), BEAT * 0.9, 0.26, soft=True), pos + b * BEAT)
            if b % 2 == 1: t.add(clap(0.16), pos + b * BEAT)
        for e in range(8): t.add(shaker(0.022 if e % 2 else 0.012, 0.05), pos + e * BEAT / 2)
        if i >= 4:  # Pfeifmelodie ab dem zweiten Durchlauf
            for e, m in enumerate(MEL[i % 4]):
                if m > 0: t.add(whistle(note(m + 12), BEAT / 2 * 0.95, 0.09), pos + e * BEAT / 2)
        pos += BAR
    return finish(t, room=(0.23, 0.14, 0.37, 0.08))

def stil_piano():
    BPM = 96; BEAT = 60 / BPM; BAR = 4 * BEAT
    # F – C – Dm – Bb (warm, optimistisch), Achtel-Arpeggien im Klavier, leichter Besen
    PROG = [[53, 57, 60, 65], [48, 52, 55, 60], [50, 53, 57, 62], [46, 50, 53, 58]] * 4
    t = Track(len(PROG) * BAR); pos = 0.0
    for i, chord in enumerate(PROG):
        arp = [0, 1, 2, 3, 2, 3, 1, 2]
        for e, idx in enumerate(arp): t.add(piano(note(chord[idx] + 12), 1.2, 0.16 if e % 4 == 0 else 0.12), pos + e * BEAT / 2)
        t.add(piano(note(chord[0] - 12), BAR, 0.20), pos)  # Bassnote
        t.add(piano(note(chord[0]), BAR, 0.10), pos + 2 * BEAT)
        for b in range(4): t.add(brush(0.05 if b % 2 else 0.03), pos + b * BEAT)
        for e in range(1, 8, 2): t.add(shaker(0.010, 0.05), pos + e * BEAT / 2)
        if i >= 8:  # ab dem dritten Durchlauf eine kleine Melodie obendrauf
            mel = [[77, -1, 79, 81, -1, 79, 77, -1], [76, -1, 79, -1, 76, 74, -1, 72], [74, -1, 77, 81, -1, 79, 77, -1], [74, 77, -1, 74, 72, -1, 70, -1]][i % 4]
            for e, m in enumerate(mel):
                if m > 0: t.add(piano(note(m + 12), 1.0, 0.13), pos + e * BEAT / 2)
        pos += BAR
    return finish(t, room=(0.25, 0.2, 0.41, 0.12), smooth=8, level=0.6)

def stil_elektro():
    BPM = 118; BEAT = 60 / BPM; BAR = 4 * BEAT
    # D – A – Bm – G, Synth-Pluck in Sechzehnteln, sanfter Vierviertel-Kick, „atmende“ Fläche
    PROG = [[62, 66, 69], [57, 61, 64], [59, 62, 66], [55, 59, 62]] * 4
    ROOTS = [50, 45, 47, 43] * 4
    t = Track(len(PROG) * BAR); pos = 0.0
    for i, (chord, root) in enumerate(zip(PROG, ROOTS)):
        tones = sorted(set(chord + [c + 12 for c in chord]))
        seq = [0, 2, 4, 2, 1, 3, 5, 3, 0, 2, 4, 5, 3, 4, 2, 1]
        for e, idx in enumerate(seq): t.add(synth(note(tones[idx % len(tones)] + 12), 0.5, 0.11 if e % 4 == 0 else 0.08, cutoff=1.0 if e % 4 == 0 else 0.7), pos + e * BEAT / 4)
        for b in range(4):
            t.add(kick(0.5, punch=110), pos + b * BEAT)
            t.add(bass(note(root), BEAT * 0.45, 0.22), pos + b * BEAT)
            t.add(bass(note(root), BEAT * 0.35, 0.16), pos + b * BEAT + BEAT / 2)
            if b % 2 == 1: t.add(clap(0.10, 0.09), pos + b * BEAT)
            t.add(shaker(0.03, 0.05), pos + b * BEAT + BEAT / 2)
        # Fläche, die im Puls „atmet“ (pro Viertel neu eingeblendet)
        for b in range(4): t.add(pad([note(m + 12) for m in chord], BEAT, 0.12, attack=0.12, release=0.1), pos + b * BEAT)
        if i % 4 == 0: t.add(bell(note(chord[0] + 36), 1.2, 0.045), pos)
        pos += BAR
    return finish(t, room=(0.16, 0.14, 0.32, 0.08), smooth=4, level=0.6)

STILE = {'pop': stil_pop, 'ukulele': stil_ukulele, 'piano': stil_piano, 'elektro': stil_elektro}

def write(path, data):
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((data * 32767).astype(np.int16).tobytes())

arg = sys.argv[1] if len(sys.argv) > 1 else 'ukulele'
if arg == 'alle':
    os.makedirs(os.path.join(HERE, 'proben'), exist_ok=True)
    for name, fn in STILE.items():
        d = fn(); write(os.path.join(HERE, 'proben', name + '.wav'), d); print('ok', name, round(len(d) / SR, 1), 's')
else:
    d = STILE[arg](); write(os.path.join(HERE, 'music.wav'), d); print('ok', arg, round(len(d) / SR, 1), 's ->', os.path.join(HERE, 'music.wav'))
