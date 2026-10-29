"""Transition (stinger) « la goutte d'encre », 3,9 s : une goutte teal tombe, éclot en volutes qui couvrent l'écran
(c'est là qu'OBS change de scène), KAYZX TV arrive lettre par lettre en volume et tient le temps d'être lu,
puis l'encre se retire vers le centre en se déchirant, comme l'éclaboussure du début jouée à l'envers.
Son marqué : goutte, whoosh, note grave et tintement sur le nom, souffle qui se retire.
    python3 goutte_encre.py [--planche 1]  → goutte-encre.webm (VP9 + transparence, son Opus)
Dans OBS : Transition « Stinger », ce fichier, point de transition 950 ms."""
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

FPS, DUREE, W, H = 30, 3.9, 1920, 1080
PAPIER = np.array([0xF1, 0xEC, 0xE3], np.float32) / 255
CHUTE, COUVERT, NOM, RETRAIT = 0.15, 0.95, 0.65, 2.3   # repères (s)
# Le nom reste lisible de 0,95 s (écran couvert) à 2,2 s, puis l'encre se retire comme elle est venue.
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

# Le nom en volume : chaque lettre a une face (papier ou miel) et une épaisseur ombrée en dessous à droite.
police = ImageFont.truetype(os.path.join(ICI, '..', 'da', 'Rubik-3.ttf'), 210)
PROF = 16   # épaisseur de l'extrusion (px)


def lettre(ch, face, cote):
    """Renvoie (image complète RGBA, face seule RGBA) d'une lettre extrudée."""
    l, t, r, b = police.getbbox(ch)
    w, h = r - l + PROF + 8, b - t + PROF + 8
    tout = Image.new('RGBA', (w, h)); dt = ImageDraw.Draw(tout)
    for i in range(PROF, 0, -1):
        k = i / PROF   # le côté s'assombrit vers l'arrière
        c = tuple(int(v * (1 - 0.35 * k)) for v in cote) + (255,)
        dt.text((-l + i * 0.55, -t + i), ch, font=police, fill=c)
    seule = Image.new('RGBA', (w, h)); ImageDraw.Draw(seule).text((-l, -t), ch, font=police, fill=face + (255,))
    tout.alpha_composite(seule)
    return tout, seule


LETTRES = []
x_courant = 0
for ch, face, cote in [(c, (241, 236, 227), (150, 136, 112)) for c in 'KAYZX'] + [(' ', None, None)] + \
        [(c, (224, 169, 59), (138, 90, 18)) for c in 'TV']:
    if ch == ' ':
        x_courant += police.getlength(' '); continue
    tout, seule = lettre(ch, face, cote)
    LETTRES.append((x_courant + police.getbbox(ch)[0], tout, seule))
    x_courant += police.getlength(ch)
LARGEUR_NOM = x_courant
HAUT_NOM = police.getbbox('KAYZX')[3] - police.getbbox('KAYZX')[1]


def dos(k):
    """Dépassement puis retour : la lettre monte un peu trop haut, puis se pose. C'est ce qui donne du poids."""
    c = 1.9
    return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2


def poser_lettre(img, masque, angle, echelle, opac):
    """Incline, redimensionne et estompe une lettre autour de son centre ; renvoie (image, masque, décalage)."""
    if angle:
        img = img.rotate(angle, resample=Image.BICUBIC, expand=True)
        masque = masque.rotate(angle, resample=Image.BICUBIC, expand=True)
    if echelle != 1.0:
        n = (max(1, round(img.width * echelle)), max(1, round(img.height * echelle)))
        img, masque = img.resize(n, Image.BICUBIC), masque.resize(n, Image.BICUBIC)
    if opac < 1.0:
        img = img.copy(); img.putalpha(Image.eval(img.getchannel('A'), lambda v: int(v * opac)))
        masque = Image.eval(masque, lambda v: int(v * opac))
    return img, masque


def nom(t):
    """Le mot à l'instant t : chaque lettre arrive en tournant, dépasse puis se pose ; le mot respire ensuite
    très légèrement, et un reflet balaie les faces. Renvoie (rgb, alpha, ombre) plein écran."""
    toile = Image.new('RGBA', (W, H))
    faces = Image.new('L', (W, H))
    x0, y0 = (W - LARGEUR_NOM) / 2, (H - HAUT_NOM) / 2 - 10
    for i, (dx, tout, seule) in enumerate(LETTRES):
        p = float(np.clip((t - NOM - i * 0.055) / 0.46, 0, 1))
        if p <= 0:
            continue
        e = dos(p)
        # une fois posée, la lettre respire : un souffle d'un pixel, décalé d'une lettre à l'autre
        souffle = math.sin((t - NOM) * 1.6 + i * 0.7) * 1.1 * p
        monte = (1 - e) * 54 + souffle
        img, masque = poser_lettre(tout, seule.getchannel('A'), (1 - e) * -9, 0.84 + 0.16 * e,
                                   min(1.0, p / 0.3))
        pos = (int(x0 + dx + (tout.width - img.width) / 2),
               int(y0 + monte + (tout.height - img.height) / 2))
        toile.alpha_composite(img, pos)
        faces.paste(masque, pos, masque)
    s = 1.0 + 0.05 * lisse(np.clip((t - NOM) / 1.5, 0, 1))      # le mot avance doucement vers nous
    if s != 1.0:
        w2, h2 = int(W * s), int(H * s)
        def zoomer(im):
            g = im.resize((w2, h2), Image.BICUBIC)
            return g.crop(((w2 - W) // 2, (h2 - H) // 2, (w2 - W) // 2 + W, (h2 - H) // 2 + H))
        toile, faces = zoomer(toile), zoomer(faces)
    n = np.asarray(toile, dtype=np.float32) / 255
    f = np.asarray(faces, dtype=np.float32) / 255
    xs = W * (0.2 + 0.72 * np.clip((t - NOM - 0.3) / 0.9, 0, 1))   # un reflet de lumière balaie les faces
    reflet = np.exp(-((x - xs + (y - H / 2) * 0.4) / 70) ** 2) * f * 0.45
    rgb = n[..., :3] + reflet[..., None]
    ombre = gaussian_filter(np.roll(np.roll(n[..., 3], 18, 0), 10, 1), 10) * 0.45   # ombre portée douce
    return np.clip(rgb, 0, 1), n[..., 3], ombre


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
        if t > RETRAIT:   # le retrait : le même front irrégulier, mais qui court vers le centre en se déchirant
            q = lisse(min(1.0, (t - RETRAIT) / (DUREE - RETRAIT - 0.04)))
            rr = rmax * (1 - q) * 1.06   # retrait régulier : sortie_ease s'effondrait d'un coup au début
            front_r = rr * (1 + 0.20 * bord + 0.06 * np.sin(angle * 5 - t * 3))
            dechire = np.clip((front_r - dist) / 40 + dissol * 0.3, 0, 1)   # le bord part en îlots, pas en cercle net
            alpha = np.minimum(alpha, dechire)
            lis_r = np.clip(1 - np.abs(front_r - dist - 14) / 24, 0, 1) * np.clip(fils * 0.8 + 0.6, 0, 1) * (q < 0.96)
            rgb = rgb * (1 - lis_r[..., None]) + MIEL * lis_r[..., None]
    if NOM <= t <= 2.6:                                      # le nom en volume : il tient le temps d'être lu, puis s'efface
        disp = 1 - lisse(np.clip((t - 2.2) / 0.4, 0, 1))
        nrgb, na, ombre = nom(t)
        rgb = rgb * (1 - ombre[..., None] * disp)
        na = (na * disp)[..., None]
        rgb = rgb * (1 - na) + nrgb * na
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
    retrait = w[::-1] * np.clip((t - RETRAIT) / 0.4, 0, 1) * np.exp(-np.clip(t - RETRAIT - 0.4, 0, None) / 0.45)
    out += (retrait * 0.5)[:, None]
    out = out / max(1e-6, np.abs(out).max()) * 0.85
    with wave.open(chemin, 'wb') as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(sr)
        f.writeframes((out * 32767).astype(np.int16).tobytes())


if '--planche' in sys.argv:   # 8 instants sur un damier (pour voir la transparence)
    damier = ((x // 60 + y // 60) % 2)[..., None] * 0.25 + 0.55
    vignettes = []
    for t in (0.72, 0.80, 0.88, 0.98, 1.10, 1.30, 1.9, 2.3):
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
