"""Fond en encre diluée pour l'écran hors ligne (1920 × 1080), même réglage que la bannière (motif fin, taches miel)."""
import os
import sys

import numpy as np
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ICI, '..', 'motifs'))
from encre import Encre   # noqa: E402

img = Encre(1920, 1080, graine=7, echelle=0.7).image(3.0, 30.0)
Image.fromarray((img * 255 + 0.5).astype(np.uint8)).save(os.path.join(ICI, 'fond-hors-ligne.png'))
