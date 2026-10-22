#!/usr/bin/env python3
"""Cale le film sur la voix définitive.

La voix est générée phrase par phrase (une ligne de js/partition.js = un fichier, même voix,
mêmes réglages) et déposée dans medias/voix/<id>.mp3 (p1, c1, c2, …, o2). Ce script coupe le
silence de début et de fin de chaque fichier, mesure la durée de parole et écrit
medias/voix.json ; au prochain rendu, partition.js remplace les durées estimées par les vraies
et tout le film (titres, caméra, photos, bruitages) se recale seul.

    python3 caler-voix.py
"""
import json
import os
import re
import subprocess

ICI = os.path.dirname(os.path.abspath(__file__))
DOSSIER = os.path.join(ICI, 'medias', 'voix')
SORTIE = os.path.join(ICI, 'medias', 'voix.json')


def duree(chemin):
    sortie = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', chemin],
                            capture_output=True, text=True, check=True).stdout
    return float(sortie.strip())


def main():
    ids = re.findall(r"\{ id: '([a-z]\d)'", open(os.path.join(ICI, 'js', 'partition.js'), encoding='utf-8').read())
    durees, fichiers = {}, {}
    for i in ids:
        src = next((os.path.join(DOSSIER, f'{i}.{x}') for x in ('mp3', 'wav') if os.path.exists(os.path.join(DOSSIER, f'{i}.{x}'))), None)
        if not src or i.startswith('a'):
            continue
        net = os.path.join(DOSSIER, f'{i}-net.wav')
        # Coupe le silence au début et à la fin (−45 dB), garde 30 ms d'air de chaque côté.
        filtre = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,'
                  'areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse')
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', src, '-af', filtre, '-ar', '48000', '-ac', '1', net], check=True)
        durees[i] = round(duree(net), 3)
        fichiers[i] = os.path.relpath(net, ICI)
        print(f'{i} : {durees[i]:.2f} s')
    manquantes = [i for i in ids if not i.startswith('a') and i not in durees]
    if manquantes:
        print('Lignes sans voix (durée estimée) :', ', '.join(manquantes))
    json.dump({'durees': durees, 'fichiers': fichiers}, open(SORTIE, 'w'), indent=1)
    print(SORTIE)


if __name__ == '__main__':
    main()
