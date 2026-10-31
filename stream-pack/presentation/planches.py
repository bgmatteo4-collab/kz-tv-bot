"""Les planches de présentation : rassemblent des éléments du pack en une image, pour les montrer.
    python3 planches.py   → logos.png, panneaux-twitch.png
Les aperçus d'écran (intro, outro) ne sont pas ici : ils se régénèrent avec
    python3 attente/attente.py --apercu 7      et      python3 outro/outro.py --apercu 3
"""
import os

from PIL import Image, ImageDraw

ICI = os.path.dirname(os.path.abspath(__file__))
PACK = os.path.join(ICI, '..')
NUIT = (11, 17, 20)


def logos():
    """Les trois fonds de logo, recadrés en rond comme Twitch le fait."""
    pl = Image.new('RGB', (3 * 420 + 40, 440), NUIT)
    masque = Image.new('L', (400, 400), 0)
    ImageDraw.Draw(masque).ellipse((0, 0, 399, 399), fill=255)
    for i, k in enumerate(('encre', 'nuit', 'teal')):
        im = Image.open(os.path.join(PACK, 'logo', f'logo-{k}.png')).resize((400, 400))
        pl.paste(im, (10 + i * 420, 20), masque)
    pl.save(os.path.join(ICI, 'logos.png'))


def panneaux():
    """Les sept panneaux Twitch : les cinq petits en colonne, les deux grands à côté."""
    noms = ('discord', 'youtube', 'tiktok', 'x', 'planning', 'regles', 'badges')
    ims = [Image.open(os.path.join(PACK, 'panneaux', f'panneau-{k}.png')).convert('RGBA') for k in noms]
    colonne, W = ims[:5], 680
    haut = sum(i.height for i in colonne) + 18 * (len(colonne) - 1)
    pl = Image.new('RGBA', (W * 3 + 40, max(haut, ims[5].height, ims[6].height) + 40), NUIT + (255,))
    y = 20
    for i in colonne:
        pl.alpha_composite(i, (20, y)); y += i.height + 18
    pl.alpha_composite(ims[5], (W + 20, 20))
    pl.alpha_composite(ims[6], (W * 2 + 20, 20))
    pl.convert('RGB').resize((pl.width // 2, pl.height // 2)).save(os.path.join(ICI, 'panneaux-twitch.png'))


logos()
panneaux()
print('planches :', ICI)
