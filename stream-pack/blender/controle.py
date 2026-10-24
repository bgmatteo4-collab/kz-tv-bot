"""Contrôle de cohérence de la pièce : objets qui se traversent, objets qui flottent ou s'enfoncent.
    blender -b -P stream-pack/blender/piece.py -- --controle 1   (appelé à la fin de piece.py)"""
import itertools
import bpy
from mathutils import Vector

IGNORER = ('sol', 'plafond', 'mur ', 'plinthe', 'baie', 'montant', 'traverse', 'lame', 'immeuble', 'balise', 'tapis', 'sol extérieur',
           'balcon', 'façade', 'applique', 'découpe')


def groupes(scene):
    """Un objet = une racine (import) ou un objet sans parent ; boîte englobante monde de ses maillages."""
    res = {}
    for o in scene.objects:
        if o.type != 'MESH':
            continue
        r = o
        while r.parent:
            r = r.parent
        if r.name.startswith(IGNORER):
            continue
        pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
        mn = Vector([min(p[i] for p in pts) for i in range(3)]); mx = Vector([max(p[i] for p in pts) for i in range(3)])
        if r.name in res:
            a, b = res[r.name]; res[r.name] = (Vector(map(min, a, mn)), Vector(map(max, b, mx)))
        else:
            res[r.name] = (mn, mx)
    return res


def controler(scene, tol=0.012):
    g = groupes(scene)
    print('CONTROLE', len(g), 'objets')
    for (na, (a0, a1)), (nb, (b0, b1)) in itertools.combinations(g.items(), 2):
        ov = [min(a1[i], b1[i]) - max(a0[i], b0[i]) for i in range(3)]
        if all(v > tol for v in ov):
            vol = ov[0] * ov[1] * ov[2]
            print(f'CHEVAUCHE {na!r} × {nb!r} : {ov[0]:.2f} × {ov[1]:.2f} × {ov[2]:.2f} m')
    for n, (a, b) in g.items():   # hors de la pièce
        if a.x < -0.01 or a.y < -5.01 or b.x > 8.01 or b.y > 6.01 or b.z > 3.01:
            print(f'MUR {n!r} : {a.x:.2f}..{b.x:.2f} / {a.y:.2f}..{b.y:.2f} / {a.z:.2f}..{b.z:.2f}')


MURAL = ('affiche', 'cadre', 'fond ', 'prise', 'interrupteur', 'porte', 'poignée', 'chambranle', 'tv', 'bouclier', 'convecteur',
         'hoverboard', 'étagère', 'LED', 'équerre', 'modern_ceiling', 'abat-jour', 'lampe tige', 'bras micro', 'tige micro', 'micro',
         'pince', 'casque', 'crochet', 'traverse bureau', 'poutre', 'plateau', 'écran', 'caméra', 'trépied', 'colonne', 'témoin',
         'key_light', 'mât', 'souris', 'PC lame', 'cannelure', 'meuble TV', 'serre-livres', 'souris fente')


def flottants(scene, tol=0.015):
    """Objets dont le dessous n'est posé sur rien (ni le sol, ni un autre objet juste en dessous)."""
    g = groupes(scene)
    for n, (a, b) in g.items():
        if a.z < tol or n.startswith(MURAL):
            continue
        appui = [m for m, (c, d) in g.items() if m != n and abs(d.z - a.z) < tol
                 and min(b.x, d.x) > max(a.x, c.x) and min(b.y, d.y) > max(a.y, c.y)]
        if not appui:
            print(f'FLOTTE {n!r} : dessous à {a.z:.3f} m')
