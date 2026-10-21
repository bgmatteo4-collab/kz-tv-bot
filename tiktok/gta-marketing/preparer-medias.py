#!/usr/bin/env python3
"""Prépare les médias du TikTok (dans medias/, hors dépôt : photos sous droits).

La photo de l'enseigne publiée par Creapills est un diptyque (vue d'ensemble au-dessus,
gros plan des ouvriers au-dessous, séparés à la ligne 720) : on la coupe en deux panneaux.

    python3 preparer-medias.py
"""
import os

from PIL import Image, ImageFilter

ICI = os.path.dirname(os.path.abspath(__file__))
M = os.path.join(ICI, 'medias')


def agrandir(img, facteur=2):
    # Agrandissement Lanczos puis netteté douce : le navigateur n'a plus qu'à réduire légèrement,
    # ce qui donne une image plus nette qu'un agrandissement direct à l'écran.
    grand = img.resize((img.width * facteur, img.height * facteur), Image.LANCZOS)
    return grand.filter(ImageFilter.UnsharpMask(radius=2.2, percent=55, threshold=3))


im = Image.open(os.path.join(M, 'creapills-72.jpeg')).convert('RGB')
w, h = im.size
agrandir(im.crop((0, 0, w, 718))).save(os.path.join(M, 'accroche-haut.jpg'), quality=94)
agrandir(im.crop((0, 723, w, h))).save(os.path.join(M, 'accroche-bas.jpg'), quality=94)
print('medias/accroche-haut.jpg, medias/accroche-bas.jpg')
