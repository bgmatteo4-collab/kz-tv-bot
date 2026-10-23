#!/usr/bin/env python3
"""Bande-son du Dossier Nº02, mixée comme en studio :

- Voix (Rémy) devant : coupe-bas, creux à 300 Hz, présence à 3,5 kHz, compression douce.
- Musique (Justice — Flower in a Hurricane, trailer de lancement de GTA VI), calée pour que
  l'entrée pleine du morceau (48 s) tombe sur la plongée vers Vice City. Creux à 2,5 kHz pour
  laisser la place à la voix, baisse automatique quand Rémy parle (−8 dB), remonte dans les
  tenues. Filtrée « sous l'eau » pendant la station des Keys, étouffée pendant les fuites, puis
  rouverte par une montée jusqu'à l'impact sur « 19 novembre ». Fondu de sortie.
- Bruitages synthétisés, chacun sur son geste (reperes-son.mjs) : tuiles qui se posent,
  souffles des vols, pops des régions, vague de Vice City, cartes qui s'ouvrent et volet qui
  balaie (panoramique qui suit le trait), bulles, compteur, grondement et grésillement des
  fuites, montée et impact final. Petite réverbération commune.
Sortie : out/bande.wav, −14 LUFS intégrés, crêtes sous −1 dBTP.
"""
import json, os, subprocess, wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

ICI = os.path.dirname(os.path.abspath(__file__))
SR = 48000
R = json.loads(subprocess.run(['node', os.path.join(ICI, 'reperes-son.mjs')], capture_output=True, text=True, check=True).stdout)
N = int((R['duree'] + 0.5) * SR)
rng = np.random.default_rng(11)
MUSIQUE = os.path.join(ICI, 'medias', 'musique', 'flower-in-a-hurricane.mp3')
ENTREE_PLEINE = 48.0          # seconde du morceau où il part en plein


def ffmpeg(src, filtre=None, debut=None, duree=None, canaux=2):
    cmd = ['ffmpeg', '-v', 'error']
    if debut is not None:
        cmd += ['-ss', f'{debut:.3f}']
    if duree is not None:
        cmd += ['-t', f'{duree:.3f}']
    cmd += ['-i', src] + (['-af', filtre] if filtre else []) + ['-ac', str(canaux), '-ar', str(SR), '-f', 'f32le', '-']
    x = np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32).astype(np.float64)
    return x.reshape(-1, canaux).T


def poser(piste, x, t, gain=1.0, pan=0.0):
    """Pose un son (mono ou stéréo) à l'instant t, avec un panoramique à puissance constante."""
    if x.ndim == 1:
        a = (pan + 1) * np.pi / 4
        x = np.stack([x * np.cos(a), x * np.sin(a)]) * np.sqrt(2)
    i = int(round(t * SR))
    if i >= N:
        return
    j, k = max(0, i), min(N, i + x.shape[1])
    piste[:, j:k] += gain * x[:, j - i:k - i]


bp = lambda x, lo, hi: sosfilt(butter(2, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
lp = lambda x, f: sosfilt(butter(2, f, 'lowpass', fs=SR, output='sos'), x)
hp = lambda x, f: sosfilt(butter(2, f, 'highpass', fs=SR, output='sos'), x)
rms = lambda x: np.sqrt(np.mean(x ** 2) + 1e-12)
temps = lambda n: np.arange(n) / SR

# ------------------------------------------------------------------ voix
voix = np.zeros((2, N))
CHAINE_VOIX = ('highpass=f=85,equalizer=f=300:t=q:w=1:g=-2,equalizer=f=3500:t=q:w=1.2:g=2.5,'
               'highshelf=f=10000:g=1.5,acompressor=threshold=0.1:ratio=3:attack=5:release=80:makeup=1.6')
for v in R['voix']:
    poser(voix, ffmpeg(os.path.join(ICI, v['fichier']), CHAINE_VOIX), v['t'])
parle = np.abs(voix).mean(axis=0)
# Enveloppe de la voix (attaque 60 ms, relâche 350 ms) pour faire baisser la musique.
env = np.zeros(N)
a, r = np.exp(-1 / (0.06 * SR)), np.exp(-1 / (0.35 * SR))
blocs = parle.reshape(-1, 48)[:N // 48].max(axis=1) if N % 48 == 0 else np.pad(parle, (0, 48 - N % 48)).reshape(-1, 48).max(axis=1)
e, out = 0.0, np.zeros(len(blocs))
seuil = blocs.max() * 0.04
for n, b in enumerate(blocs):
    cible = 1.0 if b > seuil else 0.0
    k = a ** 48 if cible > e else r ** 48
    e = cible + (e - cible) * k
    out[n] = e
env = np.repeat(out, 48)[:N]

# ------------------------------------------------------------------ musique
decalage = ENTREE_PLEINE - R['plongee']
mus = ffmpeg(MUSIQUE, 'highpass=f=35,equalizer=f=2500:t=q:w=0.9:g=-4', debut=decalage, duree=R['duree'] + 0.5)
mus = np.pad(mus, ((0, 0), (0, max(0, N - mus.shape[1]))))[:, :N]
etouffee = np.stack([lp(c, 520) for c in mus])        # « sous l'eau » / fuites
t = temps(N)
rampe = lambda t0, t1, d=0.5: np.clip((t - t0) / d, 0, 1) * np.clip((t1 - t) / d, 0, 1)
w_eau = rampe(R['eau'][0], R['eau'][1], 0.4)
w_fuite = np.clip((t - R['fuite'][0]) / 0.5, 0, 1) * np.where(t < R['montee'], 1.0, np.clip(1 - (t - R['montee']) / (R['impact'] - R['montee']), 0, 1) ** 1.6)
w = np.maximum(w_eau, w_fuite)
musique = mus * (1 - w) + etouffee * w * 1.25
# Niveau : la musique sous la voix, −8 dB de plus quand Rémy parle ; respiration avant l'impact.
niveau = rms(voix[:, voix.any(axis=0)]) * 10 ** (-9 / 20) / rms(mus)
auto = (1 - 0.6 * env) * (1 - 0.25 * w_fuite)
auto *= np.clip(t / 0.25, 0, 1) * np.clip((R['duree'] - t) / 2.6, 0, 1) ** 1.5      # fondus
auto *= 1 - 0.85 * rampe(R['impact'] - 0.22, R['impact'] + 0.02, 0.06)               # silence d'un souffle avant l'impact
musique *= niveau * auto

# ------------------------------------------------------------------ bruitages
fx = np.zeros((2, N))
ref = rms(voix[:, voix.any(axis=0)])


def tic(f=2600, d=0.012, bruit=0.5):
    n = int(d * SR); tt = temps(n)
    return (np.sin(2 * np.pi * f * tt) + bruit * rng.standard_normal(n)) * np.exp(-tt / (d / 4))


def pop(f=180):
    n = int(0.16 * SR); tt = temps(n)
    return np.sin(2 * np.pi * f * tt * (1 + 2 * np.exp(-tt * 40))) * np.exp(-tt * 28) + 0.3 * hp(rng.standard_normal(n), 3000) * np.exp(-tt * 120)


def souffle(d, pan0=-0.7, pan1=0.7):
    n = int(d * SR); x = rng.standard_normal(n); tt = np.linspace(0, 1, n)
    centre = 400 + 2600 * np.sin(np.pi * tt) ** 2                   # le filtre monte puis redescend
    y = np.zeros(n); pas = 2048
    for i in range(0, n, pas):
        f = centre[i]; y[i:i + pas] = bp(x[i:i + pas + 512], f * 0.6, min(f * 1.6, 20000))[:len(y[i:i + pas])]
    y *= np.sin(np.pi * tt) ** 2
    p = np.linspace(pan0, pan1, n); a = (p + 1) * np.pi / 4
    return np.stack([y * np.cos(a), y * np.sin(a)]) * np.sqrt(2)


def grondement(d):
    n = int(d * SR); tt = temps(n)
    return (lp(rng.standard_normal(n), 90) * 6 + np.sin(2 * np.pi * 42 * tt) * 0.8) * np.exp(-tt * 1.3)


def impact():
    n = int(1.6 * SR); tt = temps(n)
    sub = np.sin(2 * np.pi * 50 * tt * (1 + 1.5 * np.exp(-tt * 18))) * np.exp(-tt * 3)
    claque = hp(rng.standard_normal(n), 1500) * np.exp(-tt * 30)
    return sub * 1.2 + claque * 0.5


def montee(d):
    n = int(d * SR); tt = np.linspace(0, 1, n)
    b = hp(rng.standard_normal(n), 2000) * tt ** 2.5
    ton = np.sin(2 * np.pi * np.cumsum(200 + 900 * tt ** 2) / SR) * tt ** 2
    return b * 0.6 + ton * 0.25


def bulle():
    n = int(0.12 * SR); tt = temps(n)
    return np.sin(2 * np.pi * np.cumsum(500 + 2500 * tt / tt[-1]) / SR) * np.sin(np.pi * tt / tt[-1]) ** 2


def gresille(d):
    n = int(d * SR); x = hp(rng.standard_normal(n), 2500)
    porte = np.repeat(rng.random(n // 480 + 1) > 0.72, 480)[:n]
    return x * porte * np.sin(np.pi * np.linspace(0, 1, n))


G = ref * 0.9   # référence de niveau des bruitages (sous la voix)
poser(fx, souffle(0.45, -0.9, -0.2), R['onglet'], G * 0.25)
for i, (tt_, pan) in enumerate(R['tuiles']):                       # les tuiles qui se posent
    if i % 3 == 0:
        poser(fx, tic(2200 + 900 * rng.random(), 0.01), tt_, G * 0.18 * (0.6 + 0.4 * rng.random()), pan * 0.8)
for t0, d in R['souffles']:
    poser(fx, souffle(max(0.6, d)), t0, G * 0.32)
g0, g1, gd = R['gta5']
poser(fx, souffle(gd, 0.8, -0.3), g1, G * 0.35)
poser(fx, pop(70), g1 + gd - 0.1, G * 0.9)
for i, tr in enumerate(R['regions']):
    poser(fx, pop(220 + 25 * i), tr, G * 0.45, [0.2, 0.0, -0.1, -0.6, -0.2, -0.4][i])
for i, (tv, pan) in enumerate(R['vague']):                         # vague de points de Vice City
    if i % 18 == 0:
        poser(fx, tic(3200 + 1200 * rng.random(), 0.008, 0.3), tv, G * 0.12, np.clip(pan, -0.9, 0.9))
for tq in R['quartiers']:
    poser(fx, tic(1800, 0.015), tq, G * 0.3)
for c in R['comps']:
    poser(fx, pop(140), c['ouvre'], G * 0.75)
    poser(fx, souffle(0.35, 0, 0), c['ouvre'] - 0.05, G * 0.2)
    for t0, d, p0, p1 in c['balaie']:                                 # le volet balaie : le son suit le trait
        poser(fx, souffle(min(d, 1.4), p0, p1), t0, G * 0.22)
    poser(fx, souffle(0.4, 0, 0), c['ferme'], G * 0.18)
for k in range(7):
    poser(fx, bulle(), R['eau'][2] + 0.15 + k * 0.23 + 0.05 * rng.random(), G * 0.18, rng.uniform(-0.6, 0.6))
for tc in R['compteur']:
    poser(fx, tic(2900, 0.007), tc, G * 0.22, rng.uniform(-0.3, 0.3))
poser(fx, tic(1400, 0.05, 0.1), R['compteur'][-1] + 0.05, G * 0.4)
poser(fx, grondement(3.0), R['fuite'][0], G * 0.9)
for tr in R['rubans']:
    poser(fx, souffle(0.7, -0.9, 0.9), tr, G * 0.35)
poser(fx, gresille(2.2), R['rubans'][0] + 0.2, G * 0.12)
for tv in R['vids']:
    poser(fx, tic(2400 + 600 * rng.random(), 0.008), tv, G * 0.12, rng.uniform(-0.7, 0.7))
poser(fx, souffle(1.2, 0.6, -0.6), R['comtes'][0] - 0.2, G * 0.3)
poser(fx, pop(160), R['viceDale'], G * 0.6)
poser(fx, montee(R['impact'] - R['montee']), R['montee'], G * 0.55)
poser(fx, impact(), R['impact'], G * 1.1)

# Réverbération commune des bruitages (courte, sombre) ; la voix reste sèche.
n = int(0.7 * SR); ir = rng.standard_normal((2, n)) * np.exp(-temps(n) * 7)
ir = np.stack([lp(c, 5000) for c in ir]) * 0.08
fx = fx + np.stack([fftconvolve(fx[i], ir[i])[:N] for i in range(2)])
fx *= 1 - 0.35 * env                                                # les bruitages s'écartent aussi de la voix

mix = voix + musique + fx
brut = os.path.join(ICI, 'out', 'bande-brute.wav')
os.makedirs(os.path.dirname(brut), exist_ok=True)
with wave.open(brut, 'wb') as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((np.clip(mix.T / (np.abs(mix).max() + 1e-9) * 0.7, -1, 1) * 32767).astype('<i2').tobytes())
# Loudness en deux passes : mesure, gain fixe, limiteur (crêtes sous −1 dBTP).
m = subprocess.run(['ffmpeg', '-hide_banner', '-i', brut, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
gain = -14 - float(json.loads(m[m.rindex('{'):])['input_i'])
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', brut, '-af', f'volume={gain:.2f}dB,alimiter=limit=0.84:level=false', os.path.join(ICI, 'out', 'bande.wav')], check=True)
print('out/bande.wav', f'décalage musique {decalage:.2f} s')
