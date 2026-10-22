#!/usr/bin/env python3
"""Prépare les médias du TikTok dans medias/ (hors dépôt : photos sous droits).

Les photos d'origine viennent de deux collectes (voir medias/SOURCES.txt et le SOURCES.txt de
la collecte) : Creapills / Local 10 / Vice / GamesRadar (déjà dans medias/), puis les photos
de fans et de médias rassemblées dans le dossier PHOTOS2. Ce script les copie sous des noms
stables, recadre ce qui doit l'être et agrandit proprement les panneaux de l'accroche.

    PHOTOS2=/chemin/vers/photos2 python3 preparer-medias.py
"""
import os

from PIL import Image, ImageFilter

ICI = os.path.dirname(os.path.abspath(__file__))
M = os.path.join(ICI, 'medias')
PHOTOS2 = os.environ.get('PHOTOS2', '/tmp/claude-0/-home-user-kz-tv-bot/3c82976b-62a2-5d12-bd6b-b8dbbff4a677/scratchpad/tiktok-gta/photos2')


def agrandir(img, facteur=2):
    # Agrandissement Lanczos puis netteté douce : le navigateur n'a plus qu'à réduire légèrement,
    # ce qui donne une image plus nette qu'un agrandissement direct à l'écran.
    grand = img.resize((img.width * facteur, img.height * facteur), Image.LANCZOS)
    return grand.filter(ImageFilter.UnsharpMask(radius=2.2, percent=55, threshold=3))


def sortir(img, nom):
    img.convert('RGB').save(os.path.join(M, nom), quality=93)
    print(f'medias/{nom}  {img.width}×{img.height}')


# L'accroche : la photo de l'enseigne publiée par Creapills est un diptyque (vue d'ensemble
# au-dessus, gros plan des ouvriers au-dessous, séparés à la ligne 720).
im = Image.open(os.path.join(M, 'creapills-72.jpeg')).convert('RGB')
w, h = im.size
sortir(agrandir(im.crop((0, 0, w, 718))), 'accroche-haut.jpg')
sortir(agrandir(im.crop((0, 723, w, h))), 'accroche-bas.jpg')

# L'enseigne vue d'hélicoptère (WPLG Local 10) : on retire le logo de la chaîne, en bas à droite.
im = Image.open(os.path.join(M, 'local10-01.jpg'))
sortir(im.crop((40, 0, 1110, 606)), 'enseigne-helico.jpg')

# Collecte n° 2 : nom final ← (fichier d'origine, recadrage éventuel (gauche, haut, droite, bas)).
COLLECTE = {
    'voitures-plaque.jpg': ('voitures-x-tallglassofwada-03.jpg', None),
    'voitures-coquette.jpg': ('voitures-x-gtasixinfo-01.jpg', None),
    'voitures-mclaren.jpg': ('voitures-x-tallglassofwada-02.jpg', None),
    'voitures-police.jpg': ('voitures-x-gtasixinfo-02.jpg', None),
    'plage-chaise-bleue.jpg': ('plage-x-samchrme-01.jpg', None),
    'plage-chaises-rouges.jpg': ('plage-x-samchrme-04.jpg', None),
    'plage-avion-bienvenue.jpg': ('plage-gtaboom-01.jpg', (0, 0, 972, 1097)),
    'plage-avion-nine1nine.jpg': ('plage-gtaboom-01.jpg', (978, 0, 1950, 1097)),
    'plage-parasols.jpg': ('plage-videotech-crop-parasols.jpg', (0, 70, 2100, 801)),  # sans le filigrane
    'fresque-faile.jpg': ('wynwood-miaminewtimes-01.jpg', None),
    'fresque-vice-city.jpg': ('wynwood-x-gtasixpolska-02.jpg', None),
    'fresque-flamants.jpg': ('wynwood-x-gtasixpolska-01.jpg', None),
    'monde-brooklyn.jpg': ('brooklyn-x-gtavicountdown-02.jpg', None),
    'monde-hollywood.jpg': ('hollywood-x-duvalvice-02.jpg', None),
    'monde-new-york-spotify.jpg': ('spotify-x-spotify-01.jpg', None),
    'monde-paris-pose.jpg': ('paris-x-brunodecottigni-01.jpg', None),
    'monde-paris-tour.jpg': ('paris-x-gtasix-01.jpg', None),
    'heat-affiche.jpg': ('heat-x-miamiheat-02.jpg', None),
    'heat-freedom-tower.jpg': ('heat-x-miamiheat-01.jpg', None),
}
for nom, (src, boite) in COLLECTE.items():
    chemin = os.path.join(PHOTOS2, src)
    if not os.path.exists(chemin):
        print(f'ABSENT : {chemin}')
        continue
    im = Image.open(chemin)
    if boite:
        im = im.crop(boite)
    # Les très grandes images sont ramenées à 2400 px de haut au plus (poids, décodage).
    if im.height > 2400:
        im = im.resize((round(im.width * 2400 / im.height), 2400), Image.LANCZOS)
    sortir(im, nom)
