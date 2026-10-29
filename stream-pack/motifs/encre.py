"""Le motif signature de la chaîne : l'encre diluée (teal et miel qui se mêlent dans la nuit), animé en boucle
sans couture. Utilisé par les overlays et les transitions.
    from encre import Encre ; e = Encre(1920, 1080) ; e.image(t, duree)  → tableau RGB (float, 0–1)"""
import math

import numpy as np
from scipy.ndimage import gaussian_filter, map_coordinates, zoom

hexa = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255
NUIT, TEAL, MIEL = hexa('#0F1519'), hexa('#1E5B57'), hexa('#E0A93B')


class Encre:
    def __init__(self, w, h, graine=5, echelle=0.5, rayon=70, lisser=False):
        """Calcul à mi-résolution (l'encre est douce), agrandi ensuite. rayon : amplitude du mouvement (px, mi-résolution).
        lisser : calcule à pleine résolution et n'agrandit plus rien. L'agrandissement bilinéaire laissait une trame fixe
        à l'écran, sur laquelle l'encre scintillait en glissant. Les motifs sont élargis d'autant pour garder le même aspect."""
        self.w, self.h = w, h
        k = 1 / echelle if lisser else 1.0
        self.cw, self.ch = (w, h) if lisser else (int(w * echelle), int(h * echelle))
        self.rayon = rayon * k
        marge = int(self.rayon * 2 + 8)
        def champ(taille, g):
            hh, ww = self.ch + 2 * marge, self.cw + 2 * marge
            taille = max(2, round(taille * k))
            b = np.random.default_rng(g).normal(size=(hh // taille + 3, ww // taille + 3))
            f = gaussian_filter(zoom(b, taille, order=3)[:hh, :ww], 2 * k)
            return ((f - f.mean()) / f.std()).astype(np.float32)   # écart type 1 : dosage des encres maîtrisé
        self.marge = marge
        self.a, self.b, self.c = champ(110, graine), champ(80, graine + 1), champ(140, graine + 2)
        self.yy, self.xx = np.mgrid[0:self.ch, 0:self.cw].astype(np.float32)
        self.grains = [np.random.default_rng(100 + k).normal(0, 0.022, (h, w, 1)).astype(np.float32) for k in range(12)]

    def _lire(self, champ, dx, dy):
        return map_coordinates(champ, [self.yy + self.marge + dy, self.xx + self.marge + dx], order=1)

    def image(self, t, duree, grain=True, k_grain=0):
        """Image à l'instant t d'une boucle de `duree` s : chaque encre tourne sur un petit cercle (retour exact au départ)."""
        th = 2 * math.pi * t / duree
        r = self.rayon
        dc = self._lire(self.c, r * 0.6 * math.cos(th), r * 0.6 * math.sin(th)) * 12   # lente déformation d'ensemble
        a = self._lire(self.a, r * math.cos(th) + dc, r * math.sin(th))
        b = self._lire(self.b, -r * math.sin(th), r * math.cos(th) + dc)
        ta = np.clip(0.55 + a * 0.5, 0, 1)[..., None]                # le teal domine, en nappes douces
        tb = (np.clip((b - 0.85) * 1.1, 0, 1) * 0.85)[..., None]     # le miel en touches (un cinquième du fond)
        petit = (NUIT * (1 - ta) + TEAL * ta) * (1 - tb) + MIEL * tb
        img = petit.astype(np.float32) if self.ch == self.h else \
            np.asarray(zoom(petit, (self.h / self.ch, self.w / self.cw, 1), order=1), dtype=np.float32)
        if grain:
            img = img + self.grains[k_grain % len(self.grains)]
        return np.clip(img, 0, 1)
