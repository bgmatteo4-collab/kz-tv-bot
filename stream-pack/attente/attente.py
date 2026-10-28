"""L'intro de lancement : une boucle de 60 s sans couture.
  0 → 30 s   l'écran « LE LIVE VA DÉMARRER / INSTALLE-TOI », six cartes d'info qui se succèdent
  32 → 57 s  la séquence navigateur (YouTube → recherche Google → Twitch), images rendues par frames-nav.js
  57 → 60 s  retour au titre, qui raccorde sur l'image 0
    node frames-nav.js <dossier>      les images de la séquence (une seule fois, ou après modification)
    python3 attente.py --nav <dossier> [--part i/n] [--apercu T]
Dans OBS : Source média, Boucle cochée, en fond de la scène « Démarrage ».
"""
import math
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import gaussian_filter

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ICI, '..', 'motifs'))
from encre import Encre   # noqa: E402

FPS, DUREE, W, H = 30, 60.0, 1920, 1080
NAV0, NAV1 = 32.0, 57.0      # la séquence navigateur occupe ce créneau
TITRE0, TITRE1 = 30.0, 57.0  # le titre sort à 30 s et revient à 57 s
CARTES_FIN = 30.0            # les cartes ne passent que sur la première moitié
NUIT = np.array([0x0F, 0x15, 0x19], np.float32) / 255
PAPIER, MIEL = (241, 236, 227), (224, 169, 59)
OMBRE_PAPIER, OMBRE_MIEL = (150, 136, 112), (138, 90, 18)

y, x = np.mgrid[0:H, 0:W].astype(np.float32)
lisse = lambda k: k * k * (3 - 2 * k)


# ---------------------------------------------------------------- lettres en volume
def police(taille):
    return ImageFont.truetype(os.path.join(ICI, '..', 'da', 'Rubik-3.ttf'), taille)


def lettre(ch, pol, face, cote, prof, papier):
    """Une lettre : contour papier (sticker), extrusion ombrée vers le bas-droite, puis la face.
    Toutes les lettres d'une ligne partagent la même ligne de base (sinon l'accent et le trait d'union décrochent).
    Renvoie (image RGBA, masque de la face) ; la face sert au reflet qui balaie le titre."""
    asc, desc = pol.getmetrics()
    l = pol.getbbox(ch)[0]
    m = papier + prof + 6
    w, h = pol.getbbox(ch)[2] - l + m * 2, asc + desc + prof + m * 2
    ox, oy = -l + m, m
    img = Image.new('RGBA', (w, h)); d = ImageDraw.Draw(img)
    if papier:   # le contour papier épouse la silhouette, extrusion comprise
        for i in (0, prof):
            d.text((ox + i * 0.55, oy + i), ch, font=pol, fill=PAPIER + (255,),
                   stroke_width=papier, stroke_fill=PAPIER + (255,))
    for i in range(prof, 0, -1):
        k = i / prof
        d.text((ox + i * 0.55, oy + i), ch, font=pol, fill=tuple(int(v * (1 - 0.4 * k)) for v in cote) + (255,))
    seule = Image.new('RGBA', (w, h))
    ImageDraw.Draw(seule).text((ox, oy), ch, font=pol, fill=face + (255,))
    img.alpha_composite(seule)
    return img, seule.getchannel('A')


def mot(texte, taille, face, cote, prof=None, papier=None, serre=0.0):
    """Prépare les lettres d'un mot : [(dx, image, masque de face)], plus la largeur et la hauteur."""
    pol = police(taille)
    prof = prof if prof is not None else max(4, round(taille * 0.075))
    papier = papier if papier is not None else max(3, round(taille * 0.05))
    out, cx = [], 0.0
    for ch in texte:
        if ch == ' ':
            cx += pol.getlength(' ') * (1 + serre); continue
        img, masque = lettre(ch, pol, face, cote, prof, papier)
        out.append((cx + pol.getbbox(ch)[0], img, masque))
        cx += pol.getlength(ch) * (1 + serre)
    return out, cx, pol.getmetrics()[0]


TITRE = [
    ('LE LIVE VA DÉMARRER', 80, PAPIER, OMBRE_PAPIER, 388),
    ('INSTALLE-TOI', 150, MIEL, OMBRE_MIEL, 542),
]
LIGNES = [(mot(txt, t, f, c), z) for txt, t, f, c, z in TITRE]
LOGO = [mot('KAYZX', 64, PAPIER, OMBRE_PAPIER), mot('TV', 64, MIEL, OMBRE_MIEL)]
CARTES = [np.asarray(Image.open(os.path.join(ICI, f'carte-{k}.png')).convert('RGBA'), np.float32) / 255
          for k in range(1, 7)]
CRENEAU = CARTES_FIN / len(CARTES)   # 5 s par info


def poser(fond, calque, box=None, force=1.0):
    """Compose un RGBA (float 0-1) sur le fond, sur place. Sans box, le calque couvre toute l'image."""
    if box is None:
        a = calque[..., 3:] * force
        fond[:] = fond * (1 - a) + calque[..., :3] * a
        return fond
    cx, cy = box
    ch, cw = calque.shape[:2]
    x0, y0 = max(0, cx), max(0, cy)
    x1, y1 = min(W, cx + cw), min(H, cy + ch)
    if x0 >= x1 or y0 >= y1:
        return fond
    part = calque[y0 - cy:y1 - cy, x0 - cx:x1 - cx]
    a = part[..., 3:] * force
    fond[y0:y1, x0:x1] = fond[y0:y1, x0:x1] * (1 - a) + part[..., :3] * a
    return fond


def titre(t):
    """Le titre : chaque lettre flotte très lentement (5 cycles sur la boucle), un reflet passe toutes les 10 s.
    Renvoie (rgb, alpha, ombre portée) plein écran."""
    toile = Image.new('RGBA', (W, H))
    faces = Image.new('L', (W, H))
    for i, ((lettres, larg, haut), z) in enumerate(LIGNES):
        x0 = (W - larg) / 2
        for j, (dx, img, masque) in enumerate(lettres):
            flot = math.sin(2 * math.pi * (t / 6.0) + (i * 3 + j) * 0.5) * 4.0
            pos = (int(x0 + dx), int(z + flot))
            toile.alpha_composite(img, pos)
            faces.paste(masque, pos, masque)
    n = np.asarray(toile, np.float32) / 255
    f = np.asarray(faces, np.float32) / 255
    k = (t % 10.0) / 10.0                      # 3 passages du reflet sur la boucle : raccord net
    xs = -300 + (W + 600) * lisse(min(1.0, k / 0.45))
    reflet = np.exp(-((x - xs + (y - H / 2) * 0.35) / 90) ** 2) * f * 0.5
    ombre = gaussian_filter(np.roll(np.roll(n[..., 3], 20, 0), 11, 1), 12) * 0.5
    return np.clip(n[..., :3] + reflet[..., None], 0, 1), n[..., 3], ombre


def logo(fond, force=1.0):
    """Le logo KAYZX TV en haut à gauche, posé une fois pour toutes (il ne bouge pas)."""
    (kl, kw, kh), (tl, tw, th) = LOGO
    x0, z = 96, 74
    for dx, img, _ in kl:
        poser(fond, np.asarray(img, np.float32) / 255, (int(x0 + dx), z), force)
    for dx, img, _ in tl:
        poser(fond, np.asarray(img, np.float32) / 255, (int(x0 + kw + 26 + dx), z), force)
    return fond


def carte(t):
    """La carte d'info du moment, seulement pendant la première phase. Pas de fondu enchaîné : l'ancienne descend
    et s'efface, puis la nouvelle monte — deux pastilles de largeurs différentes au même endroit feraient une bouillie.
    Renvoie None quand aucune carte n'est à l'écran (dont le raccord de la boucle, où le bas doit être vide)."""
    if t >= CARTES_FIN:
        return None
    k, dans = int(t // CRENEAU), t % CRENEAU
    if dans < 0.45:                                   # entrée
        e = lisse(dans / 0.45)
        return CARTES[k], e, (1 - e) * 30
    if dans > CRENEAU - 0.45:                         # sortie
        e = lisse((dans - (CRENEAU - 0.45)) / 0.45)
        return CARTES[k], 1 - e, e * 30
    return CARTES[k], 1.0, 0.0


def presence_titre(t):
    """1 quand le titre est à l'écran, 0 pendant la séquence navigateur, avec les deux fondus."""
    if t < TITRE0:
        return 1.0
    if t < NAV0:
        return 1.0 - lisse((t - TITRE0) / (NAV0 - TITRE0))
    if t < TITRE1:
        return 0.0
    return lisse(min(1.0, (t - TITRE1) / 1.2))


def fenetre(t):
    """L'image de la séquence navigateur à l'instant t, ou None hors du créneau."""
    if NAV_DOSSIER is None or not (NAV0 <= t < NAV1):
        return None
    f = int(round((t - NAV0) * FPS))
    chemin = os.path.join(NAV_DOSSIER, f'{min(f, NAV_N - 1):04d}.png')
    return np.asarray(Image.open(chemin).convert('RGBA'), np.float32) / 255


def image(t, grain=True, k_grain=0):
    fond = Encre_motif.image(t, DUREE, grain=False)
    voile = np.exp(-(((x - W / 2) / 820) ** 2 + ((y - H * 0.52) / 500) ** 2))   # l'encre s'assombrit au centre
    fond = fond * (1 - 0.62 * voile[..., None]) + NUIT * (0.62 * voile[..., None])
    vu = presence_titre(t)
    if vu > 0:
        rgb, a, ombre = titre(t)
        a = a * vu
        fond = fond * (1 - ombre[..., None] * 0.9 * vu)
        fond = fond * (1 - a[..., None]) + rgb * a[..., None]
        logo(fond, vu)
        c = carte(t)
        if c is not None:
            img_c, opac, dy = c
            ch, cw = img_c.shape[:2]
            poser(fond, img_c, ((W - cw) // 2, 806 + int(dy)), opac * vu)
    fen = fenetre(t)
    if fen is not None:
        poser(fond, fen)
    if grain:
        g = np.random.default_rng(k_grain).normal(0, 0.012, (H, W, 1)).astype(np.float32)
        fond = fond + g
    return np.clip(fond, 0, 1)


Encre_motif = Encre(W, H, graine=7, echelle=0.8)


def arg(nom, defaut=None):
    return sys.argv[sys.argv.index(nom) + 1] if nom in sys.argv else defaut


NAV_DOSSIER = arg('--nav')
NAV_N = len(os.listdir(NAV_DOSSIER)) if NAV_DOSSIER else 0

if __name__ == '__main__':
    if '--apercu' in sys.argv:
        t = float(arg('--apercu'))
        Image.fromarray((image(t) * 255 + 0.5).astype(np.uint8)).save(os.path.join(ICI, 'apercu.png'))
        print('image :', os.path.join(ICI, 'apercu.png'))
        sys.exit(0)
    # --part i/n : ce processus ne rend qu'une tranche de la boucle, pour occuper tous les cœurs.
    total = int(DUREE * FPS)
    i, n = (int(v) for v in arg('--part', '0/1').split('/'))
    debut, fin = total * i // n, total * (i + 1) // n
    sortie = os.path.join(ICI, 'attente.mp4' if n == 1 else f'part-{i}.mp4')
    ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
                           '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-crf', '18',
                           '-pix_fmt', 'yuv420p', '-movflags', '+faststart', sortie], stdin=subprocess.PIPE)
    for f in range(debut, fin):
        ff.stdin.write((image(f / FPS, k_grain=f) * 255 + 0.5).astype(np.uint8).tobytes())
        if (f - debut) % 60 == 0:
            print(f'part {i} : {f - debut} / {fin - debut}', flush=True)
    ff.stdin.close(); ff.wait()
    print('fait :', sortie)
