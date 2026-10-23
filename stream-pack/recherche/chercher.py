#!/usr/bin/env python3
"""Cherche des modèles 3D sur Sketchfab (recherche publique) et garde ceux présents dans Objaverse
(téléchargeables sans compte sur Hugging Face), avec une licence compatible avec un stream monétisé.
    python3 chercher.py   → candidats.json + vignettes/<objet>/*.jpg"""
import gzip, json, os, time, urllib.parse, urllib.request

ICI = os.path.dirname(os.path.abspath(__file__))
OBJETS = {
    'canape': ['modern sectional sofa', 'corner sofa', 'modular sofa'],
    'tv': ['85 inch tv', 'modern tv samsung', 'oled tv'],
    'siege_gaming': ['gaming chair'],
    'bureau': ['modern desk wood', 'standing desk'],
    'ecran': ['monitor 27', 'computer monitor'],
    'micro': ['shure sm7b', 'podcast microphone arm'],
    'carte_son': ['focusrite scarlett', 'audio interface'],
    'stream_deck': ['elgato stream deck', 'stream deck'],
    'webcam': ['logitech webcam'],
    'key_light': ['elgato key light', 'led panel light desk'],
    'casque': ['headphones', 'headphone stand'],
    'clavier': ['mechanical keyboard'],
    'souris': ['gaming mouse'],
    'ps5': ['playstation 5', 'ps5 console'],
    'xbox': ['xbox series x'],
    'switch': ['nintendo switch'],
    'bouclier': ['captain america shield'],
    'casque_ironman': ['iron man helmet'],
    'mjolnir': ['mjolnir'],
    'gant_infini': ['infinity gauntlet'],
    'delorean': ['delorean back to the future', 'delorean'],
    'convecteur': ['flux capacitor'],
    'hoverboard': ['hoverboard back to the future'],
    'pistolet_portail': ['portal gun rick and morty'],
    'plumbus': ['plumbus'],
    'meeseeks': ['meeseeks box'],
    'plante': ['monstera plant pot', 'fiddle leaf fig'],
    'lampadaire': ['modern floor lamp'],
}
LICENCES = {'CC Attribution', 'CC0 Public Domain', 'Free Standard'}
paths = json.load(gzip.open(os.path.join(ICI, 'paths.json.gz')))

def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'KayzxTV/1.0'}), timeout=60).read()

sortie = {}
for objet, requetes in OBJETS.items():
    vus = {}
    for q in requetes:
        url = 'https://api.sketchfab.com/v3/search?' + urllib.parse.urlencode({'type': 'models', 'q': q, 'downloadable': 'true', 'sort_by': '-likeCount', 'count': 24})
        try:
            res = json.loads(get(url)).get('results', [])
        except Exception as e:
            print(objet, q, 'erreur', e); continue
        for m in res:
            lic = (m.get('license') or {}).get('label', '')
            if m['uid'] in paths and lic in LICENCES and m['uid'] not in vus and (m.get('faceCount') or 0) < 600000:
                imgs = sorted((m.get('thumbnails') or {}).get('images', []), key=lambda i: abs(i['width'] - 400))
                vus[m['uid']] = {'uid': m['uid'], 'nom': m['name'], 'auteur': m['user']['username'], 'licence': lic,
                                 'faces': m.get('faceCount'), 'likes': m.get('likeCount'), 'vignette': imgs[0]['url'] if imgs else '',
                                 'chemin': paths[m['uid']]}
        time.sleep(0.4)
    cands = sorted(vus.values(), key=lambda c: -c['likes'])[:6]
    sortie[objet] = cands
    os.makedirs(os.path.join(ICI, 'vignettes', objet), exist_ok=True)
    for i, c in enumerate(cands):
        if c['vignette']:
            open(os.path.join(ICI, 'vignettes', objet, f'{i}.jpg'), 'wb').write(get(c['vignette']))
    print(objet, len(cands), [c['nom'][:28] for c in cands[:4]])
json.dump(sortie, open(os.path.join(ICI, 'candidats.json'), 'w'), ensure_ascii=False, indent=1)
