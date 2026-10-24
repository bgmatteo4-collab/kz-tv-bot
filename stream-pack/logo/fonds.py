"""Fonds en encre diluée (le motif de la chaîne) pour le logo Twitch (800 × 800) et la bannière de profil (1200 × 480)."""
import os
import sys

import numpy as np
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ICI, '..', 'motifs'))
from encre import Encre   # noqa: E402

# Bannière : échelle 0,8 (motif plus fin, plus de taches miel) pour que le motif se lise sur toute la largeur.
for nom, w, h, graine, t, ech in (('fond-logo.png', 800, 800, 5, 4.0, 0.5), ('fond-banniere.png', 1200, 480, 7, 3.0, 0.8)):
    img = Encre(w, h, graine=graine, echelle=ech).image(t, 30.0)
    Image.fromarray((img * 255 + 0.5).astype(np.uint8)).save(os.path.join(ICI, nom))
    print(nom)
