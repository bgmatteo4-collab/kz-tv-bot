"""Les trois sons d'alerte, synthétisés : rien à télécharger, rien à payer.
    python3 sons.py   → follow.ogg, abonnement.ogg, raid.ogg
Dans StreamElements : chaque alerte a un champ « Sound », on y envoie le fichier correspondant.
"""
import math
import os
import subprocess
import wave

import numpy as np

ICI = os.path.dirname(os.path.abspath(__file__))
SR = 48000
g = np.random.default_rng(7)


def ecrire(nom, out):
    out = np.clip(out / max(1e-6, np.abs(out).max()) * 0.82, -1, 1)
    bord = int(0.006 * SR)                      # jamais de clic au début ni à la fin
    r = np.linspace(0, 1, bord, dtype=np.float32)[:, None]
    out[:bord] *= r; out[-bord:] *= r[::-1]
    wav = os.path.join(ICI, nom + '.wav')
    with wave.open(wav, 'wb') as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes((out * 32767).astype(np.int16).tobytes())
    ogg = os.path.join(ICI, nom + '.ogg')       # l'OGG est plus léger et passe partout
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', '5', ogg], check=True)
    os.remove(wav)
    print('son :', ogg)


def base(duree):
    n = int(duree * SR)
    return np.arange(n) / SR, np.zeros((n, 2), np.float32)


def note(out, t, t0, f, niveau, decroissance, attaque=0.004):
    """Une note douce : attaque courte, décroissance exponentielle."""
    d = np.clip(t - t0, 0, None)
    env = np.where(d < attaque, d / attaque, np.exp(-(d - attaque) / decroissance)) * (t >= t0) * (d < decroissance * 7)
    onde = (np.sin(2 * math.pi * f * d) + 0.3 * np.sin(4 * math.pi * f * d)) * env * niveau
    out += onde[:, None]


def souffle(out, t, t0, duree, niveau, montant=True):
    """Un passage d'air, balayé de gauche à droite."""
    n = len(t)
    d = np.clip(t - t0, 0, None)
    dedans = (t >= t0) & (d < duree)
    b = g.normal(size=n).astype(np.float32)
    w = np.zeros(n, np.float32); y1 = 0.0
    k = np.clip(d / duree, 0, 1)
    coupe = np.clip(0.02 + 0.33 * (k if montant else 1 - k), 0, 1)
    for i in np.nonzero(dedans)[0]:
        y1 += coupe[i] * (b[i] - y1); w[i] = y1
    env = np.sin(math.pi * k) * dedans * niveau
    out[:, 0] += w * env * (1.1 - k); out[:, 1] += w * env * (0.3 + k)


# --- Follow : le coup de pinceau, puis deux notes qui montent. Discret, ça sonne souvent.
t, out = base(1.5)
souffle(out, t, 0.0, 0.32, 0.5)
note(out, t, 0.18, 587.33, 0.5, 0.26)      # ré
note(out, t, 0.30, 880.0, 0.42, 0.34)      # la
ecrire('follow', out)

# --- Abonnement : plus large, un accord qui s'ouvre et un tintement.
t, out = base(2.3)
souffle(out, t, 0.0, 0.38, 0.55)
for k, (f, niv) in enumerate(((440.0, 0.5), (659.25, 0.42), (880.0, 0.34))):   # la, mi, la
    note(out, t, 0.2 + k * 0.1, f, niv, 0.5)
note(out, t, 0.52, 1760.0, 0.26, 0.75)     # le tintement qui brille
note(out, t, 0.2, 110.0, 0.4, 0.6)         # un fond grave qui donne du corps
ecrire('abonnement', out)

# --- Raid : ça arrive en masse. Souffle long, impact grave, puis une montée.
t, out = base(2.6)
souffle(out, t, 0.0, 0.6, 0.75)
note(out, t, 0.42, 73.42, 0.75, 0.5, 0.002)    # l'impact
note(out, t, 0.42, 146.83, 0.4, 0.42)
for k, f in enumerate((440.0, 554.37, 659.25, 880.0)):   # la montée, quatre marches
    note(out, t, 0.6 + k * 0.1, f, 0.3, 0.3)
souffle(out, t, 1.1, 0.7, 0.3, montant=False)
ecrire('raid', out)
