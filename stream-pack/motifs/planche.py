"""Planche de motifs signature pour la chaîne (dans l'esprit des vagues animées, aux couleurs du pack).
    python3 planche.py → planche-motifs.png"""
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import zoom, gaussian_filter

W, H = 960, 540
rng = np.random.default_rng(7)
hexa = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255


def bruit(echelle, graine):
    g = np.random.default_rng(graine).normal(size=(H // echelle + 3, W // echelle + 3))
    return gaussian_filter(zoom(g, echelle, order=3)[:H, :W], 2)


y, x = np.mgrid[0:H, 0:W].astype(np.float32)


def deux_tons(champ, a, b, doux=0.02):
    t = np.clip(champ / doux * 0.5 + 0.5, 0, 1)[..., None]
    return hexa(a) * (1 - t) + hexa(b) * t


def marbre(a, b, graine=1):
    """Marbre liquide : des bandes déformées deux fois (domaine tordu), comme de l'encre tirée au peigne."""
    n1, n2 = bruit(140, graine), bruit(140, graine + 1)
    xx, yy = x + 260 * n1, y + 260 * n2
    m1 = bruit(60, graine + 2)
    return deux_tons(np.sin((xx * 0.6 + yy * 0.8) / 34 + 3.5 * m1), a, b, 0.06)


def veines(fond, trait, graine=3):
    """Veines de noyer : les cernes du bois en lignes fines qui ondulent (courbes de niveau d'un champ tordu)."""
    n = bruit(170, graine) * 2.2 + y / 260 + 0.6 * bruit(60, graine + 1)
    l = np.abs(np.sin(n * np.pi * 3.2))
    t = np.clip((0.18 - l) / 0.08, 0, 1)[..., None]
    return hexa(fond) * (1 - t) + hexa(trait) * t


def vagues(fond, trait):
    """Vagues japonaises (seigaiha) : écailles d'arcs concentriques ; chaque rangée recouvre la précédente."""
    r = 110
    img = np.zeros((H, W), np.float32)
    for row in range(-1, int(H / (r * 0.5)) + 3):
        cy = row * r * 0.5
        for col in range(-1, W // r + 3):
            cx = col * r + (r / 2 if row % 2 else 0)
            x0, x1 = int(max(0, cx - r)), int(min(W, cx + r + 1)); y0, y1 = int(max(0, cy - r)), int(min(H, cy + r + 1))
            if x0 >= x1 or y0 >= y1:
                continue
            d = np.hypot(x[y0:y1, x0:x1] - cx, y[y0:y1, x0:x1] - cy)
            zone = img[y0:y1, x0:x1]
            zone[d < r] = 0                                   # le disque recouvre ce qui est derrière
            for k in range(5):
                zone[(np.abs(d - (r * 0.93 - k * r * 0.19)) < 4.5) & (d < r)] = 1
    t = np.clip(gaussian_filter(img, 0.7), 0, 1)[..., None]
    return hexa(fond) * (1 - t) + hexa(trait) * t


def encre(fond, a, b, graine=5):
    """Encre diluée : deux encres qui se mêlent lentement dans l'eau, sans bord net."""
    n1, n2 = bruit(110, graine), bruit(80, graine + 1)
    ta = np.clip(n1 * 2.6, 0, 1)[..., None]; tb = np.clip(n2 * 2.6 - 0.3, 0, 1)[..., None] * 0.85
    c = hexa(fond) * (1 - ta) + hexa(a) * ta
    return c * (1 - tb) + hexa(b) * tb


cases = [
    ('A · Marbre liquide', marbre('#F1ECE3', '#1E5B57')),
    ('B · Veines de noyer', veines('#1E5B57', '#E0A93B')),
    ('C · Vagues japonaises', vagues('#F1ECE3', '#1E5B57')),
    ('D · Encre diluée', encre('#0F1519', '#1E5B57', '#E0A93B')),
]
planche = Image.new('RGB', (1920, 1080))
police = ImageFont.truetype('../da/Rubik-3.ttf', 40)
for k, (nom, img) in enumerate(cases):
    im = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((24, H - 84, 24 + 34 * len(nom) * 0.62 + 40, H - 24), 14, fill=(15, 21, 25))
    d.text((44, H - 78), nom, font=police, fill=(241, 236, 227))
    planche.paste(im, ((k % 2) * W, (k // 2) * H))
planche.save('planche-motifs.png')
