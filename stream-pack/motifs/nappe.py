"""La nappe sonore des écrans en boucle du pack (intro, outro) : un accord grave qui respire, un souffle
d'air, et deux notes douces à chaque changement d'info. Tout est synthétisé, rien à télécharger.
Le raccord est net : les fréquences font un nombre entier de cycles sur la boucle.
"""
import math
import wave

import numpy as np

SR = 48000
# Les harmoniques de l'accord, en multiples de la fondamentale, avec leur niveau.
HARMONIQUES = ((1.0, 1.0), (1.4983, 0.55), (2.0, 0.3), (2.9966, 0.16), (4.0, 0.09))


def nappe(chemin, duree=30.0, base=73.42, signaux=6, graine=3):
    """Écrit un WAV en boucle. `base` : la fondamentale en Hz (plus bas = plus grave, plus « fin de live »).
    `signaux` : combien de petites notes réparties sur la boucle (une par carte d'info)."""
    n = int(duree * SR)
    t = np.arange(n) / SR
    g = np.random.default_rng(graine)
    out = np.zeros((n, 2), np.float32)
    cycle = lambda f: round(f * duree) / duree   # un nombre entier de cycles : raccord parfait

    for mult, niveau in HARMONIQUES:
        f = cycle(base * mult)
        phase = g.uniform(0, 2 * math.pi)
        # le souffle module l'amplitude sur 1, 2 ou 3 cycles de la boucle : toujours raccord
        souffle = 0.72 + 0.28 * np.sin(2 * math.pi * g.integers(1, 4) * t / duree + phase)
        onde = np.sin(2 * math.pi * f * t + phase) * souffle * niveau
        pan = g.uniform(0.35, 0.65)
        out[:, 0] += onde * (1 - pan); out[:, 1] += onde * pan
    out *= 0.22

    # Un souffle d'air très doux, filtré, qui respire sur la boucle.
    bruit = g.normal(size=n).astype(np.float32)
    air = np.zeros(n, np.float32); y1 = 0.0
    for i in range(n):
        y1 += 0.0025 * (bruit[i] - y1); air[i] = y1
    air /= max(1e-6, np.abs(air).max())
    out += (air * 0.1 * (0.6 + 0.4 * np.sin(2 * math.pi * 2 * t / duree)))[:, None]

    # Deux notes douces à chaque changement d'info.
    for k in range(signaux):
        for f, retard, niveau in ((880.0, 0.0, 0.11), (1320.0, 0.07, 0.07)):
            d = np.clip(t - k * duree / signaux - retard, 0, None)
            env = np.exp(-d / 0.28) * (d > 0) * (d < 1.7)
            out += (np.sin(2 * math.pi * f * d) * env * niveau)[:, None]

    # Fondu de raccord très court aux deux bouts : garantit le silence parfait à la jointure.
    bord = int(0.004 * SR)
    rampe = np.linspace(0, 1, bord, dtype=np.float32)[:, None]
    out[:bord] *= rampe; out[-bord:] *= rampe[::-1]

    out = np.clip(out / max(1e-6, np.abs(out).max()) * 0.5, -1, 1)
    with wave.open(chemin, 'wb') as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes((out * 32767).astype(np.int16).tobytes())
    print('son :', chemin)
