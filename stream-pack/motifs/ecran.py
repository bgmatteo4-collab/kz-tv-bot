"""La mécanique commune aux écrans en boucle du pack (l'intro de lancement, l'outro de fin) :
motif d'encre très lent, titre en volume qui flotte, logo en haut à gauche, cartes d'info qui se succèdent en bas.

Un écran se décrit par un Ecran(...) puis s'affiche ou se rend :
    e = Ecran(titre=[('MERCI', 150, MIEL, OMBRE_MIEL, 400)], cartes=[...], ...)
    e.rendre(sys.argv, dossier, 'outro.mp4')
"""
import math
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import gaussian_filter

from encre import Encre

ICI = os.path.dirname(os.path.abspath(__file__))
POLICE = os.path.join(ICI, '..', 'da', 'Rubik-3.ttf')
W, H = 1920, 1080
NUIT = np.array([0x0F, 0x15, 0x19], np.float32) / 255
PAPIER, MIEL = (241, 236, 227), (224, 169, 59)
OMBRE_PAPIER, OMBRE_MIEL = (150, 136, 112), (138, 90, 18)

y, x = np.mgrid[0:H, 0:W].astype(np.float32)
lisse = lambda k: k * k * (3 - 2 * k)


# ---------------------------------------------------------------- lettres en volume
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
    pol = ImageFont.truetype(POLICE, taille)
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


class Ecran:
    """Un écran en boucle. `titre` : [(texte, taille, couleur de face, couleur d'épaisseur, y)].
    `cartes` : les chemins des pastilles d'info, dans l'ordre d'apparition."""

    def __init__(self, titre, cartes, graine=7, fps=60, duree=30.0, carte_y=806,
                 voile=(0.62, 820, 0.52, 500)):
        self.fps, self.duree, self.carte_y, self.voile = fps, duree, carte_y, voile
        self.lignes = [(mot(txt, t, f, c), z) for txt, t, f, c, z in titre]
        self.logo = [mot('KAYZX', 64, PAPIER, OMBRE_PAPIER), mot('TV', 64, MIEL, OMBRE_MIEL)]
        self.cartes = [np.asarray(Image.open(c).convert('RGBA'), np.float32) / 255 for c in cartes]
        self.creneau = duree / max(1, len(self.cartes))
        self.encre = Encre(W, H, graine=graine, echelle=0.8, lisser=True)

    def _titre(self, t):
        """Chaque lettre flotte très lentement (5 cycles sur la boucle), un reflet passe toutes les 10 s.
        Renvoie (rgb, alpha, ombre portée) plein écran."""
        toile = Image.new('RGBA', (W, H))
        faces = Image.new('L', (W, H))
        for i, ((lettres, larg, haut), z) in enumerate(self.lignes):
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

    def _logo(self, fond):
        """Le logo KAYZX TV en haut à gauche, posé une fois pour toutes (il ne bouge pas)."""
        (kl, kw, kh), (tl, tw, th) = self.logo
        x0, z = 96, 74
        for dx, img, _ in kl:
            poser(fond, np.asarray(img, np.float32) / 255, (int(x0 + dx), z))
        for dx, img, _ in tl:
            poser(fond, np.asarray(img, np.float32) / 255, (int(x0 + kw + 26 + dx), z))

    def _carte(self, t):
        """La carte d'info du moment. Pas de fondu enchaîné : l'ancienne descend et s'efface, puis la nouvelle
        monte — deux pastilles de largeurs différentes au même endroit feraient une bouillie.
        Le bas est vide au raccord de la boucle."""
        if not self.cartes:
            return None
        k, dans = int(t // self.creneau) % len(self.cartes), t % self.creneau
        if dans < 0.45:                                   # entrée
            e = lisse(dans / 0.45)
            return self.cartes[k], e, (1 - e) * 30
        if dans > self.creneau - 0.45:                    # sortie
            e = lisse((dans - (self.creneau - 0.45)) / 0.45)
            return self.cartes[k], 1 - e, e * 30
        return self.cartes[k], 1.0, 0.0

    def image(self, t, grain=True, k_grain=0):
        force, rx, cy, ry = self.voile
        fond = self.encre.image(t, self.duree, grain=False)
        v = np.exp(-(((x - W / 2) / rx) ** 2 + ((y - H * cy) / ry) ** 2))   # l'encre s'assombrit au centre
        fond = fond * (1 - force * v[..., None]) + NUIT * (force * v[..., None])
        rgb, a, ombre = self._titre(t)
        fond = fond * (1 - ombre[..., None] * 0.9)
        fond = fond * (1 - a[..., None]) + rgb * a[..., None]
        self._logo(fond)
        c = self._carte(t)
        if c is not None:
            img_c, opac, dy = c
            ch, cw = img_c.shape[:2]
            poser(fond, img_c, ((W - cw) // 2, self.carte_y + int(dy)), opac)
        if grain:   # grain léger : plus fort, il part en pâté à l'encodage et c'est lui qu'on voit, pas l'image
            fond = fond + np.random.default_rng(k_grain).normal(0, 0.006, (H, W, 1)).astype(np.float32)
        return np.clip(fond, 0, 1)

    def rendre(self, argv, dossier, nom):
        """--apercu T : une image fixe. --part i/n : une tranche de la boucle, pour occuper tous les cœurs."""
        arg = lambda c, d=None: argv[argv.index(c) + 1] if c in argv else d
        if '--apercu' in argv:
            chemin = os.path.join(dossier, 'apercu.png')
            Image.fromarray((self.image(float(arg('--apercu'))) * 255 + 0.5).astype(np.uint8)).save(chemin)
            return print('image :', chemin)
        total = int(self.duree * self.fps)
        i, n = (int(v) for v in arg('--part', '0/1').split('/'))
        debut, fin = total * i // n, total * (i + 1) // n
        sortie = os.path.join(dossier, nom if n == 1 else f'part-{i}.mp4')
        ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
                               '-s', f'{W}x{H}', '-r', str(self.fps), '-i', '-', '-c:v', 'libx264', '-crf', '18',
                               '-pix_fmt', 'yuv420p', '-movflags', '+faststart', sortie], stdin=subprocess.PIPE)
        for f in range(debut, fin):
            ff.stdin.write((self.image(f / self.fps, k_grain=f) * 255 + 0.5).astype(np.uint8).tobytes())
            if (f - debut) % 60 == 0:
                print(f'part {i} : {f - debut} / {fin - debut}', flush=True)
        ff.stdin.close(); ff.wait()
        print('fait :', sortie)
