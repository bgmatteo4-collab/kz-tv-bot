"""Le son de l'intro de lancement : nappe lente en boucle (30 s, raccord net) et un signal très doux
à chaque changement d'info. Tout est synthétisé, rien à télécharger.
    python3 son.py   → attente.wav
"""
import math
import os
import wave

import numpy as np

ICI = os.path.dirname(os.path.abspath(__file__))
DUREE, SR = 30.0, 48000
N = int(DUREE * SR)
t = np.arange(N) / SR
g = np.random.default_rng(3)


def boucle(f):
    """Arrondit une fréquence pour qu'elle fasse un nombre entier de cycles sur la boucle."""
    return round(f * DUREE) / DUREE


out = np.zeros((N, 2), np.float32)

# Nappe : une quinte teal-miel (ré grave + la), trois harmoniques, chacune avec son souffle très lent.
for base, niveau in ((73.42, 1.0), (110.0, 0.55), (146.83, 0.3), (220.0, 0.16), (293.66, 0.09)):
    f = boucle(base)
    phase = g.uniform(0, 2 * math.pi)
    # le souffle module l'amplitude sur 1, 2 ou 3 cycles de la boucle : toujours raccord
    cycles = g.integers(1, 4)
    souffle = 0.72 + 0.28 * np.sin(2 * math.pi * cycles * t / DUREE + phase)
    onde = np.sin(2 * math.pi * f * t + phase) * souffle * niveau
    pan = g.uniform(0.35, 0.65)
    out[:, 0] += onde * (1 - pan); out[:, 1] += onde * pan
out *= 0.22

# Un souffle d'air très doux, filtré, qui respire sur la boucle.
bruit = g.normal(size=N).astype(np.float32)
air = np.zeros(N, np.float32); y1 = 0.0
for i in range(N):
    y1 += 0.0025 * (bruit[i] - y1); air[i] = y1
air /= max(1e-6, np.abs(air).max())
air *= 0.1 * (0.6 + 0.4 * np.sin(2 * math.pi * 2 * t / DUREE))
out += air[:, None]

def note(t0, f, niveau, decroissance, pan=0.5):
    d = np.clip(t - t0, 0, None)
    env = np.exp(-d / decroissance) * (t >= t0) * (d < decroissance * 6)
    onde = np.sin(2 * math.pi * f * d) * env * niveau
    out[:, 0] += onde * (1 - pan) * 2; out[:, 1] += onde * pan * 2


# Signal au changement d'info : deux notes douces, toutes les 5 s pendant la phase des cartes.
for k in range(6):
    note(k * 5.0, 880.0, 0.055, 0.28)
    note(k * 5.0 + 0.07, 1320.0, 0.035, 0.28)

# Fondu de raccord très court aux deux bouts : garantit le silence parfait à la jointure.
bord = int(0.004 * SR)
rampe = np.linspace(0, 1, bord, dtype=np.float32)[:, None]
out[:bord] *= rampe; out[-bord:] *= rampe[::-1]

out = np.clip(out / max(1e-6, np.abs(out).max()) * 0.5, -1, 1)
chemin = os.path.join(ICI, 'attente.wav')
with wave.open(chemin, 'wb') as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((out * 32767).astype(np.int16).tobytes())
print('son :', chemin)
