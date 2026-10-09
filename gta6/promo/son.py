#!/usr/bin/env python3
"""Bande-son de la promo GTA VI.

Musique : la chanson du trailer 2 (assets/audio/trailer-2.wav), calée sur la grille du montage
(129,7 BPM, une mesure = 1,85 s) : 66,63 → 127,68 s, puis la fin du trailer (153,58 → 166,5 s)
pour le logo. Par-dessus, des bruitages synthétisés depuis out/sons.json (whooshes, impacts,
tics de coupe, compteurs, pops des stickers). Produit aussi out/eq.json, le spectre image par
image qui anime l'égaliseur de la radio.

    python3 son.py      → out/bande-son.wav (48 kHz, stéréo) + out/eq.json
"""
import importlib.util
import json
import os

import numpy as np
from scipy.io import wavfile
from scipy.signal import fftconvolve, stft

ICI = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(ICI, '..', 'assets')

# Les synthés de l'écran d'attente (attente/son.py) servent de base.
spec = importlib.util.spec_from_file_location('synthes', os.path.join(ICI, '..', '..', 'attente', 'son.py'))
S = importlib.util.module_from_spec(spec)
spec.loader.exec_module(S)
SR = S.SR
DUREE = 75.5
N = int(SR * DUREE)
rng = np.random.default_rng(11)


def s_coup(e):
    # Coup de chapitre : grosse caisse courte + claquement filtré.
    d = 0.9
    n = int(d * SR)
    t = S.temps(d)
    f = 50 + 110 * np.exp(-t * 30)
    x = S.sinus(f, d) * S.env(n, 0.001, 0.18)
    x += 0.5 * S.filtre(S.bruit(d), 'bandpass', [1500, 7000]) * S.env(n, 0.0005, 0.02)
    x = np.tanh(x * 1.8) / 1.4
    return np.stack([x, x]), 0.5


def s_compteur(e):
    # Compteur qui défile : tics rapides qui ralentissent jusqu'à l'arrêt.
    d = e.get('duree', 1.2)
    x = np.zeros(int((d + 0.2) * SR))
    t = 0.0
    while t < d:
        n = int(0.012 * SR)
        v = S.sinus(rng.choice([2900, 3300, 3700]), 0.012) * S.env(n, 0.0003, 0.003)
        i = int(t * SR)
        x[i:i + n] += v * (0.5 + 0.5 * (1 - t / d))
        t += 0.018 + 0.11 * (t / d) ** 2.2
    return S.pan(x * 0.6, 0.1), 0.15


def s_pop(e):
    # Pop d'un sticker : bulle qui monte en hauteur.
    d = 0.25
    n = int(d * SR)
    t = S.temps(d)
    f = 380 * np.exp(t * 9)
    x = S.sinus(np.minimum(f, 2400), d) * S.env(n, 0.002, 0.04)
    return S.pan(x * 0.8, rng.uniform(-0.6, 0.6)), 0.3


SONS = {**S.SONS, 'coup': s_coup, 'compteur': s_compteur, 'pop': s_pop}


def musique():
    sr, x = wavfile.read(os.path.join(ASSETS, 'audio', 'trailer-2.wav'))
    assert sr == SR, sr
    x = x.astype(np.float64) / 32768.0
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    out = np.zeros((N, 2))

    def poser(a, b, t0, fin=0.02, fout=0.02):
        seg = x[int(a * SR):int(b * SR)].copy()
        k = len(seg)
        ri, ro = int(fin * SR), int(fout * SR)
        seg[:ri] *= np.linspace(0, 1, ri)[:, None]
        seg[k - ro:] *= np.linspace(1, 0, ro)[:, None]
        i = int(round(t0 * SR))
        j = min(N, i + k)
        out[i:j] += seg[:j - i]

    poser(66.63, 127.68 + 0.012, 1.85, fin=0.015, fout=0.012)
    poser(153.58 - 0.012, 166.5, 62.90 - 0.012, fin=0.012, fout=0.6)
    # Fondu final avec l'image.
    k = int(0.9 * SR)
    out[N - k:] *= np.linspace(1, 0, k)[:, None]
    return out


def bruitages():
    evs = json.load(open(os.path.join(ICI, 'out', 'sons.json')))
    sec = np.zeros((2, N + 4 * SR))
    envoi = np.zeros_like(sec)
    for e in evs:
        x, rev = SONS[e['type']](e)
        x = x * e.get('gain', 1)
        i = int(round(e['t'] * SR))
        j = min(i + x.shape[1], sec.shape[1])
        sec[:, i:j] += x[:, :j - i]
        envoi[:, i:j] += rev * x[:, :j - i]
    ir = S.reponse(1.4)
    humide = np.stack([fftconvolve(envoi[c], ir[c])[:sec.shape[1]] for c in range(2)]) * 0.3
    return (sec + humide)[:, :N].T, len(evs)


def egaliseur(x, bandes=40, fps=60):
    m = x.mean(1)
    hop = SR // fps
    f, t, Z = stft(m, SR, nperseg=4096, noverlap=4096 - hop, boundary=None, padded=False)
    A = np.abs(Z)
    bords = np.geomspace(90, 12000, bandes + 1)
    E = np.stack([A[(f >= bords[i]) & (f < bords[i + 1])].mean(0) for i in range(bandes)], 1)
    E = np.log10(np.nan_to_num(E) + 1e-6)
    lo, hi = np.percentile(E, 20, 0), np.percentile(E, 99, 0)
    E = np.clip((E - lo) / (hi - lo + 1e-9), 0, 1) ** 1.4
    # Montée rapide, retombée lente (comme un vrai VU-mètre).
    out = np.zeros_like(E)
    for i in range(len(E)):
        prev = out[i - 1] if i else E[0]
        out[i] = np.where(E[i] > prev, E[i], prev * 0.86 + E[i] * 0.14)
    # La fenêtre STFT est centrée 2048 échantillons (≈ 2 images) après le début de chaque trame.
    n = int(DUREE * fps)
    d = np.zeros((n, bandes))
    k = min(n, len(out))
    d[:k] = out[:k]
    return {'fps': fps, 'data': np.round(d, 2).tolist()}


def main():
    mus = musique()
    sfx, n = bruitages()
    mix = mus * 0.9 + sfx * 10 ** (-7 / 20) / max(1e-9, np.abs(sfx).max())
    plafond = 10 ** (-1 / 20)
    mix = mix / np.abs(mix).max() * 1.15
    mix = plafond * np.tanh(mix / plafond)
    wavfile.write(os.path.join(ICI, 'out', 'bande-son.wav'), SR, (mix * 32767).astype(np.int16))
    json.dump(egaliseur(mus), open(os.path.join(ICI, 'out', 'eq.json'), 'w'), separators=(',', ':'))
    print(f'out/bande-son.wav · {n} bruitages · {len(mix) / SR:.2f} s · out/eq.json')


if __name__ == '__main__':
    main()
