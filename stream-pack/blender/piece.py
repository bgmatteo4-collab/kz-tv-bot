"""Construit le studio-salon de Kayzx TV dans Blender (plan : stream-pack/plan/plan-piece.png).

    blender -b -P stream-pack/blender/piece.py -- --rendu stream-pack/rendus/test.png [--echantillons 64] [--largeur 1280]

Repère : x de 0 (mur ouest, étagères) à 6 m (mur est, TV) ; y de 0 (mur sud, porte et affiches)
à 4,6 m (mur nord, bureau et fenêtre) ; z vers le haut, plafond à 2,7 m.
Palette (planche DA) : forest teal #1E5B57, honey gold #E0A93B, mist gray #C9CFD3, chêne, noyer.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

ICI = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(ICI, '..', 'assets')
L, P, H = 6.0, 4.6, 2.7

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
opt = {args[i].lstrip('-'): args[i + 1] for i in range(0, len(args) - 1, 2)}


def hexa(h, a=1.0):
    h = h.lstrip('#')
    lin = lambda c: (c / 255) / 12.92 if c / 255 <= 0.04045 else ((c / 255 + 0.055) / 1.055) ** 2.4
    return (lin(int(h[0:2], 16)), lin(int(h[2:4], 16)), lin(int(h[4:6], 16)), a)


# ------------------------------------------------------------------ scène vide

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = int(opt.get('echantillons', 64))
scene.cycles.use_adaptive_sampling = True
scene.cycles.use_denoising = True
scene.cycles.denoiser = 'OPENIMAGEDENOISE'
scene.cycles.max_bounces = 6
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
largeur = int(opt.get('largeur', 1280))
scene.render.resolution_x, scene.render.resolution_y = largeur, largeur * 9 // 16
scene.render.film_transparent = False


# ------------------------------------------------------------------ matières

def materiau_asset(ident, echelle=1.0):
    """Matière Poly Haven (placage, parquet, lin…) chargée depuis son .blend, avec une échelle de motif."""
    chemin = os.path.join(ASSETS, ident, f'{ident}_2k.blend')
    with bpy.data.libraries.load(chemin, link=False) as (src, dst):
        dst.materials = [ident]
    m = dst.materials[0]
    if echelle != 1.0:
        for n in m.node_tree.nodes:
            if n.type == 'MAPPING':
                n.inputs['Scale'].default_value = (echelle, echelle, echelle)
    return m


def materiau_uni(nom, couleur, rugosite=0.5, metal=0.0, emission=None, force=0.0):
    m = bpy.data.materials.new(nom)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = hexa(couleur)
    b.inputs['Roughness'].default_value = rugosite
    b.inputs['Metallic'].default_value = metal
    if emission:
        b.inputs['Emission Color'].default_value = hexa(emission)
        b.inputs['Emission Strength'].default_value = force
    return m


def teinter(m, couleur, melange=0.75):
    """Teinte une matière à texture (le lin passe en mist gray, en gardant sa trame)."""
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    lien = b.inputs['Base Color'].links[0] if b.inputs['Base Color'].links else None
    mix = nt.nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = melange
    mix.inputs['B'].default_value = hexa(couleur)
    if lien:
        nt.links.new(lien.from_socket, mix.inputs['A'])
    nt.links.new(mix.outputs['Result'], b.inputs['Base Color'])
    return m


M = {
    'parquet': materiau_asset('wood_floor', 1.6),
    'chene': materiau_asset('oak_veneer_01'),
    'noyer': materiau_asset('american_walnut_veneer'),
    'lin': teinter(materiau_asset('rough_linen', 3.0), '#C9CFD3', 0.9),
    'mur': teinter(materiau_asset('grey_plaster', 0.6), '#C9CFD3', 0.85),
    'teal': teinter(materiau_asset('grey_plaster', 0.6).copy(), '#1E5B57', 1.0),
    'noir': materiau_uni('noir mat', '#111315', 0.45),
    'alu': materiau_uni('aluminium', '#B8BEC6', 0.32, 1.0),
    'ecran': materiau_uni('écran', '#05080A', 0.15, emission='#1E5B57', force=0.0),
    'led': materiau_uni('ruban LED', '#E0A93B', emission='#F2C97A', force=8.0),
    'verre': materiau_uni('vitre', '#DDE7EE', 0.05),
}
M['teal'].name = 'enduit teal'


# ------------------------------------------------------------------ outils de modélisation

def boite(nom, centre, taille, mat, biseau=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=centre)
    o = bpy.context.object
    o.name = nom
    o.scale = taille
    bpy.ops.object.transform_apply(scale=True)
    if biseau > 0:
        mod = o.modifiers.new('biseau', 'BEVEL')
        mod.width, mod.segments, mod.limit_method = biseau, 4, 'ANGLE'
        o.modifiers.new('lisse', 'WEIGHTED_NORMAL')
        bpy.ops.object.shade_smooth()
    o.data.materials.append(mat)
    # Coordonnées de texture par projection en boîte, à l'échelle réelle (1 unité = 1 m).
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.uv.cube_project(cube_size=1.0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return o


def importer(ident, position, rotation_z=0.0, echelle=1.0):
    """Importe tous les objets d'un modèle Poly Haven et les pose (origine au sol)."""
    chemin = os.path.join(ASSETS, ident, f'{ident}_2k.blend')
    with bpy.data.libraries.load(chemin, link=False) as (src, dst):
        dst.objects = [n for n in src.objects]
    racine = bpy.data.objects.new(ident, None)
    scene.collection.objects.link(racine)
    for o in dst.objects:
        if o is None or o.type not in {'MESH', 'EMPTY', 'LIGHT'}:
            continue
        scene.collection.objects.link(o)
        if o.parent is None:
            o.parent = racine
    racine.location = position
    racine.rotation_euler[2] = math.radians(rotation_z)
    racine.scale = (echelle,) * 3
    return racine


# ------------------------------------------------------------------ la pièce

boite('sol', (L / 2, P / 2, -0.05), (L, P, 0.1), M['parquet'])
boite('plafond', (L / 2, P / 2, H + 0.05), (L, P, 0.1), M['mur'])
boite('mur sud', (L / 2, -0.05, H / 2), (L, 0.1, H), M['mur'])
boite('mur ouest', (-0.05, P / 2, H / 2), (0.1, P, H), M['mur'])
boite('mur est', (L + 0.05, P / 2, H / 2), (0.1, P, H), M['teal'])
# Mur nord percé d'une fenêtre (x 4,2 → 5,8 ; z 0,9 → 2,3).
boite('mur nord g', (2.1, P + 0.05, H / 2), (4.2, 0.1, H), M['mur'])
boite('mur nord d', (5.9, P + 0.05, H / 2), (0.2, 0.1, H), M['mur'])
boite('allège', (5.0, P + 0.05, 0.45), (1.6, 0.1, 0.9), M['mur'])
boite('linteau', (5.0, P + 0.05, 2.5), (1.6, 0.1, 0.4), M['mur'])
boite('vitre', (5.0, P + 0.08, 1.6), (1.6, 0.02, 1.4), M['verre'])
boite('plinthes', (L / 2, 0.01, 0.05), (L, 0.02, 0.1), M['chene'])

# Salon : meuble TV à lames (Poly Haven) sous une grande TV fine, sur le mur teal.
importer('modern_wooden_cabinet', (L - 0.28, 2.3, 0), rotation_z=90)
boite('TV cadre', (L - 0.04, 2.3, 1.35), (0.04, 1.68, 0.96), M['noir'], 0.008)
boite('TV dalle', (L - 0.065, 2.3, 1.35), (0.005, 1.64, 0.92), M['ecran'])

# Canapé moderne en lin mist gray (fait main : assise, dossier, accoudoirs, pieds en chêne).
cx, cy = 3.35, 2.3
boite('canapé assise', (cx, cy, 0.30), (0.95, 2.2, 0.22), M['lin'], 0.05)
boite('canapé coussins', (cx + 0.05, cy, 0.47), (0.8, 2.0, 0.14), M['lin'], 0.06)
boite('canapé dossier', (cx - 0.38, cy, 0.66), (0.2, 2.2, 0.55), M['lin'], 0.07)
boite('canapé accoudoir n', (cx, cy + 1.03, 0.5), (0.95, 0.16, 0.42), M['lin'], 0.06)
boite('canapé accoudoir s', (cx, cy - 1.03, 0.5), (0.95, 0.16, 0.42), M['lin'], 0.06)
for dx in (-0.4, 0.4):
    for dy in (-1.0, 1.0):
        boite('pied', (cx + dx, cy + dy, 0.09), (0.05, 0.05, 0.18), M['chene'], 0.01)
boite('tapis', (4.2, 2.3, 0.006), (2.4, 3.0, 0.012), materiau_uni('tapis', '#8E979D', 0.95))
importer('coffee_table_round_01', (4.45, 2.3, 0))
importer('mid_century_lounge_chair', (4.6, 3.75, 0), rotation_z=-130)

# Bureau de stream (mur nord) : plateau chêne, piètement noir ; écrans posés plus tard.
boite('bureau plateau', (1.65, P - 0.42, 0.74), (1.9, 0.8, 0.04), M['chene'], 0.004)
for x in (0.75, 2.55):
    boite('bureau pied', (x, P - 0.42, 0.36), (0.06, 0.7, 0.72), M['noir'], 0.005)

# Étagères en noyer sur le mur ouest, avec ruban LED caché dessous.
for i, z in enumerate((0.9, 1.35, 1.8)):
    boite(f'étagère {i}', (0.16, 2.3, z), (0.3, 2.4, 0.035), M['noyer'], 0.004)
    boite(f'LED {i}', (0.26, 2.3, z - 0.022), (0.01, 2.3, 0.006), M['led'])
importer('decorative_book_set_01', (0.16, 1.5, 1.82), rotation_z=90)

# Plantes et luminaires.
importer('potted_plant_02', (5.7, 4.25, 0))
importer('potted_plant_04', (0.35, 0.35, 0))
importer('side_table_01', (3.3, 0.95, 0))
importer('modern_ceiling_lamp_01', (4.4, 2.3, H))

# ------------------------------------------------------------------ lumière

monde = bpy.data.worlds.new('monde')
scene.world = monde
monde.use_nodes = True
nt = monde.node_tree
env = nt.nodes.new('ShaderNodeTexEnvironment')
env.image = bpy.data.images.load(os.path.join(ASSETS, 'small_empty_room_3', 'small_empty_room_3_2k.exr'))
nt.links.new(env.outputs['Color'], nt.nodes['Background'].inputs['Color'])
nt.nodes['Background'].inputs['Strength'].default_value = 0.25


def lumiere(nom, type_, position, energie, couleur, taille=0.5, rotation=(0, 0, 0)):
    d = bpy.data.lights.new(nom, type_)
    d.energy = energie
    d.color = hexa(couleur)[:3]
    if type_ == 'AREA':
        d.size = taille
    else:
        d.shadow_soft_size = taille
    o = bpy.data.objects.new(nom, d)
    o.location = position
    o.rotation_euler = [math.radians(a) for a in rotation]
    scene.collection.objects.link(o)
    return o


lumiere('fenêtre', 'AREA', (5.0, P + 0.3, 1.6), 260, '#DCE8F5', 1.5, (90, 0, 0))            # contre-jour froid
lumiere('suspension', 'POINT', (4.4, 2.3, 2.05), 90, '#F2C97A', 0.12)                         # 2 700 K
lumiere('lampadaire', 'POINT', (5.55, 0.6, 1.6), 140, '#F2C97A', 0.2)
lumiere('écrans', 'AREA', (1.65, P - 0.75, 1.1), 35, '#9FC4D8', 1.2, (-70, 0, 0))
lumiere('débouché', 'AREA', (3.0, 2.3, H - 0.05), 120, '#F6E3C0', 2.5)                         # rebond du plafond

# ------------------------------------------------------------------ caméra de test (coin de la porte)

cam = bpy.data.objects.new('caméra', bpy.data.cameras.new('caméra'))
scene.collection.objects.link(cam)
scene.camera = cam
cam.data.lens = 24
cam.location = (0.55, 0.35, 1.55)
direction = Vector((4.6, 3.4, 1.0)) - cam.location
cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()

if 'rendu' in opt:
    scene.render.filepath = os.path.abspath(opt['rendu'])
    bpy.ops.render.render(write_still=True)
if 'sauver' in opt:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(opt['sauver']))
