#!/usr/bin/env python3
"""Télécharge les modèles choisis (modeles.json) depuis Objaverse, sans compte : assets/objaverse/<objet>.glb"""
import json, os, urllib.request
ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.join(ICI, '..')
sortie = os.path.join(RACINE, 'assets', 'objaverse')
os.makedirs(sortie, exist_ok=True)
for objet, m in json.load(open(os.path.join(RACINE, 'modeles.json'))).items():
    cible = os.path.join(sortie, f'{objet}.glb')
    if os.path.exists(cible):
        continue
    url = f"https://huggingface.co/datasets/allenai/objaverse/resolve/main/{m['chemin']}"
    data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'KayzxTV/1.0'}), timeout=300).read()
    open(cible, 'wb').write(data)
    print(objet, round(len(data) / 1e6, 1), 'Mo')
