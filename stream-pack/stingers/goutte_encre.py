"""Transition (stinger) « la goutte d'encre », 2 s : une goutte teal tombe, éclot en volutes qui couvrent l'écran
(c'est là qu'OBS change de scène), KAYZX TV apparaît, puis l'encre se dilue et révèle la nouvelle scène.
Son marqué : goutte, whoosh, note grave et tintement sur le nom, souffle qui se retire.
    python3 goutte_encre.py [--planche 1]  → goutte-encre.webm (VP9 + transparence, son Opus)
Dans OBS : Transition « Stinger », ce fichier, point de transition 850 ms."""
import math
import os
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import gaussian_filter, zoom

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ICI, '..', 'motifs'))
from encre import Encre, MIEL, TEAL   # noqa: E402

FPS, DUREE, W, H = 30, 2.0, 1920, 1080
PAPIER = np.array([0xF1, 0xEC, 0xE3], np.float32) / 255
CHUTE, COUVERT, NOM, DILUTION = 0.15, 0.85, 0.6, 1.0   # repères (s)
lisse = lambda k: k * k * (3 - 2 * k)
sortie_ease = lambda k: 1 - (1 - k) ** 3

y, x = np.mgrid[0:H, 0:W].astype(np.float32)
cx, cy = W / 2, H / 2
dist = np.hypot(x - cx, y - cy)
angle = np.arctan2(y - cy, x - cx)


def champ(taille, graine):
    b = np.random.default_rng(graine).normal(size=(H // taille + 3, W // taille + 3))
    f = gaussian_filter(zoom(b, taille, order=3)[:H, :W], 2)
    return ((f - f.mean()) / f.std()).astype(np.float32)


bord = champ(90, 21)                       # irrégularité du front d'encre
fils = champ(40, 22)                       # filets miel sur le front
dissol = champ(70, 23)                     # ordre dans lequel l'encre se dilue (bords d'abord)
rmax = math.hypot(cx, cy) * 1.25
encre = Encre(W, H, graine=9, rayon=90)

# Le nom, rendu une fois (papier + miel), centré.
police = ImageFont.truetype(os.path.join(ICI, '..', 'da', 'Rubik-3.ttf'), 210)
calque_nom = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(calque_nom)
l1, l2 = d.textlength('KAYZX ', font=police), d.textlength('TV', font=police)
x0 = (W - l1 - l2) / 2
d.text((x0, H / 2), 'KAYZX ', font=police, fill=(241, 236, 227, 255), anchor='lm')
d.text((x0 + l1, H / 2), 'TV', font=police, fill=(224, 169, 59, 255), anchor='lm')
NOM_IMG = np.asarray(calque_nom, dtype=np.float32) / 255


def image(t):
    """Renvoie (rgb, alpha) de l'image à l'instant t."""
    rgb = encre.image(t * 7.0, 30.0, grain=False)          # les volutes tournent vite pendant la transition
    alpha = np.zeros((H, W), np.float32)
    if t < CHUTE:                                            # la goutte qui tombe, étirée par la vitesse
        k = t / CHUTE; gy = -60 + (cy + 60) * k * k
        goutte = np.clip(1 - np.hypot((x - cx) / 18, (y - gy) / (18 + 50 * k)), 0, 1) ** 0.5
        alpha = np.maximum(alpha, goutte)
        rgb = rgb * (1 - goutte[..., None]) + TEAL * goutte[..., None]
    else:                                                    # l'éclosion : un front irrégulier qui court jusqu'aux coins
        k = min(1.0, (t - CHUTE) / (COUVERT - CHUTE))
        r = rmax * sortie_ease(k) + 2
        front = r * (1 + 0.16 * bord + 0.05 * np.sin(angle * 7 + t * 4))
        alpha = np.clip((front - dist) / 30, 0, 1)
        alpha = np.maximum(alpha, lisse(np.clip((k - 0.8) / 0.2, 0, 1)))   # couverture totale au moment de la coupe
        liseré = np.clip(1 - np.abs(front - dist - 22) / 26, 0, 1) * np.clip(fils * 0.8 + 0.6, 0, 1) * (k < 1)
        rgb = rgb * (1 - liseré[..., None]) + MIEL * liseré[..., None]
        if t > DILUTION:                                     # la dilution : l'encre s'en va par endroits, des bords vers le centre
            q = lisse(min(1.0, (t - DILUTION) / (DUREE - DILUTION - 0.05)))
            seuil = -2.4 + q * 5.2
            garde = np.clip((dissol * 0.9 - dist / rmax * 1.6 + 0.9 - seuil) / 0.6, 0, 1)
            alpha = alpha * garde
    if NOM <= t <= 1.4:                                      # le nom : apparaît en grandissant, puis s'efface
        a = lisse(np.clip((t - NOM) / 0.2, 0, 1)) * (1 - lisse(np.clip((t - 1.15) / 0.25, 0, 1)))
        s = 0.92 + 0.08 * sortie_ease(np.clip((t - NOM) / 0.5, 0, 1))
        img = Image.fromarray((NOM_IMG * 255).astype(np.uint8)).resize((int(W * s), int(H * s)), Image.LANCZOS)
        cadre = Image.new('RGBA', (W, H)); cadre.paste(img, ((W - img.width) // 2, (H - img.height) // 2))
        n = np.asarray(cadre, dtype=np.float32) / 255
        na = n[..., 3:] * a
        rgb = rgb * (1 - na) + n[..., :3] * na
    return np.clip(rgb, 0, 1), alpha


def son(chemin, sr=48000):
    """Son marqué, synthétisé : goutte (0,15 s), whoosh qui monte, note grave + tintement sur le nom (0,6 s), souffle qui se retire."""
    n = int(DUREE * sr); t = np.arange(n) / sr
    g = np.random.default_rng(1)
    out = np.zeros((n, 2), np.float32)
    def env(t0, att, dec):
        e = np.where(t < t0, 0, np.where(t < t0 + att, (t - t0) / att, np.exp(-(t - t0 - att) / dec)))
        return e.astype(np.float32)
    # Goutte : glissando aigu très court.
    tg = np.clip(t - CHUTE, 0, None)
    goutte = np.sin(2 * np.pi * (1200 * tg - 9000 * tg ** 2)) * env(CHUTE, 0.002, 0.05) * (tg < 0.12)
    out += goutte[:, None] * 0.35
    # Whoosh : bruit filtré dont la brillance monte, du gauche vers le droite.
    bruit = g.normal(size=n).astype(np.float32)
    w = np.zeros(n, np.float32); y1 = 0.0
    coupe = np.clip(0.02 + 0.25 * np.clip((t - 0.1) / 0.7, 0, 1), 0, 1)
    for i in range(n):   # passe-bas à fréquence de coupure variable
        y1 += coupe[i] * (bruit[i] - y1); w[i] = y1
    enveloppe = np.clip((t - 0.1) / 0.55, 0, 1) ** 2 * np.exp(-np.clip(t - 0.75, 0, None) / 0.12)
    pan = np.clip((t - 0.1) / 0.8, 0, 1)
    out[:, 0] += w * enveloppe * (1.2 - pan) * 0.9; out[:, 1] += w * enveloppe * (0.2 + pan) * 0.9
    # Note grave et tintement sur le nom.
    tn = np.clip(t - NOM, 0, None)
    grave = (np.sin(2 * np.pi * 55 * tn) + 0.4 * np.sin(2 * np.pi * 110 * tn)) * env(NOM, 0.01, 0.45)
    tinte = sum(a * np.sin(2 * np.pi * f * tn) for f, a in ((660, 0.5), (990, 0.3), (1320, 0.15))) * env(NOM, 0.004, 0.35)
    out += (grave * 0.55 + tinte * 0.22)[:, None]
    # Souffle qui se retire pendant la dilution.
    retrait = w[::-1] * np.clip((t - 1.0) / 0.3, 0, 1) * np.exp(-np.clip(t - 1.3, 0, None) / 0.25)
    out += (retrait * 0.5)[:, None]
    out = out / max(1e-6, np.abs(out).max()) * 0.85
    with wave.open(chemin, 'wb') as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(sr)
        f.writeframes((out * 32767).astype(np.int16).tobytes())


if '--planche' in sys.argv:   # 8 instants sur un damier (pour voir la transparence)
    damier = ((x // 60 + y // 60) % 2)[..., None] * 0.25 + 0.55
    vignettes = []
    for t in (0.08, 0.3, 0.55, 0.8, 0.95, 1.2, 1.5, 1.8):
        rgb, a = image(t)
        v = damier * (1 - a[..., None]) + rgb * a[..., None]
        vignettes.append(Image.fromarray((v * 255).astype(np.uint8)).resize((480, 270)))
    planche = Image.new('RGB', (1920, 540))
    for k, v in enumerate(vignettes):
        planche.paste(v, ((k % 4) * 480, (k // 4) * 270))
    planche.save(os.path.join(ICI, 'goutte-encre-planche.png'))
    sys.exit(0)

wav = os.path.join(ICI, 'goutte-encre.wav'); son(wav)
ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                       '-i', wav, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '24', '-auto-alt-ref', '0',
                       '-c:a', 'libopus', '-b:a', '160k', '-shortest', os.path.join(ICI, 'goutte-encre.webm')], stdin=subprocess.PIPE)
for f in range(int(DUREE * FPS)):
    rgb, a = image(f / FPS)
    ff.stdin.write((np.dstack([rgb, a]) * 255 + 0.5).astype(np.uint8).tobytes())
ff.stdin.close(); ff.wait()
print('stinger : goutte-encre.webm')
