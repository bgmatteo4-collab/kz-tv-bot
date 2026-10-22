#!/usr/bin/env python3
"""Génère la voix off avec Piper (voix « Tom », gratuite, hors ligne).

Une phrase de js/partition.js = un fichier medias/voix/<id>.wav, plus medias/voix/mots.json :
l'instant où chaque mot est prononcé (alignement des phonèmes), pour que les titres sortent
pile sur la voix. Les phrases de l'accroche sont ajustées à la durée de leur créneau (la
caméra et les bruitages de l'accroche sont calés sur ces instants) ; les autres gardent le
débit RYTHME et le film se recale sur elles.

    pip install piper-tts onnx
    python3 generer-voix.py          # puis : python3 caler-voix.py
"""
import json
import os
import re
import subprocess
import urllib.request
import wave

import numpy as np
from piper import PiperVoice, SynthesisConfig

ICI = os.path.dirname(os.path.abspath(__file__))
DOSSIER = os.path.join(ICI, 'medias', 'voix')
MODELE = os.path.join(ICI, 'medias', 'piper', 'fr_FR-tom-medium.onnx')
URL = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/tom/medium/fr_FR-tom-medium.onnx'
RYTHME = 0.92                  # durée des phonèmes (1 = débit natif de Tom, un peu lent pour TikTok)
CRENEAU = (0.8, 1.05)          # bornes du réglage pour faire tenir une phrase de l'accroche
AIR = 0.03                     # air gardé avant et après la parole, comme caler-voix.py

# Ce que Tom prononce mal en lisant le texte : orthographe ou phonèmes ([[ … ]]) pour la
# synthèse seulement, le texte « dit » de partition.js reste celui des titres. La ponctuation
# qui suit des phonèmes doit rester dans les crochets, sinon la phrase suivante s'y colle.
PRONONCE = [
    (r'Vice City([.,…]?)', r'[[ vˈajs sitˈi\1 ]]'),
    (r'\bHeat\b', 'Hite'),
    (r'\bLeonida\b', 'Léonida'),
    (r'\bstreet-artistes\b', 'strite-artistes'),
    (r'\bNew York\b', 'Niou Yorque'),
    (r'\bLos Santos\b', 'Los Santoss'),
    (r'\bLos Angeles\b', 'Los Angèlesse'),
    (r'…\s', ', '),           # les points de suspension au milieu d'une phrase sont ignorés (mots collés)
]
MUETS = set(' ,.:;!?…-\'"ˈˌ()^$_')


def lignes():
    src = open(os.path.join(ICI, 'js', 'partition.js'), encoding='utf-8').read()
    motif = r"""\{ id: '([a-z]\d)', chap: '\w+', dit: ("[^"]*"|'[^']*')(?:, debut: ([\d.]+), fin: ([\d.]+))?"""
    return [(i, d[1:-1], float(b) if b else None, float(f) if f else None) for i, d, b, f in re.findall(motif, src)]


def synthese(voix, texte, echelle):
    """Audio (float, 1 voie) et instant de début de chaque mot prononcé, en échantillons."""
    audio, debuts, base = [], [], 0
    for c in voix.synthesize(texte, SynthesisConfig(length_scale=echelle), include_alignments=True):
        if c.phoneme_alignments is None:
            raise SystemExit('Alignement indisponible : pip install onnx')
        pos, mot = base, None
        for a in c.phoneme_alignments:
            if a.phoneme == ' ':
                mot = None
            elif a.phoneme not in MUETS and mot is None:
                mot = pos
                debuts.append(pos)
            pos += int(a.num_samples)
        audio.append(c.audio_float_array)
        base += len(c.audio_float_array)
    return np.concatenate(audio), debuts


def bornes(x, sr):
    """Début et fin de la parole. Tom souffle parfois 0,2 s avant de parler, juste au-dessus
    de −45 dB : on coupe par trames de 10 ms à −35 dB sous la trame la plus forte."""
    h = sr // 100
    r = np.sqrt((x[: len(x) // h * h].reshape(-1, h) ** 2).mean(axis=1))
    fort = np.nonzero(r > r.max() * 10 ** (-35 / 20))[0]
    return max(0, fort[0] * h - int(AIR * sr)), min(len(x), (fort[-1] + 1) * h + int(AIR * sr))


def niveau(x):
    """RMS de la parole seulement (trames à moins de 30 dB du maximum)."""
    t = x[: len(x) // 1024 * 1024].reshape(-1, 1024)
    r = np.sqrt((t ** 2).mean(axis=1))
    return float(np.sqrt((r[r > r.max() * 10 ** (-30 / 20)] ** 2).mean()))


def main():
    if not os.path.exists(MODELE):
        os.makedirs(os.path.dirname(MODELE), exist_ok=True)
        for ext in ('', '.json'):
            urllib.request.urlretrieve(URL + ext, MODELE + ext)
    voix = PiperVoice.load(MODELE, include_alignments=True)
    sr = voix.config.sample_rate
    os.makedirs(DOSSIER, exist_ok=True)
    # Même niveau que la voix de l'accroche d'origine, sur lequel le mixage de son.py est réglé.
    ref = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(ICI, 'medias', 'voix-accroche.mp3'),
                          '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    cible = niveau(np.frombuffer(ref, np.float32))

    mots = {}
    for i, dit, debut, fin in lignes():
        texte = dit
        for motif, rempl in PRONONCE:
            texte = re.sub(motif, rempl, texte)
        echelle, essais = RYTHME, 4 if debut is not None else 1
        while True:
            x, debuts = synthese(voix, texte, echelle)
            a, b = bornes(x, sr)
            essais -= 1
            if debut is None or essais == 0 or abs((b - a) / sr - (fin - debut)) < 0.03:
                break
            suivante = float(np.clip(echelle * (fin - debut) / ((b - a) / sr), *CRENEAU))
            if suivante == echelle:
                break
            echelle = suivante
        x = x[a:b] * cible / niveau(x[a:b])
        x = x / max(1.0, np.abs(x).max() / 0.98)
        fondu = np.linspace(0, 1, int(0.01 * sr))
        x[:len(fondu)] *= fondu
        x[-len(fondu):] *= fondu[::-1]
        with wave.open(os.path.join(DOSSIER, f'{i}.wav'), 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
            w.writeframes((x * 32767).astype('<i2').tobytes())
        attendus = [m for m in dit.split() if re.search(r'[A-Za-zÀ-ÿ0-9]', m)]
        if len(debuts) == len(attendus):
            mots[i] = [round(max(0, d - a) / sr, 3) for d in debuts]
        else:
            print(f'  {i} : {len(debuts)} mots prononcés pour {len(attendus)} écrits, titres au prorata des lettres')
        cadre = f'  (créneau {fin - debut:.2f} s)' if debut is not None else ''
        print(f'{i} : {(b - a) / sr:.2f} s à ×{echelle:.2f}{cadre}')
    json.dump(mots, open(os.path.join(DOSSIER, 'mots.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
