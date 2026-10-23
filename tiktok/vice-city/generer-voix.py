#!/usr/bin/env python3
"""Voix off avec Rémy (voix neuronale Microsoft, via edge-tts) : une phrase par fichier dans
medias/voix/, la durée de chaque phrase et l'instant de chaque mot dans medias/voix.json.

    pip install edge-tts      (derrière le proxy : ajouter son certificat au bundle de certifi)
    python3 generer-voix.py
"""
import asyncio, json, os, re, subprocess
import edge_tts

ICI = os.path.dirname(os.path.abspath(__file__))
VOIX, DEBIT = 'fr-FR-RemyMultilingualNeural', '+6%'
# Prononciation : ce que Rémy lit mal, réécrit pour la synthèse seulement.
PRONONCE = [(r'GTA 6', 'GTA six'), (r'GTA 5', 'GTA cinq'), (r'\b2022\b', 'deux mille vingt-deux'), (r'\b19 novembre', 'dix-neuf novembre')]

async def une(i, texte):
    for a, b in PRONONCE:
        texte = re.sub(a, b, texte)
    c = edge_tts.Communicate(texte, VOIX, rate=DEBIT, boundary='WordBoundary')
    audio, mots = b'', []
    async for m in c.stream():
        if m['type'] == 'audio':
            audio += m['data']
        elif m['type'] == 'WordBoundary':
            mots.append([m['text'], m['offset'] / 1e7])
    chemin = os.path.join(ICI, 'medias', 'voix', f'{i}.mp3')
    open(chemin, 'wb').write(audio)
    duree = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', chemin], capture_output=True, text=True).stdout)
    # La fin de parole : dernier mot + sa durée approximative (l'mp3 garde un peu de silence).
    return mots, duree

async def main():
    src = open(os.path.join(ICI, 'js', 'partition.js'), encoding='utf-8').read()
    lignes = re.findall(r"""\{ id: '(s\d+b?)', dit: ("[^"]*"|'(?:[^'\\]|\\.)*')""", src)
    os.makedirs(os.path.join(ICI, 'medias', 'voix'), exist_ok=True)
    sortie = {'durees': {}, 'mots': {}, 'fichiers': {}}
    for i, d in lignes:
        mots, duree = await une(i, d[1:-1].replace("\\'", "'"))
        debut = mots[0][1] if mots else 0
        # Les fichiers commencent par ~0,1 s de silence : on recale tout sur le premier mot.
        sortie['mots'][i] = [[w, round(s - debut, 3)] for w, s in mots]
        sortie['durees'][i] = round(duree - debut - 0.25, 3)
        sortie['fichiers'][i] = {'fichier': f'medias/voix/{i}.mp3', 'decalage': round(-debut, 3)}
        print(i, sortie['durees'][i], 's')
    json.dump(sortie, open(os.path.join(ICI, 'medias', 'voix.json'), 'w'), ensure_ascii=False, indent=1)

asyncio.run(main())
