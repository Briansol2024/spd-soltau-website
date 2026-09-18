# Entspannte Hintergrundmusik für die Hilfevideos – selbst erzeugt (keine Lizenzfragen): weicher Flächen-Klang mit
# langsamer Akkordfolge, dazu ein leises Arpeggio und etwas Raum. Ausgabe: video/hilfe/music.wav (ca. 96 s, nahtlos wiederholbar)
#   python video/hilfe/music.py
import numpy as np, wave, os
SR = 44100
BPM = 66
BEAT = 60 / BPM
BAR = 4 * BEAT
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'music.wav')

def note(n):  # MIDI → Hz
    return 440 * 2 ** ((n - 69) / 12)

# Akkordfolge (je 2 Takte): Cmaj7 · Am9 · Fmaj7 · G6 – in tiefer, warmer Lage
CHORDS = [
    [48, 55, 59, 64, 67],  # C  G  B  E  G
    [45, 52, 55, 59, 62],  # A  E  G  B  D
    [41, 48, 52, 57, 60],  # F  C  E  A  C
    [43, 50, 55, 59, 64],  # G  D  G  B  E
]
BARS_PER_CHORD = 2
TOTAL = len(CHORDS) * BARS_PER_CHORD * BAR * 2  # zwei Durchläufe ≈ 96 s
N = int(TOTAL * SR)
t = np.arange(N) / SR
mix = np.zeros(N)

def env_ad(length, a, r):
    e = np.ones(length)
    na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na) ** 2
    if nr: e[-nr:] *= np.linspace(1, 0, nr) ** 1.5
    return e

def pad(freq, start, dur, gain):
    n = int(dur * SR); s = int(start * SR)
    if s >= N: return
    n = min(n, N - s)
    tt = np.arange(n) / SR
    # weicher Klang: Grundton + leise Obertöne, sanftes Vibrato, zwei leicht verstimmte Stimmen
    v = 1 + 0.003 * np.sin(2 * np.pi * 0.2 * tt)
    w = (np.sin(2 * np.pi * freq * v * tt) + 0.35 * np.sin(2 * np.pi * 2 * freq * tt + 0.3) + 0.12 * np.sin(2 * np.pi * 3 * freq * tt)
         + np.sin(2 * np.pi * freq * 1.004 * tt + 1.1)) / 2.5
    mix[s:s + n] += w * env_ad(n, 2.2, 2.5) * gain

def pluck(freq, start, dur, gain):
    n = int(dur * SR); s = int(start * SR)
    if s >= N: return
    n = min(n, N - s)
    tt = np.arange(n) / SR
    w = np.sin(2 * np.pi * freq * tt) * np.exp(-tt * 2.6) + 0.3 * np.sin(2 * np.pi * 2 * freq * tt) * np.exp(-tt * 5)
    mix[s:s + n] += w * gain

rng = np.random.default_rng(7)
pos = 0.0
for rnd in range(2):
    for chord in CHORDS:
        dur = BARS_PER_CHORD * BAR
        for k, m in enumerate(chord):
            pad(note(m), pos, dur + 1.5, 0.13 if k else 0.17)
        # Arpeggio: Achtel, sanft, über die oberen Akkordtöne (nicht jeder Ton – wirkt lockerer)
        tones = chord[1:] + [chord[2] + 12]
        step = BEAT / 2
        k = 0
        while k * step < dur:
            if rng.random() < 0.72:
                pluck(note(tones[k % len(tones)]), pos + k * step + rng.random() * 0.01, 1.6, 0.05 + rng.random() * 0.02)
            k += 1
        pos += dur

# leichter Raum (zwei Echos) und Tiefpass (Mittelwert-Glättung) für einen weichen Klang
def delay(sig, sec, g):
    d = int(sec * SR); out = sig.copy(); out[d:] += g * sig[:-d]; return out
mix = delay(mix, 0.27, 0.28)
mix = delay(mix, 0.41, 0.18)
kernel = np.ones(24) / 24
mix = np.convolve(mix, kernel, mode='same')
# nahtloser Übergang: Anfang und Ende kreuzblenden
fade = int(3 * SR)
mix[:fade] *= np.linspace(0, 1, fade)
mix[-fade:] *= np.linspace(1, 0, fade)
mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.6
data = (mix * 32767).astype(np.int16)
with wave.open(OUT, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())
print('ok', OUT, round(TOTAL, 1), 's')
