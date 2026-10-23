"""Prépare tout ce qu'il faut pour rendre le pack, sur n'importe quel ordinateur où Blender 5.1 est installé
(Windows, Mac ou Linux) : assets Poly Haven (CC0), modèles Objaverse (CC-BY), affiches, programme de la TV.
    blender -b -P stream-pack/blender/preparer.py"""
import os
import subprocess
import sys
import urllib.request

import bpy

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.normpath(os.path.join(ICI, '..'))
ASSETS = os.path.join(RACINE, 'assets')
os.makedirs(ASSETS, exist_ok=True)
py = sys.executable   # le Python fourni avec Blender

for ligne in open(os.path.join(RACINE, 'assets.txt'), encoding='utf-8'):
    if not ligne.strip() or ligne.startswith('#'):
        continue
    genre, ident, res = ligne.split()[:3]
    marque = os.path.join(ASSETS, ident + '.ok')
    if not os.path.exists(marque):
        subprocess.run([py, os.path.join(ICI, 'telecharger_asset.py'), genre, ident, res, ASSETS], check=True)
        open(marque, 'w').close()
subprocess.run([py, os.path.join(ICI, 'telecharger_modeles.py')], check=True)

os.makedirs(os.path.join(ASSETS, 'affiches'), exist_ok=True)
for nom, ident in (('endgame', 'bR8ISy1O9XQxqiy0fQFw2BX72RQ'), ('retour-vers-le-futur', 'vN5B5WgYscRGcQpVhHl6p9DDTP0'),
                   ('rick-et-morty', 'owhkU6KRqdXoUQpjV8uyZGPtX58')):
    cible = os.path.join(ASSETS, 'affiches', nom + '.jpg')
    if not os.path.exists(cible):
        req = urllib.request.Request(f'https://image.tmdb.org/t/p/original/{ident}.jpg', headers={'User-Agent': 'KayzxTV/1.0'})
        open(cible, 'wb').write(urllib.request.urlopen(req, timeout=120).read())

tv = os.path.join(ASSETS, 'tv')
if not (os.path.exists(os.path.join(tv, 'programme.mp4')) or os.path.exists(os.path.join(tv, 'images', '0899.jpg'))):
    subprocess.run([bpy.app.binary_path, '-b', '-P', os.path.join(RACINE, 'tv', 'programme.py')], check=True)
print('Tout est prêt pour le rendu.')
