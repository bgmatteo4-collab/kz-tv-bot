#!/usr/bin/env python3
"""Assemble Kayzx Studio en une seule page HTML (celle qu'on publie).

    python3 workspace/construire.py [chemin-sortie]

Lit src/ (base, données), parts/ (coque, sections) et, s'il existe, medias.json
({"intro": {"video": url}, "attente": {"video": url}}) ; les affiches sont incluses
en data URI depuis le dossier des affiches (variable AFFICHES).
"""
import base64
import json
import os
import sys

ICI = os.path.dirname(os.path.abspath(__file__))
AFFICHES = os.environ.get('AFFICHES', '/tmp/claude-0/-home-user-kz-tv-bot/3c82976b-62a2-5d12-bd6b-b8dbbff4a677/scratchpad/workspace')


def lire(*p):
    with open(os.path.join(ICI, *p), encoding='utf-8') as f:
        return f.read()


def affiche(nom):
    chemin = os.path.join(AFFICHES, nom)
    if not os.path.exists(chemin):
        return ''
    with open(chemin, 'rb') as f:
        return 'data:image/jpeg;base64,' + base64.b64encode(f.read()).decode()


def main():
    sortie = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ICI, 'kayzx-studio.html')
    medias = {'intro': {}, 'attente': {}}
    if os.path.exists(os.path.join(ICI, 'medias.json')):
        medias.update(json.loads(lire('medias.json')))
    medias['intro']['affiche'] = affiche('affiche-intro.jpg')
    medias['attente']['affiche'] = affiche('affiche-attente.jpg')

    page = f"""<title>Kayzx Studio</title>
<meta name="description" content="L'atelier de Kayzx TV : motions, références et idées.">
<style>
{lire('src', 'base.css')}
html {{ scroll-behavior: smooth; scroll-padding-top: 64px; }}
@media (prefers-reduced-motion: reduce) {{ html {{ scroll-behavior: auto; }} }}
#contenu {{ transform-origin: 50% 0; }}
</style>
<script>
{lire('src', 'base.js')}
{lire('src', 'donnees.js')}
window.KS_MEDIAS = {json.dumps(medias, ensure_ascii=False)};
</script>
{lire('parts', 'coque.html')}
<main id="contenu">
{lire('parts', 'accueil-projets.html')}
{lire('parts', 'mouvement.html')}
{lire('parts', 'outils.html')}
</main>
"""
    with open(sortie, 'w', encoding='utf-8') as f:
        f.write(page)
    print(f'{sortie} · {len(page.encode()) / 1024:.0f} Ko')


if __name__ == '__main__':
    main()
