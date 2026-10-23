#!/usr/bin/env python3
"""Bande-son : voix de Rémy devant, nappe grave, souffle à chaque vol de caméra, clic à chaque
comparaison, impulsion sur chaque région. Sortie out/bande.wav à −14 LUFS, crêtes à −1 dBTP.
La musique tendance s'ajoute dans l'appli TikTok, très bas."""
import json, os, subprocess
import numpy as np
from scipy.signal import butter, sosfilt

ICI = os.path.dirname(os.path.abspath(__file__))
SR = 48000
R = json.loads(subprocess.run(['node', os.path.join(ICI, 'reperes-son.mjs')], capture_output=True, text=True, check=True).stdout)
N = int((R['duree'] + 1) * SR)
rng = np.random.default_rng(7)

def lire(f):
    b = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(b, np.float32).astype(np.float64)

def poser(piste, x, t):
    i = max(0, int(t * SR)); k = min(N, i + len(x)); piste[i:k] += x[:k - i]

voix = np.zeros(N)
for v in R['voix']:
    poser(voix, lire(os.path.join(ICI, v['fichier'])), v['t'])

fx = np.zeros(N)
def souffle(d):
    n = int(d * SR); b = rng.standard_normal(n)
    env = np.sin(np.linspace(0, np.pi, n)) ** 2
    lo = sosfilt(butter(2, [300, 3500], 'bandpass', fs=SR, output='sos'), b)
    return lo * env * 0.18
for t, d in R['souffles']:
    poser(fx, souffle(max(0.6, d)), t)
def clic():
    n = int(0.09 * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1800 * tt) * np.exp(-tt * 70) + 0.4 * rng.standard_normal(n) * np.exp(-tt * 140)) * 0.25
for t in R['clics']:
    poser(fx, clic(), t)
def ping(f):
    n = int(0.6 * SR); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * f * tt) * np.exp(-tt * 7) * 0.12
for i, t in enumerate(R['regions']):
    poser(fx, ping(440 * 2 ** ([0, 3, 5, 7, 10, 12][i] / 12)), t)
# Fuites : un grondement sourd.
n = int(2.5 * SR); tt = np.arange(n) / SR
poser(fx, sosfilt(butter(2, 120, 'lowpass', fs=SR, output='sos'), rng.standard_normal(n)) * np.exp(-tt * 1.4) * 0.9, R['fuite'] - 0.2)

# Nappe : la et mi graves, très douce, avec un lent souffle de volume.
tt = np.arange(N) / SR
nappe = (np.sin(2 * np.pi * 55 * tt) + 0.6 * np.sin(2 * np.pi * 82.4 * tt) + 0.3 * np.sin(2 * np.pi * 110 * tt + 0.3 * np.sin(tt * 0.5)))
nappe *= 0.05 * (0.8 + 0.2 * np.sin(tt * 0.4)) * np.clip(tt / 2, 0, 1) * np.clip((R['duree'] + 0.5 - tt) / 2, 0, 1)

# La voix fait baisser le reste (−6 dB quand elle parle).
env = np.convolve(np.abs(voix), np.ones(2400) / 2400, 'same')
duck = 1 - 0.5 * np.clip(env / (env.max() * 0.25 + 1e-9), 0, 1)
mix = voix + (fx + nappe) * duck
mix = np.stack([mix, mix])
os.makedirs(os.path.join(ICI, 'out'), exist_ok=True)
brut = os.path.join(ICI, 'out', 'bande-brute.wav')
import wave
with wave.open(brut, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(mix.T / (np.abs(mix).max() + 1e-9) * 0.7, -1, 1) * 32767).astype('<i2').tobytes())
# Loudness en deux passes : mesure, puis gain fixe et limiteur.
m = subprocess.run(['ffmpeg', '-hide_banner', '-i', brut, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
mj = json.loads(m[m.rindex('{'):])
gain = -14 - float(mj['input_i'])
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', brut, '-af', f'volume={gain:.2f}dB,alimiter=limit=0.84:level=false', os.path.join(ICI, 'out', 'bande.wav')], check=True)
print('out/bande.wav')
