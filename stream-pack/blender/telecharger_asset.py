#!/usr/bin/env python3
"""Télécharge un asset Poly Haven (CC0) au format .blend, avec ses textures, via l'API publique.
    python3 telecharger_asset.py models sofa_02 2k dossier/"""
import json, os, sys, urllib.request

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'KayzxTV-stream-pack/1.0'})
    return urllib.request.urlopen(req, timeout=120).read()

type_, ident, res, sortie = sys.argv[1:5]
fichiers = json.loads(get(f'https://api.polyhaven.com/files/{ident}'))
dossier = os.path.join(sortie, ident)
os.makedirs(dossier, exist_ok=True)
if type_ == 'hdris':
    url = fichiers['hdri'][res]['exr']['url']
    open(os.path.join(dossier, f'{ident}_{res}.exr'), 'wb').write(get(url))
else:
    blend = fichiers['blend'][res]['blend']
    open(os.path.join(dossier, os.path.basename(blend['url'])), 'wb').write(get(blend['url']))
    for chemin, info in blend.get('include', {}).items():   # textures référencées par le .blend
        cible = os.path.join(dossier, chemin)
        os.makedirs(os.path.dirname(cible), exist_ok=True)
        open(cible, 'wb').write(get(info['url']))
print(type_, ident, 'ok')
