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
    m.displacement_method = 'BUMP'   # pas de vrai déplacement : il soulevait plateaux et cadres de quelques mm
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
        o.constraints.clear(); o.animation_data_clear()   # portes du meuble TV : rail non importé
        if o.parent is None:
            o.parent = racine
    racine.location, racine.rotation_euler[2], racine.scale = position, math.radians(rotation_z), (echelle,) * 3
    return racine


def placer(objet, position, taille, axe='max', rotation_z=0.0, rotation_x=0.0, matiere=None, sans=(), pre=(0, 0, 0)):
    """Modèle Objaverse (.glb) : mis à la taille réelle (taille en m sur l'axe donné), posé sur sa base,
    centré sur position, tourné de rotation_z degrés. sans : noms de pièces à retirer (socles, sols).
    pre : rotation (degrés) appliquée au modèle avant la mesure, pour redresser un modèle penché."""
    avant = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(OBJ, f'{objet}.glb'))
    nouveaux = [o for o in bpy.data.objects if o not in avant]
    scene.frame_set(1)
    for o in nouveaux:   # certains modèles sont animés (pièces du micro) : on fige la pose de la 1re image
        if o.animation_data:
            pose = o.matrix_basis.copy(); o.animation_data_clear(); o.matrix_basis = pose
    for o in list(nouveaux):
        if any(s.lower() in o.name.lower() for s in sans):
            bpy.data.objects.remove(o); nouveaux.remove(o)
    maillages = [o for o in nouveaux if o.type == 'MESH']
    interne = bpy.data.objects.new(objet + ' (redressé)', None); scene.collection.objects.link(interne)
    interne.rotation_euler = [math.radians(a) for a in pre]
    for o in nouveaux:
        if o.parent is None:
            o.parent = interne
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in maillages for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    d = mx - mn
    ref = {'max': max(d), 'x': d.x, 'y': d.y, 'z': d.z}[axe]
    racine = bpy.data.objects.new(objet, None); scene.collection.objects.link(racine)
    interne.parent = racine
    interne.location = -Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
    for o in nouveaux:
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

# Mur du bureau (ouest) : mur acoustique en lames de noyer, centré sur le bureau (y 1,75 → 4,25) ;
# les étagères sont de part et d'autre, à 15 cm des lames.
for i in range(26):
    boite(f'lame {i}', (0.03, 1.75 + i * 0.1, 1.55), (0.04, 0.05, 2.6), M['noyer'])


def tube(nom, a, b, r, mat):
    """Cylindre d'un point à un autre (bras de micro, pieds)."""
    a, b = Vector(a), Vector(b)
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=(b - a).length, location=(a + b) / 2, vertices=20)
    o = bpy.context.object; o.name = nom
    o.rotation_euler = (b - a).to_track_quat('Z', 'Y').to_euler()
    o.data.materials.append(mat); bpy.ops.object.shade_smooth()
    return o


# --- Le bureau de stream, contre le mur acoustique : le streamer regarde vers l'ouest (-x).
# Plateau chêne 1,80 × 0,80 (x 0,05 → 0,85, y 2,10 → 3,90), dessus à 76,5 cm, piètement noir en T.
DX0, DX1, DY0, DY1 = 0.05, 0.85, 2.1, 3.9
BUREAU = 0.765
boite('plateau chêne', ((DX0 + DX1) / 2, 3.0, BUREAU - 0.015), (DX1 - DX0, DY1 - DY0, 0.03), M['chene'], 0.004)
for y in (DY0 + 0.12, DY1 - 0.12):
    boite('pied bureau', (0.45, y, (BUREAU - 0.03) / 2), (0.07, 0.07, BUREAU - 0.03), M['noir'], 0.004)
    boite('patin bureau', (0.45, y, 0.015), (0.7, 0.07, 0.03), M['noir'], 0.004)
    boite('traverse bureau', (0.45, y, BUREAU - 0.05), (0.66, 0.05, 0.04), M['noir'])
boite('poutre bureau', (0.3, 3.0, BUREAU - 0.06), (0.05, DY1 - DY0 - 0.3, 0.05), M['noir'])


def image_ecran(nom, fichier, force=1.0):
    """Écran allumé : l'image (ecrans/*.png) en émission, sous une dalle un peu brillante."""
    m = bpy.data.materials.new('écran ' + nom); nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.005, 0.005, 0.006, 1); b.inputs['Roughness'].default_value = 0.18
    chemin = os.path.join(ICI, '..', 'ecrans', fichier)
    if os.path.exists(chemin):
        tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(chemin)
        nt.links.new(tex.outputs['Color'], b.inputs['Emission Color'])
    else:
        b.inputs['Emission Color'].default_value = hexa('#2E6F6A')
    b.inputs['Emission Strength'].default_value = force
    return m


def moniteur(nom, centre, theta, larg, haut, image, pied='rect'):
    """Moniteur sur pied posé sur le plateau : dalle face à +x (repère local), tourné de theta degrés."""
    piv = bpy.data.objects.new(nom, None); scene.collection.objects.link(piv)
    zb = BUREAU - centre[2]   # le plateau, en repère local
    morceaux = [
        boite(nom + ' cadre', (0, 0, 0), (0.02, larg, haut), M['noir'], 0.003),
        boite(nom + ' dos', (-0.03, 0, -0.01), (0.045, larg * 0.55, haut * 0.55), M['noir'], 0.012),
        boite(nom + ' bras', (-0.075, 0, (zb + 0.0) / 2), (0.025, 0.07, -zb), M['alu' if pied != 'rond' else 'noir'], 0.006),
    ]
    if pied == 'rect':     # socle plat rectangulaire
        morceaux.append(boite(nom + ' socle', (-0.04, 0, zb + 0.005), (0.2, 0.24, 0.01), M['alu'], 0.004))
    elif pied == 'v':      # pied en V, deux branches fines
        for sgn in (-1, 1):
            br = boite(nom + ' branche', (-0.02, sgn * 0.09, zb + 0.006), (0.24, 0.025, 0.012), M['alu'], 0.004)
            br.rotation_euler[2] = math.radians(sgn * 35); morceaux.append(br)
    else:                  # disque noir
        bpy.ops.mesh.primitive_cylinder_add(radius=0.11, depth=0.012, location=(-0.075, 0, zb + 0.006), vertices=48)
        o = bpy.context.object; o.data.materials.append(M['noir']); bpy.ops.object.shade_smooth(); morceaux.append(o)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0.0105, 0, 0), rotation=(math.radians(90), 0, math.radians(90)))
    d = bpy.context.object; d.name = nom + ' dalle'; d.scale = (larg - 0.012, haut - 0.012, 1); d.data.materials.append(image)
    for o in morceaux + [d]:
        o.parent = piv
    piv.location, piv.rotation_euler[2] = centre, math.radians(theta)
    return piv


# Trois écrans de 27" (0,60 × 0,34) : centre (OBS), à droite incliné (bureau Windows), à gauche vertical
# (Discord). Bas des dalles à 15 cm du plateau ; les écrans latéraux se referment de 25° vers le streamer.
EW, EH, BAS = 0.60, 0.34, BUREAU + 0.15
moniteur('écran centre', (0.27, 3.0, BAS + EH / 2), 0, EW, EH, image_ecran('obs', 'obs.png', 1.2), pied='v')
a = math.radians(25)
moniteur('écran droit', (0.27 + EW / 2 * math.sin(a), 3.0 + EW / 2 + 0.012 + EW / 2 * math.cos(a), BAS + EH / 2), -25, EW, EH,
         image_ecran('bureau', 'bureau.png', 1.1), pied='rond')
moniteur('écran vertical', (0.27 + EH / 2 * math.sin(a), 3.0 - EW / 2 - 0.012 - EH / 2 * math.cos(a), BAS + EW / 2), 25, EH, EW,
         image_ecran('discord', 'discord.png', 1.1))

# Sur le plateau : tapis de bureau, clavier, souris, Stream Deck XL, carte son, une petite plante.
FEUTRE = materiau_uni('tapis de bureau', '#2A2E33', 0.95)
boite('tapis de bureau', (0.63, 3.05, BUREAU + 0.002), (0.34, 0.95, 0.004), FEUTRE)
placer('clavier', (0.62, 2.96, BUREAU + 0.004), 0.36, 'max', rotation_z=90, sans=('wire', 'usb'))


def souris(x, y, z):
    """Souris ergonomique : coque bombée plus haute à l'arrière, fente entre les boutons, molette."""
    import bmesh
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=32, ring_count=16, location=(x, y, z))
    o = bpy.context.object; o.name = 'souris'
    bm = bmesh.new(); bm.from_mesh(o.data)
    for v in bm.verts:
        v.co.z = max(v.co.z, -0.15)                        # dessous à plat
        arriere = (v.co.x + 1) / 2                         # +x : la paume (côté streamer)
        v.co.z *= 0.55 + 0.45 * arriere
        v.co.y *= 0.85 + 0.15 * arriere
        v.co.z += 0.15
    bm.to_mesh(o.data); bm.free()
    o.scale = (0.063, 0.034, 0.03); o.data.materials.append(materiau_uni('souris', '#1E2023', 0.38))
    bpy.ops.object.shade_smooth()
    boite('souris fente', (x - 0.03, y, z + 0.0235), (0.04, 0.0015, 0.004), M['noir'])
    bpy.ops.mesh.primitive_cylinder_add(radius=0.0055, depth=0.006, location=(x - 0.032, y, z + 0.0235), rotation=(math.radians(90), 0, 0))
    bpy.context.object.data.materials.append(M['or']); bpy.ops.object.shade_smooth()


souris(0.64, 3.36, BUREAU + 0.004)
placer('stream_deck', (0.68, 2.45, BUREAU), 0.18, 'max', rotation_z=90)
placer('carte_son', (0.66, 3.73, BUREAU), 0.18, 'max', rotation_z=0)
importer_ph('potted_plant_04', (0.14, 2.2, BUREAU), echelle=0.9)

# Casque suspendu à un crochet sous le plateau, sur le côté droit du bureau.
boite('crochet casque', (0.66, DY1 + 0.012, BUREAU - 0.06), (0.03, 0.025, 0.05), M['noir'], 0.003)
placer('casque', (0.66, DY1 + 0.04, BUREAU - 0.07 - 0.2), 0.2, 'max', rotation_z=0)

# La caméra du live (hybride sur mini-trépied) posée sur le bureau, à gauche, visée sur le siège.
CX, CY, CZ = 0.46, 2.27, BUREAU + 0.29
vise = math.atan2(3.0 - CY, 1.4 - CX)
for k in range(3):   # trépied
    ang = vise + math.radians(180 + (k - 1) * 120)
    tube('trépied', (CX, CY, CZ - 0.12), (CX + 0.12 * math.cos(ang), CY + 0.12 * math.sin(ang), BUREAU), 0.006, M['noir'])
tube('colonne', (CX, CY, CZ - 0.12), (CX, CY, CZ - 0.045), 0.009, M['noir'])
cam = bpy.data.objects.new('caméra du live', None); scene.collection.objects.link(cam)
corps = [boite('boîtier', (0, 0, 0), (0.07, 0.115, 0.066), M['noir'], 0.006),
         boite('poignée', (0.012, -0.045, -0.002), (0.045, 0.028, 0.064), materiau_uni('grip', '#2A2B2E', 0.8), 0.006),
         boite('écran caméra', (-0.037, 0.005, 0.002), (0.004, 0.07, 0.048), image_ecran('cam', 'obs.png', 0.6))]
for r, l, x0 in ((0.033, 0.03, 0.05), (0.03, 0.035, 0.083), (0.031, 0.004, 0.102)):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=l, location=(x0, 0.008, 0), rotation=(0, math.radians(90), 0), vertices=40)
    o = bpy.context.object; o.data.materials.append(M['noir'] if x0 < 0.1 else materiau_uni('lentille', '#05070A', 0.05)); bpy.ops.object.shade_smooth(); corps.append(o)
for o in corps:
    o.parent = cam
cam.location, cam.rotation_euler = (CX, CY, CZ), (0, math.radians(-4), vise)
boite('témoin REC', (CX + 0.03, CY - 0.03 * math.tan(vise), CZ + 0.034), (0.006, 0.006, 0.003), materiau_uni('REC', '#FF3B30', emission='#FF3B30', force=8.0))

# Micro sur bras articulé : pince à l'arrière du plateau, deux segments, le SM7B devant la bouche.
pince = Vector((0.1, 3.62, BUREAU))
coude = Vector((0.16, 3.55, BUREAU + 0.6))     # le bras passe au-dessus de l'écran droit
bout = Vector((0.8, 3.4, BUREAU + 0.5))      # à droite du clavier, devant la bouche
boite('pince micro', (pince.x, pince.y, BUREAU + 0.02), (0.05, 0.05, 0.06), M['noir'], 0.004)
tube('bras micro 1', pince + Vector((0, 0, 0.04)), coude, 0.011, M['noir'])
tube('bras micro 2', coude, bout, 0.011, M['noir'])
tube('tige micro', bout, bout - Vector((0, 0, 0.05)), 0.008, M['noir'])
placer('micro', (bout.x, bout.y, bout.z - 0.05 - 0.17), 0.19, 'max', rotation_z=0)

# Key light sur son pied, au coin droit, tournée vers le streamer.
# Key light sur pied au sol, au bout du bureau (entre le bureau et l'étagère nord), tournée vers le siège.
for k in range(3):
    a = math.radians(90 + k * 120)
    tube('pied key light', (0.35, 4.15, 0.55), (0.35 + 0.22 * math.cos(a), 4.15 + 0.22 * math.sin(a), 0.0), 0.008, M['noir'])
tube('mât key light', (0.35, 4.15, 0.55), (0.35, 4.15, 0.96), 0.011, M['noir'])
placer('key_light', (0.35, 4.15, 0.96), 0.6, 'z', rotation_z=-120)

# Le PC (boîtier sobre, façade en lames de noyer) au sol, au bout du bureau.
boite('PC', (0.33, 1.88, 0.24), (0.45, 0.22, 0.48), M['noir'], 0.008)
for i in range(9):
    boite('PC lame', (0.558, 1.79 + i * 0.022, 0.24), (0.014, 0.014, 0.44), M['noyer'])
placer('siege_gaming', (1.4, 3.0, 0), 1.3, 'z', rotation_z=-90)

# --- Étagères des répliques (noyer, LED dessous) de part et d'autre du bureau. Chaque objet est posé
# sur le dessus de sa planche (DESSUS[niveau]) ; répliques et déco alternent pour que rien ne fasse vide.
NIVEAUX = (1.0, 1.45, 1.9)
EP = 0.035
DESSUS = [z + EP / 2 for z in NIVEAUX]
for cote, yc in (('sud', 1.05), ('nord', 4.95)):
    for j, z in enumerate(NIVEAUX):
        boite(f'étagère {cote} {j}', (0.17, yc, z), (0.32, 1.1, EP), M['noyer'], 0.004)
        boite(f'LED {cote} {j}', (0.29, yc, z - EP / 2 - 0.004), (0.01, 1.0, 0.006), M['led'])
        for dy in (-0.45, 0.45):   # équerres noires
            boite('équerre', (0.12, yc + dy, z - 0.06), (0.2, 0.012, 0.1), M['noir'])
# Des livres pour de vrai : couvertures cartonnées (deux plats + dos) qui dépassent de 3 mm autour du bloc
# de pages crème, un titre doré sur certains dos ; rangs debout (hauteurs et épaisseurs variées, alignés
# sur le bord avant), piles couchées, serre-livres. Chaque rang est un seul maillage (léger à rendre).
import bmesh
from mathutils import Matrix

COUVERTURES = [materiau_uni(f'couverture {c}', c, 0.6) for c in ('#E6DED0', '#2F4F4C', '#8C3B2E', '#1D2733', '#C9A55C', '#6B7A80',
                                                                 '#D9CBB0', '#2B2B2B', '#A86B3C', '#1E5B57', '#F2EFE8', '#55606B', '#B8A27A')]
PAGES = materiau_uni('pages', '#EAE2CF', 0.85)
I_PAGES, I_TITRE = len(COUVERTURES), len(COUVERTURES) + 1
AVANT = 0.315   # bord avant des planches (x)


def bm_boite(bm, matrice, centre, taille, indice):
    v = bmesh.ops.create_cube(bm, size=1.0)['verts']
    bmesh.ops.transform(bm, matrix=matrice @ Matrix.Translation(centre) @ Matrix.Diagonal((*taille, 1.0)), verts=v)
    for f in {f for x in v for f in x.link_faces}:
        f.material_index = indice


def bm_livre(bm, centre, p, e, h, rotation=Matrix.Identity(4)):
    """Un livre centré en `centre` : dos vers +x, épaisseur selon y, hauteur selon z (avant rotation)."""
    m = Matrix.Translation(centre) @ rotation
    c = random.randrange(len(COUVERTURES)); t = 0.0016
    bm_boite(bm, m, (-0.0015, 0, 0), (p - 0.005, e - 2 * t - 0.0004, h - 0.006), I_PAGES)   # bloc de pages, en retrait
    for s in (-1, 1):
        bm_boite(bm, m, (0, s * (e / 2 - t / 2), 0), (p, t, h), c)                            # plats
    bm_boite(bm, m, (p / 2 - t / 2, 0, 0), (t, e, h), c)                                      # dos
    if random.random() < 0.45 and e > 0.02:
        bm_boite(bm, m, (p / 2 + 0.0003, 0, h * 0.28), (0.001, e * 0.7, 0.014), I_TITRE)      # titre doré


def bm_objet(nom, bm):
    me = bpy.data.meshes.new(nom); bm.to_mesh(me); bm.free()
    for mat in COUVERTURES + [PAGES, M['or']]:
        me.materials.append(mat)
    o = bpy.data.objects.new(nom, me); scene.collection.objects.link(o)
    return o


def livres(y0, y1, z, serre=None):
    """Rang de livres debout de y0 à y1, dos vers la pièce. serre : 'debut'/'fin' pour un serre-livres."""
    y = y0
    if serre == 'debut':
        boite('serre-livres', (AVANT - 0.08, y + 0.003, z + 0.07), (0.1, 0.006, 0.14), M['noir']); y += 0.008
    bm = bmesh.new()
    groupe = random.uniform(0.2, 0.27)
    while True:
        if random.random() < 0.25:
            groupe = random.uniform(0.18, 0.29)   # nouvelle série, nouvelle hauteur
        e, h, p = random.uniform(0.016, 0.042), groupe + random.uniform(-0.015, 0.015), random.uniform(0.14, 0.2)
        if y + e > y1:
            break
        bm_livre(bm, (AVANT - 0.01 - p / 2, y + e / 2, z + h / 2), p, e, h)
        y += e + 0.001
    bm_objet('rang de livres', bm)
    if serre == 'fin':
        boite('serre-livres', (AVANT - 0.08, y + 0.003, z + 0.07), (0.1, 0.006, 0.14), M['noir'])
    return y


def pile(y, z, n=3):
    """Livres couchés, les plus grands en dessous ; renvoie le dessus de la pile."""
    bm = bmesh.new()
    for k in range(n):
        e, h, p = random.uniform(0.025, 0.045), 0.27 - 0.025 * k + random.uniform(-0.01, 0.01), 0.19 - 0.012 * k
        rot = Matrix.Rotation(math.radians(random.uniform(-4, 4)), 4, 'Z') @ Matrix.Rotation(math.radians(90), 4, 'X')
        bm_livre(bm, (AVANT - 0.012 - p / 2, y, z + e / 2), p, e, h, rot)
        z += e
    bm_objet('pile de livres', bm)
    return z


def plantule(y, z, echelle=1.0):
    importer_ph('potted_plant_04', (AVANT - 0.12, y, z), rotation_z=random.uniform(0, 360), echelle=echelle)


# Bloc sud (y 0,50 → 1,60) : Avengers et Retour vers le futur. Chaque réplique a de l'air autour d'elle.
placer('casque_ironman', (0.17, 0.72, DESSUS[2]), 0.28, 'z', rotation_z=90)
livres(0.92, 1.30, DESSUS[2], serre='fin')
plantule(1.46, DESSUS[2])
haut = pile(0.67, DESSUS[1], 3)
importer_ph('ceramic_vase_01', (0.19, 0.67, haut), echelle=0.55)
placer('mjolnir', (0.17, 1.03, DESSUS[1]), 0.36, 'max', rotation_z=90, pre=(0, 140.4, 0))
livres(1.22, 1.58, DESSUS[1], serre='debut')
livres(0.53, 0.70, DESSUS[0])
placer('delorean', (0.18, 0.95, DESSUS[0]), 0.32, 'max', rotation_z=70)
haut = pile(1.32, DESSUS[0], 4)
importer_ph('wooden_bowl_01', (0.18, 1.32, haut), echelle=0.5)
plantule(1.55, DESSUS[0], 0.8)
# Bloc nord (y 4,40 → 5,50) : Rick et Morty, et le gant de l'Infini.
livres(4.43, 4.62, DESSUS[2])
placer('pistolet_portail', (0.17, 4.80, DESSUS[2]), 0.28, 'max', rotation_z=110)
haut = pile(5.10, DESSUS[2], 2)
plantule(5.10, haut, 0.9)
livres(5.28, 5.47, DESSUS[2], serre='debut')
livres(4.43, 4.75, DESSUS[1], serre='fin')
placer('plumbus', (0.17, 4.90, DESSUS[1]), 0.24, 'z', rotation_z=90)
placer('meeseeks', (0.17, 5.13, DESSUS[1]), 0.2, 'max', rotation_z=80)
importer_ph('brass_vase_01', (0.18, 5.3, DESSUS[1]), echelle=0.45)
placer('gant_infini', (0.17, 4.60, DESSUS[0]), 0.3, 'z', rotation_z=90)
importer_ph('standing_picture_frame_01', (0.2, 4.88, DESSUS[0]), rotation_z=90, echelle=0.8)
livres(5.05, 5.22, DESSUS[0])
haut = pile(5.37, DESSUS[0], 3)
importer_ph('ceramic_vase_03', (0.19, 5.37, haut), echelle=0.5)
# Au mur, au-dessus du bureau et des étagères.
placer('convecteur', (0.04, 1.05, 2.38), 0.42, 'z', rotation_z=90)
placer('bouclier', (0.06, 3.0, 2.25), 0.6, 'max', rotation_z=90)
placer('hoverboard', (0.03, 4.95, 2.42), 0.75, 'max', rotation_z=90, rotation_x=90)
importer_ph('wicker_basket_01', (0.3, 1.05, 0))

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
plaque('prise TV', (L - 0.005, 4.45, 0.3), 'x-', True)
plaque('prise lampadaire', (7.0, 0.005, 0.3), 'y+', True)

# --- Les affiches officielles encadrées (mur sud, derrière le canapé).
for k, (nom, x) in enumerate((('endgame', 3.6), ('retour-vers-le-futur', 4.6), ('rick-et-morty', 5.6))):
    zc, LA, HA, B = 1.65, 0.6, 0.9, 0.03   # affiche 60 × 90, baguette de 3 cm qui dépasse de 1,5 cm
    boite(f'fond {nom}', (x, 0.015, zc), (LA + 2 * B, 0.02, HA + 2 * B), M['noir'])
    for dx, dz, w, h in ((-(LA + B) / 2, 0, B, HA + 2 * B), ((LA + B) / 2, 0, B, HA + 2 * B), (0, (HA + B) / 2, LA, B), (0, -(HA + B) / 2, LA, B)):
        boite(f'cadre {nom}', (x + dx, 0.025, zc + dz), (w, 0.04, h), M['chene'], 0.002)
    img = bpy.data.materials.new(f'affiche {nom}'); nt = img.node_tree
    b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 0.12   # sous verre
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(os.path.join(ASSETS, 'affiches', f'{nom}.jpg'))
    nt.links.new(tex.outputs['Color'], b.inputs['Base Color'])
    bpy.ops.mesh.primitive_plane_add(size=1, location=(x, 0.0275, zc), rotation=(math.radians(90), 0, math.radians(180)))
    a = bpy.context.object; a.name = f'affiche {nom}'; a.scale = (LA, HA, 1); a.data.materials.append(img)

# --- Le salon : canapé d'angle face à la TV, tapis teal, table basse, fauteuil.
# Le canapé d'angle regarde la TV : dossier à l'ouest (x 4,3), assise vers l'est, méridienne au nord
# (vers la baie). La table basse se glisse devant l'assise, au sud de la méridienne (40 cm de passage).
placer('canape', (5.6, 3.0, 0), 2.8, 'max', rotation_z=0, matiere=M['canape'])
boite('tapis', (6.0, 3.0, 0.006), (3.0, 3.4, 0.012), M['tapis'])
importer_ph('coffee_table_round_01', (6.05, 2.45, 0), echelle=0.8)
importer_ph('wooden_bowl_01', (5.85, 2.55, 0.39))
importer_ph('ceramic_vase_02', (6.25, 2.7, 0.39), echelle=0.6)
haut = 0.39
for k, c in enumerate(('#1D2733', '#E6DED0')):   # deux beaux livres empilés
    boite('beau livre', (6.15, 2.25, haut + 0.016), (0.3, 0.24, 0.032), COUVERTURES[k * 4], 0.003); haut += 0.032
coussins = importer_ph('throw_pillows_01', (4.62, 2.0, 0.42), rotation_z=90)
for k, o in enumerate(o for o in coussins.children_recursive if o.type == 'MESH'):   # aux couleurs de la DA
    o.data.materials.clear(); o.data.materials.append(tissu('coussin', ('#1E5B57', '#E0A93B', '#8E979D')[k % 3]))
importer_ph('side_table_01', (4.55, 1.2, 0), rotation_z=90)
# Lampe à poser sur le bout de canapé : pied en céramique, abat-jour en lin qui laisse passer la lumière.
CERAM = materiau_uni('céramique', '#E3DCCD', 0.3)
bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=(4.55, 1.2, 0.55 + 0.11)); o = bpy.context.object
o.name = 'lampe pied'; o.scale = (0.1, 0.1, 0.11); o.data.materials.append(CERAM); bpy.ops.object.shade_smooth()
tube('lampe tige', (4.55, 1.2, 0.76), (4.55, 1.2, 0.9), 0.006, M['or'])
ABAT = materiau_uni('abat-jour', '#EFE6D6', 0.9, emission='#FFC27A', force=2.5)
bpy.ops.mesh.primitive_cylinder_add(radius=0.17, depth=0.2, location=(4.55, 1.2, 0.93), vertices=48, end_fill_type='NOTHING')
o = bpy.context.object; o.name = 'abat-jour'; o.data.materials.append(ABAT); bpy.ops.object.shade_smooth()
importer_ph('mid_century_lounge_chair', (6.3, 0.95, 0), rotation_z=115)

# --- Coin TV (mur est, teal) : TV 85" fixée au mur, meuble bas en noyer à façade cannelée de chêne,
# barre de son et consoles posées dessus (la PS5 et la Xbox aux extrémités, hors de l'écran).
MX0, MX1, MY0, MY1, MZ = L - 0.45, L - 0.02, 1.7, 4.3, 0.5   # le dessus du meuble est à 50 cm
for y in (MY0 + 0.08, MY1 - 0.08):
    for x in (MX0 + 0.06, MX1 - 0.06):
        tube('pied meuble TV', (x, y, 0), (x, y, 0.14), 0.012, M['noir'])
boite('meuble TV', ((MX0 + MX1) / 2, (MY0 + MY1) / 2, 0.14 + (MZ - 0.14) / 2), (MX1 - MX0, MY1 - MY0, MZ - 0.14), M['noyer'], 0.004)
n = 64
for i in range(n):   # façade cannelée
    yy = MY0 + 0.03 + (MY1 - MY0 - 0.06) * (i + 0.5) / n
    tube('cannelure', (MX0 - 0.004, yy, 0.165), (MX0 - 0.004, yy, MZ - 0.025), 0.017, M['chene'])
placer('tv', (L - 0.06, 3.0, 0.95), 1.9, 'max', rotation_z=-90, sans=('Table',))
boite('barre de son', (L - 0.2, 3.0, MZ + 0.035), (0.1, 0.9, 0.07), M['noir'], 0.012)
placer('ps5', (L - 0.24, MY0 + 0.2, MZ), 0.39, 'z', rotation_z=-90, sans=('Plane', 'Digital'))
placer('xbox', (L - 0.24, MY1 - 0.2, MZ), 0.30, 'z', rotation_z=-90)
placer('switch', (L - 0.22, 3.75, MZ), 0.32, 'x', rotation_z=-90)
importer_ph('ceramic_vase_01', (L - 0.3, 2.35, MZ), echelle=0.6)

# --- Plantes, luminaires.
placer('plante', (7.42, 5.42, 0), 1.25, 'z', rotation_z=30)
placer('plante', (0.58, 5.62, 0), 0.85, 'z', rotation_z=-20)
importer_ph('potted_plant_02', (2.75, 0.4, 0))
placer('lampadaire', (7.5, 0.48, 0), 1.6, 'z')
# Suspensions au-dessus de la table basse (le modèle va de 0,22 à 1,17 m au-dessus de son origine) ;
# le globe devient lumineux, c'est lui qu'on voit (et qui se reflète dans la baie).
GLOBE = materiau_uni('globe opalin', '#FFF4E2', 0.3, emission='#FFC27A', force=12.0)
for y in (2.2, 2.75):
    lp = importer_ph('modern_ceiling_lamp_01', (6.05, y, H - 1.17))
    for o in lp.children_recursive:
        if o.type == 'MESH':
            for i, m in enumerate(o.data.materials):
                if m and 'globe' in m.name:
                    o.data.materials[i] = GLOBE


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
    return d


# Éclairage de nuit : seulement les lampes de la pièce (2 700 K), plus la lueur froide des écrans.
lumiere('suspension', 'POINT', (6.05, 2.2, 2.0), 45, '#FFC27A', 0.1)
lumiere('suspension 2', 'POINT', (6.05, 2.75, 2.0), 45, '#FFC27A', 0.1)
lumiere('lampe à poser', 'POINT', (4.55, 1.2, 0.92), 25, '#FFB866', 0.05)
lumiere('lampadaire', 'POINT', (7.5, 0.48, 1.45), 110, '#FFB866', 0.12)
for x, y in ((2.2, 1.5), (2.2, 4.5), (3.6, 0.5), (5.6, 0.5), (7.2, 4.6)):   # spots encastrés : des cônes doux
    lumiere('spot', 'SPOT', (x, y, H - 0.02), 40, '#FFD29A', 0.05, (0, 0, 0), cone=60)
for yc in (1.05, 4.95):   # ruban LED sous chaque planche : la réplique du dessous est mise en valeur
    for z in NIVEAUX:
        d = lumiere('LED étagère', 'AREA', (0.27, yc, z - EP / 2 - 0.01), 7, '#FFC680', 1.0, (0, 0, 90))
        d.shape, d.size_y = 'RECTANGLE', 0.04
lumiere('écrans', 'AREA', (0.45, 3.0, 1.1), 18, '#8FB8D8', 0.8, (0, -90, 0))
lumiere('key light', 'AREA', (0.45, 4.05, 1.35), 25, '#FFF1DC', 0.3, (0, -80, -48))
lumiere('TV (rétroéclairage)', 'AREA', (L - 0.08, 3.0, 1.55), 30, '#E0A93B', 1.6, (0, 90, 0))   # halo doré sur le mur teal
lumiere('TV (reflet)', 'AREA', (L - 0.2, 3.0, 1.3), 8, '#6E8FB8', 1.5, (0, 90, 0))


# ------------------------------------------------------------------ caméras d'aperçu

def camera(nom, position, cible, focale=24):
    c = bpy.data.objects.new(nom, bpy.data.cameras.new(nom)); scene.collection.objects.link(c)
    c.data.lens = focale
    c.location = position
    c.rotation_euler = (Vector(cible) - Vector(position)).to_track_quat('-Z', 'Y').to_euler()
    return c


CAMS = {
    'porte': camera('porte', (1.2, 0.5, 1.6), (5.0, 4.4, 1.0), 22),
    'salon': camera('salon', (3.4, 3.0, 1.6), (L, 3.0, 1.0), 24),
    'canape': camera('canape', (7.4, 4.9, 1.7), (4.8, 2.4, 0.6), 24),
    'etag_sud': camera('etag_sud', (1.5, 1.05, 1.45), (0.1, 1.05, 1.45), 30),
    'etag_nord': camera('etag_nord', (1.5, 4.95, 1.45), (0.1, 4.95, 1.45), 30),
    'setup': camera('setup', (1.55, 3.55, 1.45), (0.35, 2.85, 0.95), 26),
    'affiches': camera('affiches', (4.6, 3.2, 1.6), (4.6, 0.0, 1.55), 30),
    'bureau': camera('bureau', (2.6, 3.0, 1.45), (0.2, 3.0, 1.2), 30),
    'baie': camera('baie', (6.5, 1.2, 1.5), (3.0, 6.0, 1.3), 24),
    'etageres': camera('etageres', (1.6, 3.3, 1.55), (0.15, 1.35, 1.4), 32),
}
cd = camera('dessus', (L / 2, P / 2, 12), (L / 2, P / 2, 0)); cd.data.type = 'ORTHO'; cd.data.ortho_scale = L + 0.4
CAMS['dessus'] = cd
scene.camera = CAMS[opt.get('cam', 'porte')]
if opt.get('cam') == 'dessus':   # vue de plan : sans plafond ni suspensions
    for o in scene.objects:
        if o.name.startswith('plafond') or 'ceiling' in o.name.lower() or (o.parent and 'ceiling' in o.parent.name.lower()):
            o.hide_render = True
if 'boites' in opt:   # emprise au sol des meubles (contrôle des collisions)
    bpy.context.view_layer.update()
    for r in [o for o in scene.objects if o.type == 'EMPTY' and o.parent is None]:
        pts = [m.matrix_world @ Vector(c) for m in r.children_recursive if m.type == 'MESH' for c in m.bound_box]
        if pts:
            print('BOITE', r.name, *(f'{f(p[i] for p in pts):.2f}' for i in range(3) for f in (min, max)))

if 'controle' in opt:
    sys.path.insert(0, ICI); import controle; controle.controler(scene); controle.flottants(scene)
if 'rendu' in opt:
    scene.render.filepath = os.path.abspath(opt['rendu'])
    bpy.ops.render.render(write_still=True)
if 'sauver' in opt:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(opt['sauver']))
if 'web' in opt:   # visite 3D dans le navigateur (glTF) : sans la ville ni les lumières, recréées côté page
    for o in list(scene.objects):
        if o.type in {'LIGHT', 'CAMERA'} or o.name.startswith(('immeuble', 'balise', 'sol extérieur')):
            bpy.data.objects.remove(o)
    for m in bpy.data.materials:   # couleurs calculées (livres) : le glTF ne garde que la couleur de couverture
        b = m.node_tree and next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if b and b.inputs['Base Color'].links and b.inputs['Base Color'].links[0].from_node.type == 'MIX':
            mix = b.inputs['Base Color'].links[0].from_node
            b.inputs['Base Color'].default_value = mix.inputs['A'].default_value
            m.node_tree.links.remove(b.inputs['Base Color'].links[0])
    plafond_tri = int(opt.get('triangles', 6000))   # par objet : la page doit rester légère
    for o in scene.objects:
        if o.type == 'MESH':
            n = sum(len(p.vertices) - 2 for p in o.data.polygons)
            if n > plafond_tri:
                d = o.modifiers.new('allègement', 'DECIMATE'); d.ratio = max(0.02, plafond_tri / n)
    cote = int(opt.get('texture', 512))
    for im in bpy.data.images:
        if im.size[0] > cote or im.size[1] > cote:
            k = cote / max(im.size); im.scale(max(1, int(im.size[0] * k)), max(1, int(im.size[1] * k)))
    bpy.ops.export_scene.gltf(filepath=os.path.abspath(opt['web']), export_format='GLB', export_apply=True,
                              export_image_format='JPEG', export_jpeg_quality=80, export_lights=False, export_cameras=False,
                              export_tangents=False, export_vertex_color='NONE')
