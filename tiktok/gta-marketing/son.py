#!/usr/bin/env python3
"""Bande-son du TikTok : voix off + nappe + bruitages calés sur l'image.

La partition vient de la page (node render.js --sons 1 → out/sons.json). Les synthés de base
sont ceux de l'écran d'attente (attente/son.py). La voix reste devant : la nappe et les
bruitages passent sous elle (compression par la voix), et la musique tendance s'ajoutera
dans l'appli TikTok, très bas.

    python3 son.py            → out/bande.wav (48 kHz, stéréo, ≈ −14 LUFS)
"""
import importlib.util
import json
import os
import subprocess
import sys

import numpy as np
from scipy.io import wavfile

ICI = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('synthes', os.path.join(ICI, '..', '..', 'attente', 'son.py'))
S = importlib.util.module_from_spec(spec)
spec.loader.exec_module(S)
SR = S.SR
rng = np.random.default_rng(23)


def lire_audio(chemin):
    # Décode n'importe quel format avec ffmpeg, en 48 kHz stéréo flottant.
    brut = subprocess.run(['ffmpeg', '-v', 'error', '-i', chemin, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                          capture_output=True, check=True).stdout
    return np.frombuffer(brut, dtype=np.float32).reshape(-1, 2).T.astype(np.float64)


def s_nappe(e):
    # Nappe grave : quinte à vide (la / mi) légèrement désaccordée + air filtré. Monte puis tient.
    d = e['duree']
    n = int(d * SR)
    t = S.temps(d)
    x = np.zeros((2, n))
    for f, g in ((55.0, 0.5), (82.41, 0.32), (110.0, 0.22), (164.81, 0.08)):
        for c, det in ((0, -0.12), (1, 0.12)):
            x[c] += g * np.sin(2 * np.pi * (f + det) * t + rng.uniform(0, 6.28))
    x *= 0.5 + 0.5 * np.minimum(1, t / 2.5)
    air = np.stack([S.filtre(S.balayage(S.bruit(d), 300, 1400, 'lowpass', 64), 'highpass', 150) for _ in range(2)])
    x += 0.35 * air
    fondu = np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.8)
    return x * fondu * 0.28, 0.25


def s_rembobinage(e):
    # Rembobinage de bande : bruit filtré qui descend, avec un battement qui ralentit.
    d = e.get('duree', 1.0)
    n = int(d * SR)
    t = S.temps(d)
    x = S.balayage(S.bruit(d), 7000, 500, 'lowpass', 96)
    x = S.filtre(x, 'highpass', 220)
    battement = 0.6 + 0.4 * np.sin(2 * np.pi * np.cumsum(38 - 30 * (t / d)) / SR)
    x *= battement * S.cloche(n) ** 0.8
    return S.pan(x * 0.7, np.linspace(0.6, -0.6, n)), 0.5


SONS = {k[2:]: getattr(S, k) for k in dir(S) if k.startswith('s_')}
SONS.update({'nappe': s_nappe, 'rembobinage': s_rembobinage})


def main():
    evs = sorted(json.load(open(os.path.join(ICI, 'out', 'sons.json'))), key=lambda e: e['t'])
    duree = max(e.get('duree', 0) + e['t'] for e in evs) + 1.5
    N = int(duree * SR)
    voix = np.zeros((2, N))
    fx = np.zeros((2, N))
    envoi = np.zeros((2, N))
    for e in evs:
        i = int(round(e['t'] * SR))
        if e['type'] == 'voix':
            v = lire_audio(os.path.join(ICI, e['fichier'])) * e.get('gain', 1)
            j = i + int(e.get('decalage', 0) * SR)
            k = min(j + v.shape[1], N)
            voix[:, j:k] += v[:, :k - j]
            continue
        x, rev = SONS[e['type']](e)
        x = x * e.get('gain', 1)
        k = min(i + x.shape[1], N)
        fx[:, i:k] += x[:, :k - i]
        envoi[:, i:k] += rev * x[:, :k - i]
    # Réverbération commune pour les bruitages (la voix reste sèche et proche).
    from scipy.signal import fftconvolve
    ir = S.reponse(1.4)
    fx += 0.35 * np.stack([fftconvolve(envoi[c], ir[c])[:N] for c in range(2)])
    # La voix pousse les bruitages vers le bas (−7 dB quand elle parle).
    niveau = np.abs(voix).max(axis=0)
    fenetre = int(0.05 * SR)
    niveau = np.convolve(niveau, np.ones(fenetre) / fenetre, mode='same')
    gain = 1 - 0.55 * np.clip(niveau / (niveau.max() * 0.25 + 1e-9), 0, 1)
    mix = voix * 1.0 + fx * gain * 0.55
    sortie = os.path.join(ICI, 'out', 'brut.wav')
    wavfile.write(sortie, SR, (mix.T / max(1e-9, np.abs(mix).max()) * 0.8).astype(np.float32))
    # Loudness TikTok : ≈ −14 LUFS, crêtes à −1 dBTP.
    final = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ICI, 'out', 'bande.wav')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', sortie, '-af', 'loudnorm=I=-14:TP=-1:LRA=9', '-ar', str(SR), final], check=True)
    os.remove(sortie)
    print(final)


if __name__ == '__main__':
    main()
