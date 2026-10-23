"""Construit le loft-studio de Kayzx TV dans Blender (v2, après les retours du 23/10 : BRIEF.md).

    blender -b -P stream-pack/blender/piece.py -- --rendu stream-pack/rendus/v2.png [--cam porte] [--echantillons 32] [--largeur 1280]
    blender -b -P stream-pack/blender/piece.py -- --sauver stream-pack/rendus/studio.blend

Repère : x de 0 (mur ouest, bureau) à 8 m (mur est, TV) ; y de 0 (mur sud, porte et affiches) à 6 m
(mur nord : baie vitrée sur toute la longueur, la ville au couchant derrière) ; plafond à 3 m.
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
largeur = int(opt.get('largeur', 1280))
scene.render.resolution_x, scene.render.resolution_y = largeur, largeur * 9 // 16


# ------------------------------------------------------------------ matières

def materiau_asset(ident, echelle=1.0):
    with bpy.data.libraries.load(os.path.join(ASSETS, ident, f'{ident}_2k.blend'), link=False) as (src, dst):
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
    with bpy.data.libraries.load(os.path.join(ASSETS, ident, f'{ident}_2k.blend'), link=False) as (src, dst):
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
placer('bureau', (bx, by, 0), 1.8, 'x', rotation_z=90, sans=())
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

# --- Étagères des répliques (noyer, LED dessous) de part et d'autre du bureau.
for cote, y0 in (('sud', 0.8), ('nord', 4.6)):
    for j, z in enumerate((1.0, 1.45, 1.9)):
        boite(f'étagère {cote} {j}', (0.17, y0 + 0.5, z), (0.32, 1.1, 0.035), M['noyer'], 0.004)
        boite(f'LED {cote} {j}', (0.29, y0 + 0.5, z - 0.022), (0.01, 1.0, 0.006), M['led'])
placer('casque_ironman', (0.17, 1.1, 1.92), 0.28, 'z', rotation_z=90)
placer('mjolnir', (0.17, 1.5, 1.47), 0.42, 'max', rotation_z=90)
placer('delorean', (0.17, 1.3, 1.02), 0.24, 'max', rotation_z=60)
placer('pistolet_portail', (0.17, 4.85, 1.92), 0.28, 'max', rotation_z=110)
placer('meeseeks', (0.17, 5.35, 1.92), 0.2, 'max', rotation_z=80)
placer('plumbus', (0.17, 5.0, 1.47), 0.25, 'z', rotation_z=90)
placer('gant_infini', (0.17, 4.85, 1.02), 0.35, 'z', rotation_z=90)
placer('convecteur', (0.04, 1.3, 2.35), 0.42, 'z', rotation_z=90)
placer('bouclier', (0.06, 3.0, 2.2), 0.6, 'max', rotation_z=90)
placer('hoverboard', (0.06, 5.2, 2.45), 0.75, 'max', rotation_z=0, rotation_x=90)

# --- Le salon : canapé d'angle face à la TV, tapis teal, table basse, fauteuil.
placer('canape', (5.2, 2.9, 0), 3.4, 'max', rotation_z=-90, matiere=M['canape'])
boite('tapis', (6.0, 3.0, 0.006), (3.2, 3.6, 0.012), M['tapis'])
importer_ph('coffee_table_round_01', (6.2, 3.0, 0))
importer_ph('mid_century_lounge_chair', (6.7, 5.0, 0), rotation_z=-140)

# --- Coin TV (mur est, teal) : grande TV 85", meuble à lames, consoles.
importer_ph('modern_wooden_cabinet', (L - 0.3, 3.0, 0), rotation_z=90, echelle=1.25)
placer('tv', (L - 0.06, 3.0, 0.9), 1.9, 'max', rotation_z=-90, sans=('stand', 'base'))
placer('ps5', (L - 0.3, 2.05, 0.62), 0.39, 'z', rotation_z=-90, sans=('plane', 'floor', 'ground'))
placer('xbox', (L - 0.3, 3.95, 0.62), 0.30, 'z', rotation_z=-90)
placer('switch', (L - 0.3, 3.55, 0.62), 0.32, 'x', rotation_z=-90)

# --- Plantes, luminaires.
placer('plante', (7.5, 5.5, 0), 1.25, 'z', rotation_z=30)
placer('plante', (0.45, 5.6, 0), 1.1, 'z', rotation_z=-20)
importer_ph('potted_plant_02', (4.0, 0.4, 0))
placer('lampadaire', (7.4, 0.6, 0), 1.6, 'z')
placer('suspension', (6.2, 3.0, H - 1.0), 1.2, 'x', rotation_z=90)


# ------------------------------------------------------------------ la ville au couchant (derrière la baie)

def ville():
    """Immeubles en plans successifs (de 15 m à 400 m), fenêtres éclairées par un bruit de Voronoï."""
    m = bpy.data.materials.new('façades')
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = hexa('#3A3F4A')
    b.inputs['Roughness'].default_value = 0.7
    coord = nt.nodes.new('ShaderNodeTexCoord')
    vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.feature = 'F1'; vor.inputs['Scale'].default_value = 1.3
    rampe = nt.nodes.new('ShaderNodeValToRGB'); rampe.color_ramp.elements[0].position = 0.82
    rampe.color_ramp.elements[0].color = (0, 0, 0, 1); rampe.color_ramp.elements[1].position = 0.83
    rampe.color_ramp.elements[1].color = hexa('#F2C97A')
    nt.links.new(coord.outputs['Object'], vor.inputs['Vector'])
    nt.links.new(vor.outputs['Color'], rampe.inputs['Fac'])
    nt.links.new(rampe.outputs['Color'], b.inputs['Emission Color'])
    b.inputs['Emission Strength'].default_value = 2.0
    for k in range(140):
        dist = random.uniform(18, 420)
        x = random.uniform(-dist * 0.9, dist * 0.9) + L / 2
        hauteur = random.uniform(8, 30) * (1 + dist / 260)
        larg = random.uniform(8, 22)
        o = boite(f'immeuble {k}', (x, P + dist, hauteur / 2 - 6), (larg, random.uniform(8, 20), hauteur), m)
    sol = boite('sol extérieur', (L / 2, P + 300, -6.1), (1400, 600, 0.2), materiau_uni('sol ville', '#2A2E36', 0.9))


ville()

monde = bpy.data.worlds.new('ciel'); scene.world = monde
nt = monde.node_tree if monde.node_tree else None
if nt is None:
    monde.use_nodes = True; nt = monde.node_tree
ciel = nt.nodes.new('ShaderNodeTexSky')
ciel.sky_type = 'MULTIPLE_SCATTERING' if hasattr(ciel, 'sky_type') and 'MULTIPLE_SCATTERING' in [i.identifier for i in ciel.bl_rna.properties['sky_type'].enum_items] else ciel.sky_type
ciel.sun_elevation = math.radians(4)
ciel.sun_rotation = math.radians(15)
nt.links.new(ciel.outputs['Color'], nt.nodes['Background'].inputs['Color'])
nt.nodes['Background'].inputs['Strength'].default_value = 0.35

# Soleil bas et doré qui entre en biais par la baie.
soleil = bpy.data.lights.new('soleil', 'SUN'); soleil.energy = 4.5; soleil.color = hexa('#FFB866')[:3]; soleil.angle = math.radians(1.5)
o = bpy.data.objects.new('soleil', soleil); scene.collection.objects.link(o)
o.rotation_euler = (math.radians(84), 0, math.radians(165))


def lumiere(nom, type_, position, energie, couleur, taille=0.3, rotation=(0, 0, 0)):
    d = bpy.data.lights.new(nom, type_); d.energy = energie; d.color = hexa(couleur)[:3]
    if type_ == 'AREA':
        d.size = taille
    else:
        d.shadow_soft_size = taille
    o = bpy.data.objects.new(nom, d); o.location = position
    o.rotation_euler = [math.radians(a) for a in rotation]; scene.collection.objects.link(o)


lumiere('baie (ciel)', 'AREA', (L / 2, P - 0.2, 1.6), 900, '#FFD9A8', 6.0, (90, 0, 0))
lumiere('suspension', 'POINT', (6.2, 3.0, 1.95), 60, '#F2C97A', 0.1)
lumiere('lampadaire', 'POINT', (7.4, 0.6, 1.5), 90, '#F2C97A', 0.15)
lumiere('écrans', 'AREA', (0.45, 3.0, 1.1), 20, '#9FC4D8', 0.8, (0, -90, 0))
lumiere('rebond plafond', 'AREA', (4.0, 3.0, H - 0.05), 160, '#F6E3C0', 4.0)


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
}
scene.camera = CAMS[opt.get('cam', 'porte')]

if 'rendu' in opt:
    scene.render.filepath = os.path.abspath(opt['rendu'])
    bpy.ops.render.render(write_still=True)
if 'sauver' in opt:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(opt['sauver']))
