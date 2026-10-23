"""Programme de la TV du salon : des paysages HDRI Poly Haven (CC0, 8K) filmés en lents travellings,
enchaînés en fondus, encodés en MP4 (assets/tv/programme.mp4). Lancé avec Blender (OpenImageIO + numpy) :
    blender -b -P stream-pack/tv/programme.py              → les images puis le MP4
    blender -b -P stream-pack/tv/programme.py -- --essai 1 → planche de repérage des cadrages"""
import math
import os
import shutil
import subprocess
import sys

import numpy as np
import OpenImageIO as oiio

ICI = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(ICI, '..', 'assets')
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
opt = {args[i].lstrip('-'): args[i + 1] for i in range(0, len(args) - 1, 2)}
FPS, DUREE, W, H = 30, 30.0, 1280, 720

# (hdri, début, fin en s, cap de départ → d'arrivée (fraction de tour), tangage en degrés, champ de départ → d'arrivée)
PLANS = [
    ('lakeside', 0.0, 10.3, (0.45, 0.53), -2, (52, 50)),         # les arbres de la berge, puis le lac s'ouvre
    ('cape_hill', 9.7, 20.3, (0.40, 0.50), -2, (54, 52)),        # la montagne au soleil jusqu'à la côte dans la brume
    ('umhlanga_sunrise', 19.7, 30.0, (0.60, 0.60), 0, (56, 44)),  # lente avancée vers le soleil levant sur l'océan
]
FONDU = 0.6


def lire(ident):
    entree = oiio.ImageInput.open(os.path.join(ASSETS, ident, f'{ident}_8k.exr'))
    img = entree.read_image(0, 0, 0, 3, 'float'); entree.close()
    return np.ascontiguousarray(img, dtype=np.float32)


def vue(img, cap, tangage, champ, w=W, h=H):
    """Caméra perspective dans le panorama équirectangulaire, échantillonnage bilinéaire."""
    hi, wi, _ = img.shape
    t = math.tan(math.radians(champ) / 2)
    xs = ((np.arange(w) + 0.5) / w * 2 - 1) * t
    ys = (1 - (np.arange(h) + 0.5) / h * 2) * t * h / w
    x, y = np.meshgrid(xs, ys); z = np.ones_like(x)
    cp, sp = math.cos(math.radians(tangage)), math.sin(math.radians(tangage))
    y, z = y * cp + z * sp, -y * sp + z * cp
    lon = np.arctan2(x, z); lat = np.arctan2(y, np.hypot(x, z))
    u = ((cap + lon / (2 * math.pi)) % 1.0) * wi - 0.5
    v = (0.5 - lat / math.pi) * hi - 0.5
    x0 = np.floor(u).astype(np.int64); y0 = np.floor(v).astype(np.int64)
    fx = (u - x0)[..., None]; fy = (v - y0)[..., None]
    x0 %= wi; x1 = (x0 + 1) % wi
    y1 = np.clip(y0 + 1, 0, hi - 1); y0 = np.clip(y0, 0, hi - 1)
    return (img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x1] * fx * (1 - fy)
            + img[y1, x0] * (1 - fx) * fy + img[y1, x1] * fx * fy)


def flou(img, n=6):
    """Flou large et bon marché : moyenne 16×16, flous en croix répétés, puis retour à la taille d'origine."""
    h, w, _ = img.shape
    p = img[:h // 16 * 16, :w // 16 * 16].reshape(h // 16, 16, w // 16, 16, 3).mean(axis=(1, 3))
    for _ in range(n):
        p = (p + np.roll(p, 1, 0) + np.roll(p, -1, 0) + np.roll(p, 1, 1) + np.roll(p, -1, 1)) / 5
    hp, wp, _ = p.shape   # retour bilinéaire à la taille d'origine (pas de pavés)
    ys = np.clip((np.arange(h) + 0.5) / 16 - 0.5, 0, hp - 1); xs = np.clip((np.arange(w) + 0.5) / 16 - 0.5, 0, wp - 1)
    y0 = np.floor(ys).astype(int); x0 = np.floor(xs).astype(int)
    y1 = np.minimum(y0 + 1, hp - 1); x1 = np.minimum(x0 + 1, wp - 1)
    fy = (ys - y0)[:, None, None]; fx = (xs - x0)[None, :, None]
    haut = p[y0][:, x0] * (1 - fx) + p[y0][:, x1] * fx
    bas = p[y1][:, x0] * (1 - fx) + p[y1][:, x1] * fx
    return haut * (1 - fy) + bas * fy


def filmique(rgb, expo):
    """Exposition, halo autour des fortes lumières (le soleil), courbe ACES sur la luminance (les teintes
    restent justes) et saturation qui part vers le blanc dans les hautes lumières, comme un vrai capteur."""
    x = rgb * expo
    x = x + 0.22 * flou(np.maximum(x - 1.5, 0), 8)
    lum = np.maximum(x @ np.array([0.2126, 0.7152, 0.0722], np.float32), 1e-6)[..., None]
    lt = np.clip((lum * (2.51 * lum + 0.03)) / (lum * (2.43 * lum + 0.59) + 0.14), 0, 1)
    c = x * (lt / lum)
    blanc = np.clip((c.max(axis=-1, keepdims=True) - 0.8) / 0.6, 0, 1)
    c = np.clip(c * (1 - blanc) + lt * blanc + blanc * 0.15, 0, 1)
    return np.where(c <= 0.0031308, 12.92 * c, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def ecrire(chemin, rgb):
    sortie = oiio.ImageOutput.create(chemin)
    spec = oiio.ImageSpec(rgb.shape[1], rgb.shape[0], 3, 'uint8'); spec.attribute('Compression', 'jpeg:92')
    sortie.open(chemin, spec); sortie.write_image((rgb * 255 + 0.5).astype(np.uint8)); sortie.close()


if 'essai' in opt:   # planche : 8 caps par panorama, pour choisir les cadrages
    lignes = []
    for ident, *_ in PLANS:
        img = lire(ident)
        ligne = [filmique(vue(img, k / 8, -3, 55, 320, 180), 0.18 / max(1e-4, float(np.median(img)))) for k in range(8)]
        lignes.append(np.concatenate(ligne, axis=1)); del img
    ecrire(os.path.join(ASSETS, 'tv', 'reperage.jpg'), np.concatenate(lignes, axis=0))
    sys.exit(0)

dossier = os.path.join(ASSETS, 'tv', 'images'); os.makedirs(dossier, exist_ok=True)
seules = [int(x) for x in opt['images'].split(',')] if 'images' in opt else None   # --images 60,780 : essai sur quelques images
images = {}
expos = {}
for ident, t0, t1, caps, tang, champs in PLANS:
    images[ident] = lire(ident)
    lum = vue(images[ident], caps[0], tang, champs[0], 320, 180) @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    expos[ident] = 0.2 / max(1e-4, float(np.percentile(lum, 55)))
for f in (seules or range(int(DUREE * FPS))):
    t = f / FPS
    couches = []
    for ident, t0, t1, caps, tang, champs in PLANS:
        if t0 <= t <= t1:
            k = (t - t0) / (t1 - t0); k = k * k * (3 - 2 * k) * 0.3 + k * 0.7   # vitesse presque constante, départ doux
            poids = min(1.0, (t - t0) / FONDU if t0 > 0 else 1.0, (t1 - t) / FONDU if t1 < DUREE else 1.0)
            img = filmique(vue(images[ident], caps[0] + (caps[1] - caps[0]) * k, tang,
                               champs[0] + (champs[1] - champs[0]) * k), expos[ident])
            couches.append((poids, img))
    total = sum(p for p, _ in couches)
    ecrire(os.path.join(dossier, f'{f:04d}.jpg'), sum(p * i for p, i in couches) / total)
    if f % 150 == 0:
        print('image', f, flush=True)
if seules or not shutil.which('ffmpeg'):   # sans ffmpeg (PC Windows) : Blender lit directement les images
    sys.exit(0)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', os.path.join(dossier, '%04d.jpg'),
                '-c:v', 'libx264', '-crf', '15', '-pix_fmt', 'yuv420p', os.path.join(ASSETS, 'tv', 'programme.mp4')], check=True)
print('programme.mp4 ok')
