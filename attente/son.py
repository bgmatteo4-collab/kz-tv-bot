#!/usr/bin/env python3
"""Bruitages de l'écran d'attente Kayzx TV, synthétisés à partir de out/sons.json.

Aucune musique : des clics, des notifications, des tics, des souffles et des impacts,
calés sur l'image. La piste dure exactement 90 s et boucle sans couture : ce qui
dépasse la fin (queues de réverbération, impact final) est replié sur le début.

    python3 son.py                 → out/sons.wav (48 kHz, stéréo)
"""
import json
import os
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
DUREE = 90.0
N = int(SR * DUREE)
ICI = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(7)


# ---------------------------------------------------------------- outils

def temps(d):
    return np.arange(int(d * SR)) / SR


def bruit(d):
    return rng.standard_normal(int(d * SR))


def filtre(x, kind, f, ordre=2):
    f = np.atleast_1d(f) / (SR / 2)
    f = np.clip(f, 1e-4, 0.999)
    sos = butter(ordre, f if len(f) > 1 else f[0], btype=kind, output='sos')
    return sosfilt(sos, x)


def balayage(x, f0, f1, kind='lowpass', blocs=64):
    """Filtre dont la fréquence glisse de f0 à f1 (par blocs, assez fin pour l'oreille)."""
    out = np.zeros_like(x)
    n = len(x)
    bornes = np.linspace(0, n, blocs + 1).astype(int)
    zi = None
    for k in range(blocs):
        a, b = bornes[k], bornes[k + 1]
        f = f0 * (f1 / f0) ** ((k + 0.5) / blocs)
        sos = butter(2, min(f / (SR / 2), 0.99), btype=kind, output='sos')
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[a:b], zi = sosfilt(sos, x[a:b], zi=zi)
    return out


def env(n, att, dec, forme=1.0):
    """Enveloppe attaque linéaire + décroissance exponentielle (en secondes)."""
    t = np.arange(n) / SR
    a = np.clip(t / max(att, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(t - att, 0) / max(dec, 1e-4)) ** forme


def cloche(n):
    return np.sin(np.pi * np.linspace(0, 1, n)) ** 2


def sinus(f, d, phase=0.0):
    t = temps(d)
    if np.ndim(f) == 0:
        return np.sin(2 * np.pi * f * t + phase)
    return np.sin(2 * np.pi * np.cumsum(f) / SR + phase)


def pan(x, p):
    """p de -1 (gauche) à +1 (droite), loi à puissance constante."""
    a = (np.clip(p, -1, 1) + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])


# ---------------------------------------------------------------- sons

def s_clic(e):
    # Clic de souris (appui + relâché) puis petite confirmation tonale de la case.
    d = 0.5
    x = np.zeros(int(d * SR))
    for dt, g, f in [(0.0, 1.0, 3800), (0.055, 0.45, 5200)]:
        b = filtre(bruit(0.006), 'highpass', 1800) * env(int(0.006 * SR), 0.0003, 0.0015)
        tone = sinus(f * 0.5, 0.012) * env(int(0.012 * SR), 0.0002, 0.003)
        i = int(dt * SR)
        x[i:i + len(b)] += g * b
        x[i:i + len(tone)] += g * 0.5 * tone
    i = int(0.07 * SR)
    c = (sinus(1318.5, 0.18) + 0.35 * sinus(2637, 0.18)) * env(int(0.18 * SR), 0.002, 0.05)
    x[i:i + len(c)] += 0.32 * c
    return pan(x, 0.35), 0.25


def s_notif(e):
    # Notification à deux notes, timbre doux (sinus + harmonique), hauteur selon l'ordre.
    h = e.get('hauteur', 0)
    base = [1046.5, 1174.7, 1318.5, 1568.0][h % 4]
    notes = [(0.0, base), (0.085, base * 1.5)]
    d = 0.9
    x = np.zeros(int(d * SR))
    for dt, f in notes:
        n = int(0.7 * SR)
        v = (sinus(f, 0.7) + 0.28 * sinus(2 * f, 0.7) + 0.08 * sinus(3.01 * f, 0.7)) * env(n, 0.004, 0.16)
        i = int(dt * SR)
        x[i:i + n] += v
    # petit « pop » d'apparition
    p = filtre(bruit(0.02), 'bandpass', [900, 3000]) * env(int(0.02 * SR), 0.001, 0.005)
    x[:len(p)] += 0.5 * p
    return pan(x * 0.55, 0.0), 0.35


def s_tic(e):
    # Tic d'horloge numérique, alterné gauche/droite.
    d = 0.12
    n = int(d * SR)
    x = 0.8 * sinus(2600, d) * env(n, 0.0005, 0.012)
    x += 0.5 * filtre(bruit(d), 'highpass', 4000) * env(n, 0.0002, 0.004)
    tic.k += 1
    return pan(x, 0.45 if tic.k % 2 else -0.45), 0.3


tic = s_tic
tic.k = 0


def s_donnees(e):
    # Grappe de micro-clics : des données qui défilent.
    k = e.get('n', 4)
    pas = rng.uniform(0.035, 0.07)
    d = k * pas + 0.1
    x = np.zeros(int(d * SR))
    for j in range(k):
        f = rng.choice([2093, 2349, 2637, 3136, 3520, 4186])
        n = int(0.018 * SR)
        v = sinus(f, 0.018) * env(n, 0.0004, 0.005)
        v += 0.4 * filtre(bruit(0.018), 'highpass', 5000) * env(n, 0.0002, 0.002)
        i = int(j * pas * SR)
        x[i:i + n] += v * rng.uniform(0.6, 1.0)
    return pan(x, rng.uniform(-0.8, 0.8)), 0.2


def s_ping(e):
    h = e.get('hauteur', 0)
    f = [1760, 1975.5, 2217.5][h % 3]
    d = 1.4
    n = int(d * SR)
    x = (sinus(f, d) + 0.2 * sinus(f * 2.76, d)) * env(n, 0.002, 0.35)
    return pan(x * 0.5, [-0.5, 0.5, 0.0][h % 3]), 0.5


def s_rubrique(e):
    # Double bip d'interface au changement de chapitre.
    d = 0.3
    x = np.zeros(int(d * SR))
    for dt, f in [(0.0, 1760), (0.075, 2349)]:
        n = int(0.05 * SR)
        v = (sinus(f, 0.05) + 0.3 * sinus(2 * f, 0.05)) * env(n, 0.001, 0.014)
        i = int(dt * SR)
        x[i:i + n] += v
    return pan(x * 0.7, -0.6), 0.3


def s_verrou(e):
    # L'écran se verrouille en place : « tock » feutré + clic métallique.
    h = e.get('hauteur', 0)
    d = 0.35
    n = int(d * SR)
    f = 180 + 30 * h
    x = sinus(f * np.exp(-temps(d) * 9) + f * 0.6, d) * env(n, 0.001, 0.04)
    x += 0.35 * filtre(bruit(d), 'bandpass', [2500, 7000]) * env(n, 0.0003, 0.006)
    return pan(x * 0.8, [-0.6, 0.6, 0.0, 0.5][h % 4]), 0.25


def s_glisse(e):
    # Écran qui glisse dans le champ : souffle court et filtré, panoramique.
    h = e.get('hauteur', 0)
    d = 0.65
    n = int(d * SR)
    lo = 900 + 250 * h if h >= 0 else 600
    x = balayage(bruit(d), lo, lo * 4, 'lowpass') * cloche(n) ** 1.5
    x = filtre(x, 'highpass', 250)
    p = np.linspace(-0.7, 0.7, n) * (1 if h % 2 == 0 else -1)
    return pan(x * 0.5, p), 0.3


def s_frappe(e):
    # Frappe au clavier : clics irréguliers.
    d = e.get('duree', 1.5)
    x = np.zeros(int((d + 0.2) * SR))
    t = 0.0
    while t < d:
        n = int(0.025 * SR)
        v = filtre(bruit(0.025), 'bandpass', [1500 + rng.uniform(0, 1500), 6000]) * env(n, 0.0003, 0.004)
        v += 0.3 * sinus(rng.uniform(300, 500), 0.025) * env(n, 0.0005, 0.006)
        i = int(t * SR)
        x[i:i + n] += v * rng.uniform(0.5, 1.0)
        t += rng.uniform(0.055, 0.13) + (0.18 if rng.random() < 0.1 else 0)
    return pan(x * 0.7, 0.25), 0.15


def s_scintille(e):
    # Scintillement : quelques partiels aigus qui papillonnent.
    d = 1.8
    n = int(d * SR)
    t = temps(d)
    x = np.zeros(n)
    for _ in range(5):
        f = rng.uniform(3200, 8200)
        trem = 0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(9, 22) * t + rng.uniform(0, 6))
        x += sinus(f, d) * trem * env(n, rng.uniform(0.005, 0.08), rng.uniform(0.25, 0.6))
    x /= 5
    return pan(x, rng.uniform(-0.7, 0.7)), 0.7


def s_souffle(e):
    d = e.get('duree', 6)
    n = int(d * SR)
    g = np.stack([filtre(balayage(bruit(d), 400, 1600, 'lowpass', 128), 'highpass', 120) for _ in range(2)])
    return g * cloche(n) * 0.22, 0.4


def s_montee(e):
    # Montée : bruit dont le filtre s'ouvre + sinus qui grimpe, coupée net.
    d = e.get('duree', 3)
    n = int(d * SR)
    t = temps(d)
    courbe = (t / d) ** 2.2
    x = balayage(bruit(d), 300, 9000, 'lowpass', 128) * courbe
    f = 220 * 2 ** (2.5 * t / d)
    x += 0.25 * sinus(f, d) * courbe
    x *= np.minimum(1, (d - t) / 0.02)
    return np.stack([x, np.roll(x, 240)]) * 0.5, 0.6


def s_whoosh(e):
    d = e.get('duree', 2.4)
    n = int(d * SR)
    m = n // 2
    x = np.concatenate([balayage(bruit(d / 2), 300, 4500, 'lowpass', 64),
                        balayage(bruit(d - d / 2), 4500, 300, 'lowpass', 64)])[:n]
    x = filtre(x, 'highpass', 150) * cloche(n) ** 2.2
    return pan(x * 0.75, np.linspace(-0.85, 0.85, n)), 0.6


def s_impact(e):
    # Impact : sub qui tombe, claquement, queue longue.
    d = 3.2
    n = int(d * SR)
    t = temps(d)
    f = 45 + 95 * np.exp(-t * 14)
    x = sinus(f, d) * env(n, 0.002, 0.55)
    x += 0.6 * filtre(bruit(d), 'lowpass', 2500) * env(n, 0.0005, 0.05)
    x += 0.25 * filtre(bruit(d), 'bandpass', [3000, 9000]) * env(n, 0.0002, 0.012)
    x = np.tanh(x * 1.6) / 1.2
    return np.stack([x, x]), 1.1


def s_grondement(e):
    d = e.get('duree', 23)
    n = int(d * SR)
    t = temps(d)
    x = filtre(bruit(d), 'lowpass', 110, 4) * 3.0
    x += 0.35 * sinus(41.2, d) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.19 * t))
    fade = np.minimum(1, t / 2.5) * np.minimum(1, (d - t) / 3)
    x *= fade
    return np.stack([x, np.roll(x, 480)]) * 0.5, 0.1


def s_dissolution(e):
    # Dissolution : crépitement granuleux qui s'éparpille + souffle qui s'ouvre.
    d = e.get('duree', 3)
    n = int(d * SR)
    out = np.zeros((2, n + SR // 10))
    t = 0.0
    while t < d:
        k = int(0.01 * SR)
        v = filtre(bruit(0.01), 'highpass', rng.uniform(3000, 8000)) * env(k, 0.0002, 0.002)
        i = int(t * SR)
        out[:, i:i + k] += pan(v * rng.uniform(0.3, 1.0), rng.uniform(-1, 1))
        dens = 0.008 + 0.06 * (t / d) ** 1.5
        t += rng.exponential(dens)
    s = balayage(bruit(d), 500, 6000, 'lowpass', 96) * cloche(n) * 0.35
    out[:, :n] += np.stack([s, np.roll(s, 300)])
    return out * 0.8, 0.6


SONS = {k[2:]: v for k, v in globals().items() if k.startswith('s_')}


# ---------------------------------------------------------------- mixage

def reponse(d=1.6):
    """Réverbération synthétique : bruit décroissant, stéréo décorrélée."""
    n = int(d * SR)
    t = np.arange(n) / SR
    ir = np.stack([filtre(bruit(d), 'lowpass', 6000) for _ in range(2)]) * np.exp(-t / 0.42)
    ir[:, :int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    return ir / np.sqrt((ir ** 2).sum(axis=1, keepdims=True))


def lit_boucle(n):
    """Fond d'air très discret, filtré dans le domaine fréquentiel : périodique sur 90 s."""
    spec = np.fft.rfft(rng.standard_normal((2, n)), axis=1)
    f = np.fft.rfftfreq(n, 1 / SR)
    forme = 1 / np.sqrt(np.maximum(f, 20)) * (1 / (1 + (f / 900) ** 2)) * (f > 35)
    x = np.fft.irfft(spec * forme, n, axis=1)
    return x / np.abs(x).max()


def main():
    src = os.path.join(ICI, 'out', 'sons.json')
    dst = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ICI, 'out', 'sons.wav')
    evs = sorted(json.load(open(src)), key=lambda e: e['t'])
    marge = 6 * SR
    sec = np.zeros((2, N + marge))
    envoi = np.zeros((2, N + marge))
    for e in evs:
        x, rev = SONS[e['type']](e)
        x = x * e.get('gain', 1)
        i = int(round(e['t'] * SR))
        j = min(i + x.shape[1], sec.shape[1])
        sec[:, i:j] += x[:, :j - i]
        envoi[:, i:j] += rev * x[:, :j - i]
    ir = reponse()
    humide = np.stack([fftconvolve(envoi[c], ir[c])[:N + marge] for c in range(2)]) * 0.28
    mix = sec + humide
    # Repli de tout ce qui dépasse 90 s sur le début : la boucle ne s'entend pas.
    boucle = mix[:, :N].copy()
    boucle[:, :marge] += mix[:, N:N + marge]
    boucle += 0.012 * lit_boucle(N)
    # Bus : niveau moyen à -21 dBFS, limiteur doux (les impacts s'écrasent un peu,
    # les clics restent présents), plafond à -1 dBFS.
    boucle *= 10 ** (-21 / 20) / np.sqrt((boucle ** 2).mean())
    plafond = 10 ** (-1 / 20)
    boucle = plafond * np.tanh(boucle / plafond)
    wavfile.write(dst, SR, (boucle.T * 32767).astype(np.int16))
    print(f'{dst} · {len(evs)} événements · {boucle.shape[1] / SR:.2f} s')


if __name__ == '__main__':
    main()
