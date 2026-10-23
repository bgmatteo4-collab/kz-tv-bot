"""Construit le loft-studio de Kayzx TV dans Blender (v2, après les retours du 23/10 : BRIEF.md).

    blender -b -P stream-pack/blender/piece.py -- --rendu stream-pack/rendus/v2.png [--cam porte] [--echantillons 32] [--largeur 1280]
    blender -b -P stream-pack/blender/piece.py -- --sauver stream-pack/rendus/studio.blend

Repère : x de 0 (mur ouest, bureau) à 8 m (mur est, TV) ; y de 0 (mur sud, porte et affiches) à 6 m
(mur nord : baie vitrée sur toute la longueur, la ville de nuit derrière) ; plafond à 3 m. Version 3 : nuit,
porte, interrupteurs et prises, étagères remplies, affiches, déco (retours du client dans BRIEF.md).
Palette (planche DA) : forest teal #1E5B57, honey gold #E0A93B, mist gray #C9CFD3, chêne, noyer.
"""
import math
import os
import random
import sys

import bpy
from mathutils import Vector

ICI = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(ICI, '..', 'assets')
OBJ = os.path.join(ASSETS, 'objaverse')
TAILLES = {l.split()[1]: l.split()[2] for l in open(os.path.join(ICI, '..', 'assets.txt')) if l.strip() and not l.startswith('#')}
L, P, H = 8.0, 6.0, 3.0

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
opt = {args[i].lstrip('-'): args[i + 1] for i in range(0, len(args) - 1, 2)}
random.seed(7)


def hexa(h, a=1.0):
    h = h.lstrip('#')
    lin = lambda c: (c / 255) / 12.92 if c / 255 <= 0.04045 else ((c / 255 + 0.055) / 1.055) ** 2.4
    return (lin(int(h[0:2], 16)), lin(int(h[2:4], 16)), lin(int(h[4:6], 16)), a)


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = int(opt.get('echantillons', 32))
scene.cycles.use_adaptive_sampling = True
scene.cycles.use_denoising = True
scene.cycles.denoiser = 'OPENIMAGEDENOISE'
scene.cycles.max_bounces = 6
scene.cycles.caustics_reflective = scene.cycles.caustics_refractive = False
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.view_settings.exposure = 0.7   # de nuit, on expose pour l'intérieur
largeur = int(opt.get('largeur', 1280))
scene.render.resolution_x, scene.render.resolution_y = largeur, largeur * 9 // 16


# ------------------------------------------------------------------ matières

def materiau_asset(ident, echelle=1.0):
    with bpy.data.libraries.load(os.path.join(ASSETS, ident, f'{ident}_{TAILLES.get(ident, "2k")}.blend'), link=False) as (src, dst):
        dst.materials = [ident]
    m = dst.materials[0]
    for n in m.node_tree.nodes:
        if n.type == 'MAPPING':
            n.inputs['Scale'].default_value = (echelle,) * 3
    return m


def materiau_uni(nom, couleur, rugosite=0.5, metal=0.0, emission=None, force=0.0, bosse=0.0):
    m = bpy.data.materials.new(nom)
    nt = m.node_tree if m.node_tree else None
    if nt is None:
        m.use_nodes = True
        nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = hexa(couleur)
    b.inputs['Roughness'].default_value = rugosite
    b.inputs['Metallic'].default_value = metal
    if emission:
        b.inputs['Emission Color'].default_value = hexa(emission)
        b.inputs['Emission Strength'].default_value = force
    if bosse:   # grain très fin (peinture, tissu) : la surface n'est jamais parfaitement lisse
        bruit = nt.nodes.new('ShaderNodeTexNoise'); bruit.inputs['Scale'].default_value = 400
        relief = nt.nodes.new('ShaderNodeBump'); relief.inputs['Strength'].default_value = bosse
        nt.links.new(bruit.outputs['Fac'], relief.inputs['Height'])
        nt.links.new(relief.outputs['Normal'], b.inputs['Normal'])
    return m


def tissu(nom, couleur):
    """Tissu mat : couleur unie (pas de dérive de teinte), trame du lin Poly Haven en relief."""
    m = materiau_asset('rough_linen', 4.0).copy()
    m.name = nom
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    for l in list(b.inputs['Base Color'].links):
        nt.links.remove(l)
    b.inputs['Base Color'].default_value = hexa(couleur)
    b.inputs['Roughness'].default_value = 0.9
    return m


M = {
    'parquet': materiau_asset('wood_floor', 1.2),
    'chene': materiau_asset('oak_veneer_01'),
    'noyer': materiau_asset('american_walnut_veneer'),
    'mur': materiau_uni('peinture mist gray', '#D3D7D9', 0.85, bosse=0.03),
    'plafond': materiau_uni('plafond', '#E4E6E7', 0.9, bosse=0.02),
    'teal': materiau_uni('peinture forest teal', '#1E5B57', 0.8, bosse=0.03),
    'canape': tissu('lin mist gray', '#B9BFC3'),
    'tapis': tissu('laine teal', '#2C5F5B'),
    'noir': materiau_uni('noir mat', '#121416', 0.4),
    'alu': materiau_uni('aluminium', '#B8BEC6', 0.3, 1.0),
    'verre': materiau_uni('verre', '#FFFFFF', 0.0),
    'led': materiau_uni('ruban LED', '#E0A93B', emission='#F2C97A', force=6.0),
    'or': materiau_uni('laiton', '#C9A55C', 0.25, 1.0),
}
v = M['verre'].node_tree.nodes['Principled BSDF']
v.inputs['Transmission Weight'].default_value = 1.0
v.inputs['IOR'].default_value = 1.45


# ------------------------------------------------------------------ outils

def boite(nom, centre, taille, mat, biseau=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=centre)
    o = bpy.context.object
    o.name = nom
    o.scale = taille
    bpy.ops.object.transform_apply(scale=True)
    if biseau > 0:
        mod = o.modifiers.new('biseau', 'BEVEL')
        mod.width, mod.segments, mod.limit_method = biseau, 3, 'ANGLE'
        bpy.ops.object.shade_smooth()
    o.data.materials.append(mat)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.uv.cube_project(cube_size=1.0); bpy.ops.object.mode_set(mode='OBJECT')
    return o


def importer_ph(ident, position, rotation_z=0.0, echelle=1.0):
    """Modèle Poly Haven (.blend)."""
    with bpy.data.libraries.load(os.path.join(ASSETS, ident, f'{ident}_{TAILLES.get(ident, "2k")}.blend'), link=False) as (src, dst):
        dst.objects = list(src.objects)
    racine = bpy.data.objects.new(ident, None); scene.collection.objects.link(racine)
    for o in dst.objects:
        if o is None or o.type not in {'MESH', 'EMPTY'}:
            continue
        scene.collection.objects.link(o)
        if o.parent is None:
            o.parent = racine
    racine.location, racine.rotation_euler[2], racine.scale = position, math.radians(rotation_z), (echelle,) * 3
    return racine


def placer(objet, position, taille, axe='max', rotation_z=0.0, rotation_x=0.0, matiere=None, sans=()):
    """Modèle Objaverse (.glb) : mis à la taille réelle (taille en m sur l'axe donné), posé sur sa base,
    centré sur position, tourné de rotation_z degrés. sans : noms de pièces à retirer (socles, sols)."""
    avant = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(OBJ, f'{objet}.glb'))
    nouveaux = [o for o in bpy.data.objects if o not in avant]
    for o in list(nouveaux):
        if any(s.lower() in o.name.lower() for s in sans):
            bpy.data.objects.remove(o); nouveaux.remove(o)
    maillages = [o for o in nouveaux if o.type == 'MESH']
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in maillages for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    d = mx - mn
    ref = {'max': max(d), 'x': d.x, 'y': d.y, 'z': d.z}[axe]
    racine = bpy.data.objects.new(objet, None); scene.collection.objects.link(racine)
    for o in nouveaux:
        if o.parent is None:
            o.parent = racine
            o.location -= Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
        if matiere and o.type == 'MESH':
            o.data.materials.clear(); o.data.materials.append(matiere)
    racine.scale = (taille / ref,) * 3
    racine.rotation_euler = (math.radians(rotation_x), 0, math.radians(rotation_z))
    racine.location = position
    return racine


# ------------------------------------------------------------------ le loft

boite('sol', (L / 2, P / 2, -0.05), (L, P, 0.1), M['parquet'])
boite('plafond', (L / 2, P / 2, H + 0.05), (L, P, 0.1), M['plafond'])
boite('mur sud', (L / 2, -0.05, H / 2), (L, 0.1, H), M['mur'])
boite('mur ouest', (-0.05, P / 2, H / 2), (0.1, P, H), M['mur'])
boite('mur est', (L + 0.05, P / 2, H / 2), (0.1, P, H), M['teal'])
for x in (0.0, L):   # plinthes
    pass
boite('plinthe sud', (L / 2, 0.01, 0.05), (L, 0.02, 0.1), M['chene'])

# Baie vitrée : toute la longueur du mur nord, du sol au plafond, montants noirs fins.
boite('baie vitre', (L / 2, P + 0.02, H / 2), (L, 0.02, H), M['verre'])
for i in range(9):
    boite(f'montant {i}', (i * L / 8, P, H / 2), (0.05, 0.08, H), M['noir'])
for z in (0.02, H - 0.02):
    boite('traverse', (L / 2, P, z), (L, 0.08, 0.05), M['noir'])

# Mur du bureau (ouest) : panneau de lames de noyer derrière le bureau.
for i in range(28):
    boite(f'lame {i}', (0.03, 1.6 + i * 0.1, 1.55), (0.04, 0.05, 2.6), M['noyer'])

# --- Le bureau de stream (contre le mur ouest, le streamer regarde vers l'ouest).
bx, by = 0.55, 3.0
placer('bureau', (bx, by, 0), 0.73, 'z', rotation_z=90, sans=('Object_2',))   # plateau d'origine remplacé par du chêne
boite('plateau chêne', (bx, by, 0.745), (0.8, 1.8, 0.03), M['chene'], 0.004)


def ecran(nom, centre, larg, haut, rot_z, vertical=False):
    l, h = (haut, larg) if vertical else (larg, haut)
    cadre = boite(nom, centre, (0.02, l, h), M['noir'], 0.004)
    dalle = boite(nom + ' dalle', (centre[0] + 0.011, centre[1], centre[2]), (0.002, l - 0.012, h - 0.012),
                  materiau_uni(nom + ' image', '#0B1416', 0.2, emission='#2E6F6A', force=1.4))
    pied = boite(nom + ' pied', (centre[0] - 0.05, centre[1], centre[2] - h / 2 - 0.08), (0.04, 0.05, 0.16), M['alu'])
    for o in (cadre, dalle, pied):
        o.rotation_euler[2] = math.radians(rot_z)
    return cadre


ecran('écran centre', (0.28, 3.0, 1.06), 0.62, 0.36, 0)
ecran('écran gauche', (0.33, 3.68, 1.06), 0.62, 0.36, -18)
ecran('écran vertical', (0.33, 2.36, 1.17), 0.62, 0.36, 18, vertical=True)
placer('clavier', (0.75, 3.0, 0.76), 0.44, 'x', rotation_z=90)
placer('stream_deck', (0.68, 2.6, 0.76), 0.18, 'x', rotation_z=90)
placer('carte_son', (0.55, 3.55, 0.76), 0.18, 'x', rotation_z=90)
placer('micro', (0.7, 3.32, 1.02), 0.19, 'max', rotation_z=200)
placer('webcam', (0.28, 3.0, 1.26), 0.10, 'x', rotation_z=90)
placer('key_light', (0.35, 3.95, 0.76), 0.55, 'z', rotation_z=60)
placer('casque', (0.6, 2.25, 0.76), 0.2, 'max', rotation_z=90)
placer('siege_gaming', (1.35, 3.0, 0), 1.3, 'z', rotation_z=-90)

# --- Étagères des répliques (noyer, LED dessous) de part et d'autre du bureau. Chaque objet est posé
# sur le dessus de sa planche (DESSUS[niveau]) ; répliques et déco alternent pour que rien ne fasse vide.
NIVEAUX = (1.0, 1.45, 1.9)
EP = 0.035
DESSUS = [z + EP / 2 for z in NIVEAUX]
for cote, yc in (('sud', 1.35), ('nord', 5.15)):
    for j, z in enumerate(NIVEAUX):
        boite(f'étagère {cote} {j}', (0.17, yc, z), (0.32, 1.1, EP), M['noyer'], 0.004)
        boite(f'LED {cote} {j}', (0.29, yc, z - EP / 2 - 0.004), (0.01, 1.0, 0.006), M['led'])
        for dy in (-0.45, 0.45):   # équerres noires
            boite('équerre', (0.12, yc + dy, z - 0.06), (0.2, 0.012, 0.1), M['noir'])
# Bloc sud : Avengers et Retour vers le futur.
placer('casque_ironman', (0.17, 1.05, DESSUS[2]), 0.28, 'z', rotation_z=90)
importer_ph('decorative_book_set_01', (0.15, 1.6, DESSUS[2]), rotation_z=90, echelle=0.45)
placer('mjolnir', (0.17, 1.1, DESSUS[1]), 0.4, 'max', rotation_z=90)
importer_ph('ceramic_vase_01', (0.17, 1.68, DESSUS[1]), echelle=0.8)
placer('delorean', (0.17, 1.15, DESSUS[0]), 0.24, 'max', rotation_z=60)
importer_ph('ceramic_vase_02', (0.17, 1.65, DESSUS[0]), echelle=0.55)
# Bloc nord : Rick et Morty, et le gant de l'Infini.
placer('pistolet_portail', (0.17, 4.9, DESSUS[2]), 0.28, 'max', rotation_z=110)
importer_ph('book_encyclopedia_set_01', (0.15, 5.42, DESSUS[2]), rotation_z=90, echelle=0.7)
placer('plumbus', (0.17, 4.85, DESSUS[1]), 0.24, 'z', rotation_z=90)
placer('meeseeks', (0.17, 5.18, DESSUS[1]), 0.18, 'max', rotation_z=80)
importer_ph('brass_vase_01', (0.17, 5.5, DESSUS[1]), echelle=0.7)
placer('gant_infini', (0.17, 4.88, DESSUS[0]), 0.32, 'z', rotation_z=90)
importer_ph('standing_picture_frame_01', (0.17, 5.25, DESSUS[0]), rotation_z=90)
importer_ph('ceramic_vase_03', (0.17, 5.55, DESSUS[0]), echelle=0.8)
# Au mur, au-dessus du bureau et des étagères.
placer('convecteur', (0.04, 1.35, 2.38), 0.42, 'z', rotation_z=90)
placer('bouclier', (0.06, 3.0, 2.25), 0.6, 'max', rotation_z=90)
placer('hoverboard', (0.06, 5.15, 2.4), 0.75, 'max', rotation_z=0, rotation_x=90)
importer_ph('wicker_basket_01', (0.3, 1.35, 0))

# --- Porte (mur sud, x 0,3 → 1,2), interrupteur à côté, prises près de chaque appareil.
boite('porte', (0.75, 0.025, 1.05), (0.9, 0.04, 2.1), M['noyer'], 0.004)
for x in (0.28, 1.22):
    boite('chambranle', (x, 0.03, 1.07), (0.05, 0.06, 2.14), M['chene'])
boite('chambranle haut', (0.75, 0.03, 2.15), (0.99, 0.06, 0.05), M['chene'])
boite('poignée', (1.08, 0.07, 1.0), (0.13, 0.02, 0.02), M['noir'], 0.005)
BLANC = materiau_uni('plastique blanc', '#EDEEEC', 0.35)


def plaque(nom, centre, normale, prise=False):
    """Interrupteur ou prise : plaque blanche de 8,6 cm, posée à plat sur le mur."""
    ep = (0.008, 0.086, 0.086) if normale in ('x+', 'x-') else (0.086, 0.008, 0.086)
    boite(nom, centre, ep, BLANC, 0.003)
    d = {'x+': (0.006, 0, 0), 'x-': (-0.006, 0, 0), 'y+': (0, 0.006, 0), 'y-': (0, -0.006, 0)}[normale]
    c = Vector(centre) + Vector(d)
    if prise:
        for k in (-0.011, 0.011):
            o = (Vector((0, k, 0)) if normale[0] == 'x' else Vector((k, 0, 0)))
            boite(nom + ' trou', c + o, (0.006, 0.006, 0.006), M['noir'])
    else:
        boite(nom + ' bascule', c, tuple(v * 0.6 for v in ep), BLANC, 0.002)


plaque('interrupteur', (1.42, 0.005, 1.1), 'y+')
plaque('prise bureau', (0.005, 2.2, 0.3), 'x+', True)
plaque('prise bureau 2', (0.005, 3.8, 0.3), 'x+', True)
plaque('prise TV', (L - 0.005, 4.1, 0.3), 'x-', True)
plaque('prise lampadaire', (7.0, 0.005, 0.3), 'y+', True)

# --- Les affiches officielles encadrées (mur sud, derrière le canapé).
for k, (nom, x) in enumerate((('endgame', 3.6), ('retour-vers-le-futur', 4.6), ('rick-et-morty', 5.6))):
    boite(f'cadre {nom}', (x, 0.03, 1.65), (0.66, 0.035, 0.96), M['chene'], 0.003)
    img = bpy.data.materials.new(f'affiche {nom}'); img.use_nodes = True
    nt = img.node_tree; b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 0.25
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(os.path.join(ASSETS, 'affiches', f'{nom}.jpg'))
    nt.links.new(tex.outputs['Color'], b.inputs['Base Color'])
    bpy.ops.mesh.primitive_plane_add(size=1, location=(x, 0.05, 1.65), rotation=(math.radians(90), 0, 0))
    a = bpy.context.object; a.name = f'affiche {nom}'; a.scale = (0.6, 0.9, 1); a.data.materials.append(img)

# --- Le salon : canapé d'angle face à la TV, tapis teal, table basse, fauteuil.
placer('canape', (5.2, 2.9, 0), 3.4, 'max', rotation_z=-90, matiere=M['canape'])
boite('tapis', (6.0, 3.0, 0.006), (3.2, 3.6, 0.012), M['tapis'])
importer_ph('coffee_table_round_01', (6.2, 3.0, 0), echelle=0.8)
importer_ph('wooden_bowl_01', (6.05, 2.85, 0.37))
importer_ph('ceramic_vase_02', (6.35, 3.15, 0.37), echelle=0.6)
coussins = importer_ph('throw_pillows_01', (4.6, 2.2, 0.45), rotation_z=90)
for k, o in enumerate(o for o in coussins.children_recursive if o.type == 'MESH'):   # aux couleurs de la DA
    o.data.materials.clear(); o.data.materials.append(tissu('coussin', ('#1E5B57', '#E0A93B', '#8E979D')[k % 3]))
importer_ph('mid_century_lounge_chair', (6.7, 5.0, 0), rotation_z=-140)

# --- Coin TV (mur est, teal) : grande TV 85", meuble à lames, consoles.
importer_ph('modern_wooden_cabinet', (L - 0.3, 3.0, 0), rotation_z=90, echelle=1.25)
placer('tv', (L - 0.06, 3.0, 1.0), 1.9, 'max', rotation_z=-90, sans=('Table',))
placer('ps5', (L - 0.3, 2.05, 0.62), 0.39, 'z', rotation_z=-90, sans=('Plane', 'Digital'))
placer('xbox', (L - 0.3, 3.95, 0.62), 0.30, 'z', rotation_z=-90)
placer('switch', (L - 0.3, 3.55, 0.62), 0.32, 'x', rotation_z=-90)

# --- Plantes, luminaires.
placer('plante', (7.5, 5.5, 0), 1.25, 'z', rotation_z=30)
placer('plante', (0.45, 5.6, 0), 1.1, 'z', rotation_z=-20)
importer_ph('potted_plant_02', (4.0, 0.4, 0))
placer('lampadaire', (7.4, 0.6, 0), 1.6, 'z')
for y in (2.6, 3.4):
    importer_ph('modern_ceiling_lamp_01', (6.2, y, H))


# ------------------------------------------------------------------ la ville au couchant (derrière la baie)

def ville():
    """Le loft est en hauteur (~35 m) : la ville s'étend en contrebas jusqu'à l'horizon, en plans successifs.
    Fenêtres en grille (texture brique : une brique = une fenêtre d'étage), allumées au hasard (~22 %)."""
    m = bpy.data.materials.new('façades')
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = 0.6
    coord = nt.nodes.new('ShaderNodeTexCoord')
    brique = nt.nodes.new('ShaderNodeTexBrick')
    brique.inputs['Scale'].default_value = 1.0
    brique.inputs['Brick Width'].default_value = 1.6
    brique.inputs['Row Height'].default_value = 3.2
    brique.inputs['Mortar Size'].default_value = 0.35
    brique.inputs['Color1'].default_value = (1, 1, 1, 1); brique.inputs['Color2'].default_value = (0, 0, 0, 1)
    brique.inputs['Mortar'].default_value = (0, 0, 0, 1)
    brique.offset = 0.0
    nt.links.new(coord.outputs['Object'], brique.inputs['Vector'])
    # La sortie Fac donne une valeur au hasard par brique : on n'allume qu'une fenêtre sur cinq environ.
    seuil = nt.nodes.new('ShaderNodeMath'); seuil.operation = 'GREATER_THAN'; seuil.inputs[1].default_value = 0.62   # de nuit, une fenêtre sur trois est allumée
    nt.links.new(brique.outputs['Color'], seuil.inputs[0])   # valeur au hasard par fenêtre
    vitre = nt.nodes.new('ShaderNodeMath'); vitre.operation = 'MULTIPLY'
    nt.links.new(seuil.outputs['Value'], vitre.inputs[0]); nt.links.new(brique.outputs['Fac'], vitre.inputs[1])   # sans le joint
    vitre2 = nt.nodes.new('ShaderNodeMath'); vitre2.operation = 'MULTIPLY'; vitre2.inputs[1].default_value = 7.0
    nt.links.new(vitre.outputs['Value'], vitre2.inputs[0]); vitre = vitre2
    nt.links.new(vitre.outputs['Value'], b.inputs['Emission Strength'])
    b.inputs['Emission Color'].default_value = hexa('#FFC870')
    b.inputs['Emission Strength'].default_value = 0.0
    melange = nt.nodes.new('ShaderNodeMix'); melange.data_type = 'RGBA'
    melange.inputs['A'].default_value = hexa('#2A2F3A'); melange.inputs['B'].default_value = hexa('#12151B')
    nt.links.new(brique.outputs['Fac'], melange.inputs['Factor'])
    nt.links.new(melange.outputs['Result'], b.inputs['Base Color'])
    BAS = -35.0
    for k in range(220):
        dist = random.uniform(70, 900)
        x = L / 2 + random.uniform(-1.1, 1.1) * dist
        hauteur = random.uniform(12, 45) + (random.random() < 0.12) * random.uniform(40, 110)
        larg = random.uniform(14, 34)
        boite(f'immeuble {k}', (x, P + dist, BAS + hauteur / 2), (larg, random.uniform(14, 30), hauteur), m)
    boite('sol extérieur', (L / 2, P + 600, BAS - 0.1), (3000, 1300, 0.2), materiau_uni('sol ville', '#23262D', 0.9))
ville()
# Feux rouges clignotants sur les plus hautes tours (balisage aérien).
BALISE = materiau_uni('balise', '#FF2A1A', emission='#FF2A1A', force=40.0)
for o in [o for o in scene.objects if o.name.startswith('immeuble')]:
    if o.dimensions.z > 70:
        boite('balise', (o.location.x, o.location.y, o.location.z + o.dimensions.z / 2 + 0.6), (0.8, 0.8, 0.8), BALISE)

# Ciel de nuit : bleu profond en haut, plus clair et un peu chaud à l'horizon (la ville éclaire le ciel).
monde = bpy.data.worlds.new('nuit'); scene.world = monde
monde.use_nodes = True
nt = monde.node_tree
coord = nt.nodes.new('ShaderNodeTexCoord')
sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(coord.outputs['Generated'], sep.inputs['Vector'])
rampe = nt.nodes.new('ShaderNodeValToRGB')
e = rampe.color_ramp.elements
e[0].position, e[0].color = 0.5, hexa('#3A2F45')      # horizon : halo de la ville
e[1].position, e[1].color = 0.62, hexa('#0A1630')     # nuit
e.new(0.85).color = hexa('#03070F')
nt.links.new(sep.outputs['Z'], rampe.inputs['Fac'])
nt.links.new(rampe.outputs['Color'], nt.nodes['Background'].inputs['Color'])
nt.nodes['Background'].inputs['Strength'].default_value = 1.0


def lumiere(nom, type_, position, energie, couleur, taille=0.3, rotation=(0, 0, 0), cone=None):
    d = bpy.data.lights.new(nom, type_); d.energy = energie; d.color = hexa(couleur)[:3]
    if type_ == 'AREA':
        d.size = taille
    else:
        d.shadow_soft_size = taille
    if cone:
        d.spot_size, d.spot_blend = math.radians(cone), 0.6
    o = bpy.data.objects.new(nom, d); o.location = position
    o.visible_camera = o.visible_glossy = False   # la lumière éclaire, sans apparaître à l'image
    o.rotation_euler = [math.radians(a) for a in rotation]; scene.collection.objects.link(o)


# Éclairage de nuit : seulement les lampes de la pièce (2 700 K), plus la lueur froide des écrans.
lumiere('suspension', 'POINT', (6.2, 2.6, 2.25), 55, '#FFC27A', 0.08)
lumiere('suspension 2', 'POINT', (6.2, 3.4, 2.25), 55, '#FFC27A', 0.08)
lumiere('lampadaire', 'POINT', (7.4, 0.6, 1.45), 120, '#FFB866', 0.12)
for x, y in ((2.2, 1.5), (2.2, 4.5), (4.4, 1.2), (4.4, 4.8), (7.2, 1.5), (7.2, 4.5)):   # spots encastrés, doux
    lumiere('spot', 'SPOT', (x, y, H - 0.02), 45, '#FFD29A', 0.05, (0, 0, 0), cone=70)
lumiere('écrans', 'AREA', (0.45, 3.0, 1.1), 18, '#8FB8D8', 0.8, (0, -90, 0))
lumiere('key light', 'AREA', (0.45, 3.95, 1.35), 25, '#FFF1DC', 0.3, (0, -70, 25))
lumiere('TV (reflet)', 'AREA', (L - 0.2, 3.0, 1.3), 10, '#6E8FB8', 1.5, (0, 90, 0))


# ------------------------------------------------------------------ caméras d'aperçu

def camera(nom, position, cible, focale=24):
    c = bpy.data.objects.new(nom, bpy.data.cameras.new(nom)); scene.collection.objects.link(c)
    c.data.lens = focale
    c.location = position
    c.rotation_euler = (Vector(cible) - Vector(position)).to_track_quat('-Z', 'Y').to_euler()
    return c


CAMS = {
    'porte': camera('porte', (1.2, 0.5, 1.6), (5.0, 4.4, 1.0), 22),
    'salon': camera('salon', (3.2, 1.0, 1.4), (L, 3.6, 1.0), 26),
    'bureau': camera('bureau', (2.6, 3.0, 1.45), (0.2, 3.0, 1.2), 30),
    'baie': camera('baie', (6.5, 1.2, 1.5), (3.0, 6.0, 1.3), 24),
    'etageres': camera('etageres', (1.6, 3.3, 1.55), (0.15, 1.35, 1.4), 32),
}
scene.camera = CAMS[opt.get('cam', 'porte')]

if 'rendu' in opt:
    scene.render.filepath = os.path.abspath(opt['rendu'])
    bpy.ops.render.render(write_still=True)
if 'sauver' in opt:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(opt['sauver']))
