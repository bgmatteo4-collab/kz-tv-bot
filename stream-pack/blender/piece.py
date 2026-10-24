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
from mathutils import Matrix, Vector

ICI = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(ICI, '..', 'assets')
OBJ = os.path.join(ASSETS, 'objaverse')
TAILLES = {l.split()[1]: l.split()[2] for l in open(os.path.join(ICI, '..', 'assets.txt')) if l.strip() and not l.startswith('#')}
L, P, H = 8.0, 6.0, 3.0
SUD = -5.0   # la pièce a été rallongée de 5 m vers le sud : cuisine ouverte et coin stream

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
# Ligne de temps commune aux clips : 30 i/s, la boucle d'attente dure 60 s (images 0 à 1799, la 1800e = la 0e).
FPS, DUREE = 30, 60.0
scene.render.fps, scene.frame_start, scene.frame_end = FPS, 0, int(DUREE * FPS) - 1
TV_ALLUMEE = [(10.5, 57.0)]   # moments où la TV est allumée (s)

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


def placer(objet, position, taille, axe='max', rotation_z=0.0, rotation_x=0.0, matiere=None, sans=(), pre=(0, 0, 0), matieres=None):
    """Modèle Objaverse (.glb) : mis à la taille réelle (taille en m sur l'axe donné), posé sur sa base,
    centré sur position, tourné de rotation_z degrés. sans : noms de pièces à retirer (socles, sols).
    pre : rotation (degrés) appliquée au modèle avant la mesure, pour redresser un modèle penché.
    matieres : {fragment de nom de matériau: matériau} pour repeindre certaines pièces."""
    avant = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(OBJ, f'{objet}.glb'))
    nouveaux = [o for o in bpy.data.objects if o not in avant]
    scene.frame_set(1)
    for o in nouveaux:   # certains modèles sont animés (pièces du micro) : on fige la pose de la 1re image
        if o.animation_data:
            pose = o.matrix_basis.copy(); o.animation_data_clear(); o.matrix_basis = pose
    for o in list(nouveaux):
        if o.type == 'LIGHT' or any(s.lower() in o.name.lower() for s in sans):   # nos lumières, pas les leurs
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
        if matieres and o.type == 'MESH':
            for i, m in enumerate(o.data.materials):
                for cle, nouveau in matieres.items():
                    if m and cle.lower() in m.name.lower():
                        o.data.materials[i] = nouveau; break
    racine.scale = (taille / ref,) * 3
    racine.rotation_euler = (math.radians(rotation_x), 0, math.radians(rotation_z))
    racine.location = position
    return racine


# ------------------------------------------------------------------ le loft

YC, PROF = (SUD + P) / 2, P - SUD
boite('sol', (L / 2, YC, -0.05), (L, PROF, 0.1), M['parquet'])
boite('plafond', (L / 2, YC, H + 0.05), (L, PROF, 0.1), M['plafond'])
boite('mur sud', (L / 2, SUD - 0.05, H / 2), (L, 0.1, H), M['mur'])
boite('mur ouest', (-0.05, YC, H / 2), (0.1, PROF, H), M['mur'])
boite('mur est', (L + 0.05, YC, H / 2), (0.1, PROF, H), M['teal'])
boite('plinthe sud', (L / 2, SUD + 0.01, 0.05), (L, 0.02, 0.1), M['chene'])

# Baie vitrée : toute la longueur du mur nord, du sol au plafond, 8 travées d'1 m à montants noirs fins.
# La 4e (x 3 → 4) est un coulissant ouvert, glissé derrière la 5e : c'est par là que le drone entre.
OUVERT = 3
for i in range(8):
    if i != OUVERT:
        boite(f'baie vitre {i}', (i + 0.5, P + 0.02, H / 2), (1.0, 0.02, H), M['verre'])
boite('baie vitre coulissant', (OUVERT + 1.5, P - 0.05, H / 2), (0.96, 0.02, H - 0.08), M['verre'])
for x in (OUVERT + 1.02, OUVERT + 1.98):
    boite('baie coulissant montant', (x, P - 0.05, H / 2), (0.04, 0.045, H - 0.08), M['noir'])
boite('baie coulissant poignée', (OUVERT + 1.06, P - 0.085, 1.05), (0.02, 0.02, 0.3), M['noir'], 0.005)
for i in range(9):
    boite(f'montant {i}', (i * L / 8, P, H / 2), (0.05, 0.08, H), M['noir'])
for z in (0.02, H - 0.02):
    boite('traverse', (L / 2, P, z), (L, 0.08, 0.05), M['noir'])

# Mur du bureau (ouest) : mur acoustique en lames de noyer, centré sur le bureau (y 1,75 → 4,25) ;
# les étagères sont de part et d'autre, à 15 cm des lames.
for i in range(26):
    boite(f'lame {i}', (0.03, 1.75 + i * 0.1, 1.55), (0.04, 0.05, 2.6), M['noyer'])


DEPLACEMENTS = {}


def centre_monde(o):
    if o.type == 'MESH':
        return sum((o.matrix_world @ Vector(c) for c in o.bound_box), Vector()) / 8
    return o.matrix_world.translation.copy()


def deplacer(nom, avant, pivot, angle, arrivee, choisir=lambda c: True):
    """Déplace d'un bloc les objets créés depuis `avant` : rotation de `angle`° autour du pivot, puis le pivot
    vient en `arrivee`. choisir(centre) trie les objets. La matrice est gardée pour les lumières associées."""
    m = Matrix.Translation(Vector(arrivee)) @ Matrix.Rotation(math.radians(angle), 4, 'Z') @ Matrix.Translation(-Vector(pivot))
    bpy.context.view_layer.update()
    for o in [o for o in bpy.data.objects if o not in avant and o.parent is None and o.type != 'CAMERA']:
        if choisir(centre_monde(o)):
            o.matrix_world = m @ o.matrix_world
    DEPLACEMENTS[nom] = m
    bpy.context.view_layer.update()
    return m


def tube(nom, a, b, r, mat):
    """Cylindre d'un point à un autre (bras de micro, pieds)."""
    a, b = Vector(a), Vector(b)
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=(b - a).length, location=(a + b) / 2, vertices=20)
    o = bpy.context.object; o.name = nom
    o.rotation_euler = (b - a).to_track_quat('Z', 'Y').to_euler()
    o.data.materials.append(mat); bpy.ops.object.shade_smooth()
    return o


# --- Le bureau de stream (construit comme à l'origine, contre le mur ouest, puis déplacé d'un bloc dans le
# coin stream : voir plus bas). Ici, le streamer regarde vers l'ouest (-x).
AVANT_SETUP = set(bpy.data.objects)
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


def materiau_chat():
    """Faux chat de live (ecrans/chat.*), comme au début d'un vrai live : il démarre presque vide, chaque message
    apparaît à son heure (chat.json), et quand la fenêtre est pleine, le fil remonte d'un message."""
    import json
    d = json.load(open(os.path.join(ICI, '..', 'ecrans', 'chat.json')))
    m = bpy.data.materials.new('écran chat'); nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.005, 0.005, 0.006, 1); b.inputs['Roughness'].default_value = 0.18
    uv = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
    fil = nt.nodes.new('ShaderNodeTexImage'); fil.extension = 'EXTEND'
    fil.image = bpy.data.images.load(os.path.join(ICI, '..', 'ecrans', 'chat-fil.png'))
    cadre = nt.nodes.new('ShaderNodeTexImage')
    cadre.image = bpy.data.images.load(os.path.join(ICI, '..', 'ecrans', 'chat-cadre.png'))
    nt.links.new(uv.outputs['UV'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], fil.inputs['Vector'])
    nt.links.new(uv.outputs['UV'], cadre.inputs['Vector'])
    # Les messages pas encore arrivés sont cachés : sous la limite « revele », on affiche le fond du chat.
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(mp.outputs['Vector'], sep.inputs['Vector'])
    revele = nt.nodes.new('ShaderNodeValue')
    cache = nt.nodes.new('ShaderNodeMath'); cache.operation = 'LESS_THAN'
    nt.links.new(sep.outputs['Y'], cache.inputs[0]); nt.links.new(revele.outputs['Value'], cache.inputs[1])
    fond = nt.nodes.new('ShaderNodeMix'); fond.data_type = 'RGBA'; fond.inputs['B'].default_value = hexa('#18181B')
    nt.links.new(cache.outputs['Value'], fond.inputs['Factor']); nt.links.new(fil.outputs['Color'], fond.inputs['A'])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    nt.links.new(cadre.outputs['Alpha'], mix.inputs['Factor'])
    nt.links.new(fond.outputs['Result'], mix.inputs['A']); nt.links.new(cadre.outputs['Color'], mix.inputs['B'])
    nt.links.new(mix.outputs['Result'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = 1.1
    # Rangée du fil (depuis le haut) en haut de la fenêtre : S ; v_image = v * k + 1 - v1 * k - S / Htot.
    htot, ecran = fil.image.size[1], d['ecran']
    fenetre, v1, k = ecran - d['tete'] - d['pied'] - 12, 1 - d['tete'] / ecran, ecran / htot
    mp.inputs['Scale'].default_value = (1, k, 1)
    loc = lambda S: 1 - v1 * k - S / htot
    def poser(t, S, R):
        mp.inputs['Location'].default_value[1] = loc(S); revele.outputs[0].default_value = 1 - R / htot
        mp.inputs['Location'].keyframe_insert('default_value', index=1, frame=t * FPS)
        revele.outputs[0].keyframe_insert('default_value', frame=t * FPS)
    S = R = 0.0
    for haut_m, h, t in d['messages']:   # chaque message « tombe » d'un coup ; le fil glisse en 0,15 s si besoin
        nouveau_R = haut_m + h
        nouveau_S = max(0.0, nouveau_R - fenetre)
        if t > 0:
            poser(t - 0.02, S, R)
        poser(t, S, nouveau_R)
        if nouveau_S != S:
            poser(t + 0.15, nouveau_S, nouveau_R)
        S, R = nouveau_S, nouveau_R
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
         materiau_chat())

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
# Le SM7B est monté tête en bas, comme sur un bras : la base de son étrier en haut, vissée au bout de la tige.
micro = placer('micro', (bout.x, bout.y, bout.z - 0.3), 0.19, 'max', rotation_z=0, pre=(180, 0, 0))
bpy.context.view_layer.update()
sommets = {o: [o.matrix_world @ v.co for v in o.data.vertices] for o in micro.children_recursive if o.type == 'MESH'}
etrier = max(sommets, key=lambda o: max(p.z for p in sommets[o]))   # la pièce la plus haute : l'étrier
pts = sommets[etrier]
zmax = max(p.z for p in pts)
# Le haut du modèle a deux cylindres côte à côte : la molette (libre) et le tube de l'étrier, le seul qui
# descend jusqu'à l'arceau. On prend l'axe de ce tube, 5 à 7 cm sous le sommet, pour y visser la tige.
base = [p for p in pts if zmax - 0.075 < p.z < zmax - 0.05]
centre_base = sum(base, Vector()) / len(base)
haut_tube = max(p.z for p in pts if (p.xy - centre_base.xy).length < 0.012)   # sommet du tube (la molette est plus haute)
attache = Vector((bout.x, bout.y, bout.z - 0.05))                 # 5 cm de tige sous le bras
micro.location += attache - Vector((centre_base.x, centre_base.y, haut_tube))
tube('tige micro', bout, attache - Vector((0, 0, 0.004)), 0.009, M['noir'])   # même diamètre que le tube, 4 mm dedans

# Key light sur son pied, au coin droit, tournée vers le streamer.
# Key light sur pied au sol, au bout du bureau (entre le bureau et l'étagère nord), tournée vers le siège.
KX, KY, KZ = 0.35, 4.15, 0.45   # pied de la key light, au sol au bout du bureau
for k in range(3):
    a = math.radians(90 + k * 120)
    tube('pied key light', (KX, KY, KZ), (KX + 0.25 * math.cos(a), KY + 0.25 * math.sin(a), 0.0), 0.008, M['noir'])
# Le modèle éclaire vers son -y : tourné de 40°, il vise le visage du streamer (siège en x 1,3, y 3,0).
kl = placer('key_light', (KX, KY, KZ), 1.07, 'z', rotation_z=40, sans=('Object_24', 'Object_25', 'Object_32'))
bpy.context.view_layer.update()
centre_de = lambda o: sum((o.matrix_world @ Vector(c) for c in o.bound_box), Vector()) / 8
mat_kl = next(o for o in kl.children_recursive if o.name.startswith('Object_22'))   # le mât, posé sur le trépied
c = centre_de(mat_kl); kl.location.x += KX - c.x; kl.location.y += KY - c.y
bpy.context.view_layer.update()
KL_PANNEAU = centre_de(next(o for o in kl.children_recursive if o.name.startswith('Object_5')))

# Le PC (boîtier sobre, façade en lames de noyer) au sol, au bout du bureau.
boite('PC', (0.33, 1.88, 0.24), (0.45, 0.22, 0.48), M['noir'], 0.008)
for i in range(9):
    boite('PC lame', (0.558, 1.79 + i * 0.022, 0.24), (0.014, 0.014, 0.44), M['noyer'])
placer('siege_gaming', (1.4, 3.0, 0), 1.3, 'z', rotation_z=-90)
# Le setup part tel quel dans le coin stream : bureau au milieu de la pièce, le streamer dos au mur sud
# (à 80 cm du décor), face au salon ; ce que voit sa caméra, c'est lui et le décor.
SETUP = deplacer('setup', AVANT_SETUP, (0.45, 3.0, 0), -90, (2.1, -2.9, 0))
KL_PANNEAU = SETUP @ KL_PANNEAU
VISAGE = SETUP @ Vector((1.3, 3.0, 1.2))   # le visage du streamer, que vise la key light

AVANT_ETAGERES = set(bpy.data.objects)
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


def pile_sur(x, y, z, n=3, tourne=0):
    """Pile de livres couchés ailleurs que sur les étagères (dos vers +x, ou tournés de `tourne` degrés)."""
    bm = bmesh.new()
    for k in range(n):
        e, h, p = random.uniform(0.025, 0.045), 0.27 - 0.025 * k + random.uniform(-0.01, 0.01), 0.19 - 0.012 * k
        rot = Matrix.Rotation(math.radians(tourne + random.uniform(-6, 6)), 4, 'Z') @ Matrix.Rotation(math.radians(90), 4, 'X')
        bm_livre(bm, (x, y, z + e / 2), p, e, h, rot)
        z += e
    bm_objet('pile de livres', bm)
    return z


def plantule(y, z, echelle=1.0):
    importer_ph('potted_plant_04', (AVANT - 0.12, y, z), rotation_z=random.uniform(0, 360), echelle=echelle)


# Bloc sud (y 0,50 → 1,60) : Avengers et Retour vers le futur. Chaque réplique a de l'air autour d'elle.
placer('casque_ironman', (0.17, 0.72, DESSUS[2]), 0.28, 'z', rotation_z=90)
livres(0.92, 1.30, DESSUS[2], serre='fin')
placer('reacteur_arc', (0.17, 1.44, DESSUS[2]), 0.22, 'z', rotation_z=90)   # réacteur Arc sur socle Avengers
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
OR_GANT = materiau_uni('or du gant', '#D4A53C', 0.28, 1.0)
PIERRE = lambda n, c: materiau_uni(f'pierre {n}', c, 0.08, emission=c, force=1.5)
placer('gant_infini2', (0.17, 4.62, DESSUS[0]), 0.3, 'z', rotation_z=90, matieres={
    'time_stone_plate': OR_GANT, 'time_stone': PIERRE('temps', '#2ECC71'), 'soul': PIERRE('âme', '#FF8C1A'),
    'mind': PIERRE('esprit', '#FFD21A'), 'reality': PIERRE('réalité', '#E0202A'), 'space': PIERRE('espace', '#2A6BFF'),
    'power': PIERRE('pouvoir', '#8E2DE2'), 'hand': OR_GANT, 'wrist': OR_GANT, 'thumb': OR_GANT, 'finger': OR_GANT, 'palm': OR_GANT})
importer_ph('standing_picture_frame_01', (0.2, 4.88, DESSUS[0]), rotation_z=90, echelle=0.8)
livres(5.05, 5.22, DESSUS[0])
haut = pile(5.37, DESSUS[0], 3)
importer_ph('ceramic_vase_03', (0.19, 5.37, haut), echelle=0.5)
# Au mur, au-dessus du bureau et des étagères.
placer('convecteur', (0.04, 1.05, 2.38), 0.42, 'z', rotation_z=90)
placer('bouclier', (0.06, 3.0, 2.25), 0.6, 'max', rotation_z=90)
placer('hoverboard', (0.03, 4.95, 2.42), 0.75, 'max', rotation_z=90, rotation_x=90)
importer_ph('wicker_basket_01', (0.3, 1.05, 0))
# Les deux blocs d'étagères, le bouclier et les objets muraux deviennent le décor du stream : posés sur le mur
# en lames du fond (mur sud), de part et d'autre du néon, derrière le streamer.
ETAGERES = {}
for nom, yc, x, tri in (('Avengers', 1.05, 3.35, lambda c: c.y < 2.5), ('Rick et Morty', 4.95, 0.85, lambda c: c.y > 3.5),
                        ('bouclier', 3.0, 2.1, lambda c: 2.5 <= c.y <= 3.5)):
    ETAGERES[nom] = deplacer(nom, AVANT_ETAGERES, (0, yc, 0), 90, (x, SUD + 0.05, 0), tri)
# Le mur du décor : lames de noyer sur toute la largeur du coin stream (x 0,25 → 3,95) ; les étagères sont
# fixées sur les lames (5 cm devant le mur).
for i in range(38):
    boite(f'lame décor {i}', (0.3 + i * 0.1, SUD + 0.03, 1.55), (0.05, 0.04, 2.6), M['noyer'])


def neon(texte, centre_x, bas_z, hauteur, couleur):
    """Néon en tubes qui suivent le contour des lettres (typo du pack, Rubik Black), sur le mur du décor."""
    cu = bpy.data.curves.new(texte, 'FONT'); cu.body = texte
    cu.font = bpy.data.fonts.load(os.path.join(ICI, '..', 'da', 'Rubik-3.ttf'))
    cu.size, cu.align_x, cu.fill_mode = hauteur * 1.38, 'CENTER', 'NONE'   # 1,38 : hauteur des capitales de Rubik
    cu.bevel_depth, cu.bevel_resolution = 0.0055, 3
    o = bpy.data.objects.new('néon ' + texte, cu); scene.collection.objects.link(o)
    o.rotation_euler = (math.radians(90), 0, math.radians(180))   # face au salon, lisible de gauche à droite
    o.location = (centre_x, SUD + 0.05 + 0.075, bas_z)
    o.data.materials.append(materiau_uni('néon ' + texte, couleur, 0.3, emission=couleur, force=22.0))
    return o


NEON_X = 2.1
neon('KAYZX', NEON_X, 1.78, 0.26, '#FFC24A')     # le miel de la DA, poussé en lumière
neon('TV', NEON_X, 1.5, 0.17, '#3FD3C2')         # le teal, en version néon
boite('néon plaque', (NEON_X, SUD + 0.05 + 0.055, 1.79), (1.25, 0.008, 0.62), M['verre'], 0.004)   # plexi transparent
for dx in (-0.57, 0.57):
    for z in (1.53, 2.05):
        tube('néon entretoise', (NEON_X + dx, SUD + 0.05, z), (NEON_X + dx, SUD + 0.052 + 0.05, z), 0.008, M['alu'])

# --- Porte (mur ouest de l'extension, y -1,15 → -0,25), interrupteur à côté, prises près de chaque appareil.
boite('porte', (0.025, -0.7, 1.05), (0.04, 0.9, 2.1), M['noyer'], 0.004)
for y in (-1.17, -0.23):
    boite('chambranle', (0.03, y, 1.07), (0.06, 0.05, 2.14), M['chene'])
boite('chambranle haut', (0.03, -0.7, 2.15), (0.06, 0.99, 0.05), M['chene'])
boite('poignée', (0.07, -0.97, 1.0), (0.02, 0.13, 0.02), M['noir'], 0.005)
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


plaque('interrupteur', (0.005, -0.02, 1.1), 'x+')
plaque('prise meuble', (0.005, 1.7, 0.3), 'x+', True)
plaque('prise bureau', (1.6, SUD + 0.005, 0.3), 'y+', True)
plaque('prise bureau 2', (2.6, SUD + 0.005, 0.3), 'y+', True)
plaque('prise TV', (L - 0.005, 4.45, 0.3), 'x-', True)
plaque('prise lampadaire', (L - 0.005, 0.2, 0.3), 'x-', True)
plaque('prise cuisine', (L - 0.005, -2.6, 1.1), 'x-', True)
plaque('prise îlot', (L - 0.005, -1.0, 0.3), 'x-', True)

# --- Les affiches officielles encadrées (nouveau mur sud, côté cuisine).
for k, (nom, x) in enumerate((('endgame', 4.65), ('retour-vers-le-futur', 5.6), ('rick-et-morty', 6.55))):
    zc, LA, HA, B = 1.65, 0.6, 0.9, 0.03   # affiche 60 × 90, baguette de 3 cm qui dépasse de 1,5 cm
    boite(f'fond {nom}', (x, SUD + 0.015, zc), (LA + 2 * B, 0.02, HA + 2 * B), M['noir'])
    for dx, dz, w, h in ((-(LA + B) / 2, 0, B, HA + 2 * B), ((LA + B) / 2, 0, B, HA + 2 * B), (0, (HA + B) / 2, LA, B), (0, -(HA + B) / 2, LA, B)):
        boite(f'cadre {nom}', (x + dx, SUD + 0.025, zc + dz), (w, 0.04, h), M['chene'], 0.002)
    img = bpy.data.materials.new(f'affiche {nom}'); nt = img.node_tree
    b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 0.12   # sous verre
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(os.path.join(ASSETS, 'affiches', f'{nom}.jpg'))
    nt.links.new(tex.outputs['Color'], b.inputs['Base Color'])
    bpy.ops.mesh.primitive_plane_add(size=1, location=(x, SUD + 0.0275, zc), rotation=(math.radians(90), 0, math.radians(180)))
    a = bpy.context.object; a.name = f'affiche {nom}'; a.scale = (LA, HA, 1); a.data.materials.append(img)

# --- La cuisine ouverte (extension, côté est) : façades noir mat sans poignées, plan de travail et îlot en
# chêne, colonne frigo + four dans l'angle, crédence chêne, étagères ouvertes, trois tabourets hauts.
NOIR_MAT = materiau_uni('noir mat cuisine', '#17181A', 0.62)
INOX = materiau_uni('inox', '#9AA0A6', 0.25, 1.0)
VITRE_FOUR = materiau_uni('vitre four', '#050506', 0.05)
KX0 = L - 0.62                     # façade des meubles (x)
KY0, KY1 = SUD + 0.03, -1.15       # la cuisine court le long du mur est
COL = KY0 + 1.22                   # fin de la colonne frigo + four
boite('colonne cuisine', (L - 0.31, (KY0 + COL) / 2, 1.13), (0.62, COL - KY0, 2.26), NOIR_MAT, 0.003)
for y in (KY0 + 0.61,):            # joint entre les deux colonnes
    boite('joint colonne', (KX0 - 0.001, y, 1.13), (0.004, 0.004, 2.2), M['noir'])
boite('vitre four', (KX0 - 0.002, KY0 + 0.91, 1.1), (0.004, 0.52, 0.38), VITRE_FOUR, 0.003)
boite('bandeau four', (KX0 - 0.002, KY0 + 0.91, 1.34), (0.004, 0.52, 0.05), INOX)
meubles_bas = boite('meubles bas', (L - 0.31, (COL + KY1) / 2, 0.47), (0.62, KY1 - COL, 0.78), NOIR_MAT, 0.003)
boite('socle cuisine', (L - 0.27, (COL + KY1) / 2, 0.04), (0.54, KY1 - COL, 0.08), M['noir'])
n = int((KY1 - COL) / 0.6)
for k in range(1, n + 1):          # joints des portes (sans poignées)
    boite('joint porte', (KX0 - 0.001, COL + k * (KY1 - COL) / (n + 1), 0.47), (0.004, 0.004, 0.76), M['noir'])
boite('joint tiroirs', (KX0 - 0.001, (COL + KY1) / 2, 0.7), (0.004, KY1 - COL - 0.02, 0.004), M['noir'])
PLAN = 0.9
plan_travail = boite('plan de travail', (L - 0.32, (COL + KY1) / 2, PLAN + 0.02), (0.64, KY1 - COL, 0.04), M['chene'], 0.003)
boite('crédence', (L - 0.012, (COL + KY1) / 2, PLAN + 0.29), (0.02, KY1 - COL, 0.5), M['chene'])
# Évier sous plan et mitigeur noir, plaque à induction, hotte intégrée au plafond (invisible).
EVIER_Y, PLAQUE_Y = -1.95, -3.05
# L'évier est vraiment creusé : le plan de travail et le meuble sont découpés, la cuve (sans couvercle) descend de 20 cm.
import bmesh as _bm
decoupe = boite('découpe évier', (L - 0.33, EVIER_Y, PLAN - 0.08), (0.4, 0.5, 0.36), M['noir'])
decoupe.hide_render = True; decoupe.display_type = 'WIRE'
for o in (plan_travail, meubles_bas):
    mod = o.modifiers.new('évier', 'BOOLEAN'); mod.operation, mod.object = 'DIFFERENCE', decoupe
INOX_BROSSE = materiau_uni('évier', '#3A3D41', 0.35, 0.8)
cuve = boite('cuve évier', (L - 0.33, EVIER_Y, PLAN + 0.04 - 0.1), (0.4, 0.5, 0.2), INOX_BROSSE)
bm = _bm.new(); bm.from_mesh(cuve.data)
_bm.ops.delete(bm, geom=[f for f in bm.faces if f.normal.z > 0.5], context='FACES'); bm.to_mesh(cuve.data); bm.free()
bpy.ops.mesh.primitive_cylinder_add(radius=0.035, depth=0.004, location=(L - 0.33, EVIER_Y + 0.1, PLAN + 0.04 - 0.198), vertices=32)
bpy.context.object.name = 'bonde'; bpy.context.object.data.materials.append(M['alu'])
tube('mitigeur', (L - 0.08, EVIER_Y, PLAN + 0.04), (L - 0.08, EVIER_Y, PLAN + 0.36), 0.013, M['noir'])
tube('bec', (L - 0.08, EVIER_Y, PLAN + 0.36), (L - 0.3, EVIER_Y, PLAN + 0.36), 0.011, M['noir'])
tube('bec bout', (L - 0.3, EVIER_Y, PLAN + 0.36), (L - 0.3, EVIER_Y, PLAN + 0.3), 0.011, M['noir'])
boite('plaque induction', (L - 0.33, PLAQUE_Y, PLAN + 0.042), (0.52, 0.6, 0.006), materiau_uni('vitrocéramique', '#0B0C0D', 0.08), 0.003)
for dy, dx, r in ((-0.14, -0.1, 0.09), (0.14, -0.1, 0.08), (-0.14, 0.12, 0.07), (0.14, 0.12, 0.1)):
    bpy.ops.mesh.primitive_torus_add(location=(L - 0.33 + dx, PLAQUE_Y + dy, PLAN + 0.046), major_radius=r, minor_radius=0.002)
    bpy.context.object.data.materials.append(materiau_uni('repère foyer', '#5A5E63', 0.5))
# Étagères ouvertes en chêne au-dessus du plan, ruban LED dessous ; vaisselle et bocaux.
for z in (1.48, 1.86):
    boite('étagère cuisine', (L - 0.14, -2.45, z), (0.26, 2.0, 0.035), M['chene'], 0.003)
    boite('LED cuisine', (L - 0.04, -2.45, z - 0.022), (0.01, 1.9, 0.006), M['led'])
CERAMIQUE = materiau_uni('assiettes', '#ECE8DF', 0.3)
for y in (-3.25, -2.97):
    for k in range(6):   # piles d'assiettes
        bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=0.012, location=(L - 0.15, y, 1.5 + 0.018 + k * 0.014), vertices=40)
        bpy.context.object.data.materials.append(CERAMIQUE)
importer_ph('ceramic_vase_01', (L - 0.15, -2.6, 1.497), echelle=0.45)
importer_ph('ceramic_vase_03', (L - 0.15, -2.35, 1.497), echelle=0.4)
importer_ph('potted_plant_04', (L - 0.14, -1.75, 1.497), echelle=0.95)
pile_sur(L - 0.15, -2.1, 1.877, 3, tourne=180)
importer_ph('wooden_bowl_01', (L - 0.15, -2.75, 1.877), echelle=0.6)
importer_ph('brass_vase_01', (L - 0.15, -3.2, 1.877), echelle=0.45)
boite('machine à café', (L - 0.3, -1.45, PLAN + 0.04 + 0.17), (0.3, 0.2, 0.34), NOIR_MAT, 0.01)
boite('planche à découper', (L - 0.05, -2.6, PLAN + 0.04 + 0.19), (0.02, 0.3, 0.38), M['noyer'], 0.006)

# Îlot : plateau chêne en « cascade » sur les côtés, caisson noir mat ; trois tabourets côté salon.
IX0, IX1, IY0, IY1 = 5.75, 6.7, -3.95, -1.65
boite('îlot caisson', ((IX0 + IX1) / 2 + 0.02, (IY0 + IY1) / 2, 0.45), (IX1 - IX0 - 0.1, IY1 - IY0 - 0.08, 0.9), NOIR_MAT, 0.003)
boite('îlot plateau', ((IX0 + IX1) / 2, (IY0 + IY1) / 2, PLAN + 0.02), (IX1 - IX0, IY1 - IY0, 0.04), M['chene'], 0.003)
for y in (IY0 + 0.02, IY1 - 0.02):
    boite('îlot cascade', ((IX0 + IX1) / 2, y, PLAN / 2), (IX1 - IX0, 0.04, PLAN), M['chene'], 0.003)
importer_ph('wooden_bowl_01', (6.25, -2.4, PLAN + 0.04), echelle=0.9)
importer_ph('potted_plant_04', (6.3, -3.4, PLAN + 0.04), echelle=1.1)
for y in (-3.3, -2.8, -2.3):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.18, depth=0.045, location=(IX0 - 0.38, y, 0.66), vertices=48)
    bpy.context.object.name = 'tabouret assise'; bpy.context.object.data.materials.append(M['chene']); bpy.ops.object.shade_smooth()
    for k in range(4):
        a = math.radians(45 + k * 90)
        tube('tabouret pied', (IX0 - 0.38 + 0.11 * math.cos(a), y + 0.11 * math.sin(a), 0.64),
             (IX0 - 0.38 + 0.2 * math.cos(a), y + 0.2 * math.sin(a), 0.0), 0.011, M['noir'])
    bpy.ops.mesh.primitive_torus_add(location=(IX0 - 0.38, y, 0.24), major_radius=0.17, minor_radius=0.008)
    bpy.context.object.data.materials.append(M['noir'])
# Deux suspensions coniques noires au-dessus de l'îlot.
DISQUE = materiau_uni('suspension cône', '#FFE6BD', emission='#FFC27A', force=10.0)
for y in (-3.25, -2.35):
    tube('câble suspension', (6.22, y, H), (6.22, y, 2.15), 0.003, M['noir'])
    bpy.ops.mesh.primitive_cone_add(radius1=0.16, radius2=0.025, depth=0.2, location=(6.22, y, 2.05), vertices=48, end_fill_type='NOTHING')
    o = bpy.context.object; o.name = 'suspension cône'; o.data.materials.append(M['noir']); bpy.ops.object.shade_smooth()
    o.modifiers.new('épaisseur', 'SOLIDIFY').thickness = 0.004
    bpy.ops.mesh.primitive_circle_add(radius=0.15, location=(6.22, y, 1.97), fill_type='NGON')
    bpy.context.object.data.materials.append(DISQUE)

# --- Le coin stream : un tapis anthracite sous le bureau et le siège.
boite('tapis setup', (2.1, -3.3, 0.006), (2.8, 2.2, 0.012), tissu('laine anthracite', '#3A3D40'))
# --- L'entrée (près de la porte, mur ouest) : console fine en chêne, miroir rond cerclé de laiton, vide-poche.
boite('console entrée', (0.17, 0.75, 0.78), (0.3, 1.1, 0.04), M['chene'], 0.003)
for y in (0.25, 1.25):
    boite('console pied', (0.17, y, 0.39), (0.26, 0.03, 0.78), M['noir'])
bpy.ops.mesh.primitive_cylinder_add(radius=0.36, depth=0.012, location=(0.012, 0.75, 1.55), rotation=(0, math.radians(90), 0), vertices=64)
bpy.context.object.name = 'miroir'; bpy.context.object.data.materials.append(materiau_uni('miroir', '#DADDE0', 0.02, 1.0))
bpy.ops.mesh.primitive_torus_add(location=(0.016, 0.75, 1.55), rotation=(0, math.radians(90), 0), major_radius=0.365, minor_radius=0.01)
bpy.context.object.data.materials.append(M['or'])
importer_ph('ceramic_vase_03', (0.17, 0.45, 0.8), echelle=0.7)
importer_ph('wooden_bowl_01', (0.17, 1.0, 0.8), echelle=0.6)
# --- L'ancien mur du bureau (ouest, côté salon) garde ses lames : un meuble bas en noyer, décoré, dessous.
SX0, SX1, SY0, SY1, SZ = 0.03, 0.46, 1.9, 4.1, 0.6
for y in (SY0 + 0.08, SY1 - 0.08):
    for x in (SX0 + 0.06, SX1 - 0.06):
        tube('pied meuble bas', (x, y, 0), (x, y, 0.14), 0.012, M['noir'])
boite('meuble bas', ((SX0 + SX1) / 2, (SY0 + SY1) / 2, 0.14 + (SZ - 0.14) / 2), (SX1 - SX0, SY1 - SY0, SZ - 0.14), M['noyer'], 0.004)
for i in range(54):
    yy = SY0 + 0.03 + (SY1 - SY0 - 0.06) * (i + 0.5) / 54
    tube('cannelure meuble bas', (SX1 + 0.004, yy, 0.165), (SX1 + 0.004, yy, SZ - 0.025), 0.017, M['chene'])
haut = pile_sur((SX0 + SX1) / 2, 2.35, SZ, 3)
importer_ph('ceramic_vase_02', ((SX0 + SX1) / 2, 2.35, haut), echelle=0.5)
importer_ph('standing_picture_frame_01', ((SX0 + SX1) / 2, 2.95, SZ), rotation_z=90)
importer_ph('brass_vase_01', ((SX0 + SX1) / 2 + 0.02, 3.4, SZ), echelle=0.7)
importer_ph('potted_plant_04', ((SX0 + SX1) / 2, 3.85, SZ), echelle=1.2)

# --- Le salon : canapé d'angle face à la TV, tapis teal, table basse, fauteuil.
# Le canapé d'angle regarde la TV : dossier à l'ouest (x 4,3), assise vers l'est, méridienne au nord
# (vers la baie). La table basse se glisse devant l'assise, au sud de la méridienne (40 cm de passage).
placer('canape', (5.6, 3.0, 0), 2.8, 'max', rotation_z=0, matiere=M['canape'])
scene.objects['canape'].scale.z *= 1.25   # modèle très bas : assise et dossier remis à hauteur normale
boite('tapis', (6.0, 3.0, 0.006), (3.0, 3.4, 0.012), M['tapis'])
importer_ph('coffee_table_round_01', (6.05, 2.45, 0), echelle=0.8)
importer_ph('wooden_bowl_01', (5.85, 2.55, 0.39))
importer_ph('ceramic_vase_02', (6.25, 2.7, 0.39), echelle=0.6)
haut = 0.39
for k, c in enumerate(('#1D2733', '#E6DED0')):   # deux beaux livres empilés
    boite('beau livre', (6.15, 2.25, haut + 0.016), (0.3, 0.24, 0.032), COUVERTURES[k * 4], 0.003); haut += 0.032
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
dossier = scene.ray_cast(dg, Vector((6.5, 2.4, 0.5)), Vector((-1, 0, 0)))[1].x     # face avant du dossier
assise = scene.ray_cast(dg, Vector((dossier + 0.3, 2.4, 1.5)), Vector((0, 0, -1)))[1].z   # dessus de l'assise
coussins = importer_ph('throw_pillows_01', (dossier + 0.2, 2.4, assise - 0.015), rotation_z=90)
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
tv = placer('tv', (L - 0.06, 3.0, 0.95), 1.9, 'max', rotation_z=-90, sans=('Table',))
# La dalle d'origine est noyée dans le cadre : une vraie dalle juste devant, qui diffuse le programme
# (tv/programme.py : paysages en travelling) et s'allume / s'éteint selon TV_ALLUMEE.
bpy.context.view_layer.update()
boite_monde = lambda o: [o.matrix_world @ Vector(c) for c in o.bound_box]
dalle0 = next(o for o in tv.children_recursive if 'TVScreen' in o.name); dalle0.hide_render = True
pts = boite_monde(dalle0)
cadre_x = min(p.x for p in boite_monde(next(o for o in tv.children_recursive if 'TVFramework' in o.name)))
y0, y1 = min(p.y for p in pts), max(p.y for p in pts); z0, z1 = min(p.z for p in pts), max(p.z for p in pts)
bpy.ops.mesh.primitive_plane_add(size=1, location=(cadre_x - 0.0008, (y0 + y1) / 2, (z0 + z1) / 2), rotation=(math.radians(90), 0, math.radians(-90)))
ecran_tv = bpy.context.object; ecran_tv.name = 'dalle TV'; ecran_tv.scale = (y1 - y0, z1 - z0, 1)
TELE = bpy.data.materials.new('dalle TV'); nt = TELE.node_tree; b = nt.nodes['Principled BSDF']
b.inputs['Base Color'].default_value = (0.004, 0.004, 0.005, 1); b.inputs['Roughness'].default_value = 0.1   # OLED éteint : noir brillant
film = os.path.join(ASSETS, 'tv', 'programme.mp4')
if not os.path.exists(film):   # sans ffmpeg, le programme reste en images
    film = os.path.join(ASSETS, 'tv', 'images', '0000.jpg')
if os.path.exists(film):
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(film)
    if film.endswith('.jpg'):
        tex.image.source = 'SEQUENCE'
    tex.image_user.frame_duration, tex.image_user.frame_start = int(DUREE * FPS), 0
    tex.image_user.use_auto_refresh = tex.image_user.use_cyclic = True
    nt.links.new(tex.outputs['Color'], b.inputs['Emission Color'])
etats = [(0.0, 0.0)]
for t0, t1 in TV_ALLUMEE:   # allumage en 0,35 s, extinction en 0,25 s
    etats += [(t0, 0.0), (t0 + 0.35, 1.0), (t1, 1.0), (t1 + 0.25, 0.0)]
for t, v in etats:
    b.inputs['Emission Strength'].default_value = v
    b.inputs['Emission Strength'].keyframe_insert('default_value', frame=t * FPS)
ecran_tv.data.materials.append(TELE)
boite('barre de son', (L - 0.2, 3.0, MZ + 0.035), (0.1, 0.9, 0.07), M['noir'], 0.012)
placer('ps5', (L - 0.24, MY0 + 0.2, MZ), 0.47, 'z', rotation_z=-90, sans=('Plane', 'Digital'))   # 41 cm en vrai : un peu agrandie pour se lire à l'image
placer('xbox', (L - 0.24, MY1 - 0.2, MZ), 0.35, 'z', rotation_z=-90)   # 30 cm en vrai, idem
placer('switch', (L - 0.22, 3.75, MZ), 0.32, 'x', rotation_z=-90)
importer_ph('ceramic_vase_01', (L - 0.3, 2.35, MZ), echelle=0.6)

# --- Plantes, luminaires.
placer('plante', (7.42, 5.42, 0), 1.25, 'z', rotation_z=30)
placer('plante', (0.58, 5.62, 0), 0.85, 'z', rotation_z=-20)
importer_ph('potted_plant_02', (4.0, SUD + 0.4, 0))
placer('lampadaire', (7.5, 0.48, 0), 1.6, 'z')
# Suspensions au-dessus de la table basse (le modèle va de 0,22 à 1,17 m au-dessus de son origine) ;
# le globe devient lumineux, c'est lui qu'on voit (et qui se reflète dans la baie).
GLOBE = materiau_uni('globe opalin', '#FFF4E2', 0.3, emission='#FFC27A', force=12.0)
for y in (2.45,):   # une seule suspension, centrée sur la table basse
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
    brique.inputs['Mortar Size'].default_value = 0.6
    brique.inputs['Color1'].default_value = (1, 1, 1, 1); brique.inputs['Color2'].default_value = (0, 0, 0, 1)
    brique.inputs['Mortar'].default_value = (0, 0, 0, 1)
    brique.offset = 0.0
    # La texture brique est plane (x, y) : on la déplie sur les façades (largeur = x + y, hauteur = z).
    sep_v = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(coord.outputs['Object'], sep_v.inputs['Vector'])
    somme = nt.nodes.new('ShaderNodeMath'); somme.operation = 'ADD'
    nt.links.new(sep_v.outputs['X'], somme.inputs[0]); nt.links.new(sep_v.outputs['Y'], somme.inputs[1])
    deplie = nt.nodes.new('ShaderNodeCombineXYZ')
    nt.links.new(somme.outputs['Value'], deplie.inputs['X']); nt.links.new(sep_v.outputs['Z'], deplie.inputs['Y'])
    nt.links.new(deplie.outputs['Vector'], brique.inputs['Vector'])
    # La sortie Fac donne une valeur au hasard par brique : on n'allume qu'une fenêtre sur cinq environ.
    seuil = nt.nodes.new('ShaderNodeMath'); seuil.operation = 'GREATER_THAN'; seuil.inputs[1].default_value = 0.8   # à cette heure, une fenêtre sur cinq est allumée
    nt.links.new(brique.outputs['Color'], seuil.inputs[0])   # valeur au hasard par fenêtre
    hors_joint = nt.nodes.new('ShaderNodeMath'); hors_joint.operation = 'SUBTRACT'; hors_joint.inputs[0].default_value = 1.0
    nt.links.new(brique.outputs['Fac'], hors_joint.inputs[1])   # Fac vaut 1 sur le joint : la vitre, c'est 1 - Fac
    vitre = nt.nodes.new('ShaderNodeMath'); vitre.operation = 'MULTIPLY'
    nt.links.new(seuil.outputs['Value'], vitre.inputs[0]); nt.links.new(hors_joint.outputs['Value'], vitre.inputs[1])
    vitre2 = nt.nodes.new('ShaderNodeMath'); vitre2.operation = 'MULTIPLY'; vitre2.inputs[1].default_value = 4.0
    nt.links.new(vitre.outputs['Value'], vitre2.inputs[0]); vitre = vitre2
    geo = nt.nodes.new('ShaderNodeNewGeometry'); sep_n = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(geo.outputs['Normal'], sep_n.inputs['Vector'])
    toit = nt.nodes.new('ShaderNodeMath'); toit.operation = 'LESS_THAN'; toit.inputs[1].default_value = 0.5   # pas de fenêtres sur les toits
    nt.links.new(sep_n.outputs['Z'], toit.inputs[0])
    vitre3 = nt.nodes.new('ShaderNodeMath'); vitre3.operation = 'MULTIPLY'
    nt.links.new(vitre.outputs['Value'], vitre3.inputs[0]); nt.links.new(toit.outputs['Value'], vitre3.inputs[1]); vitre = vitre3
    nt.links.new(vitre.outputs['Value'], b.inputs['Emission Strength'])
    b.inputs['Emission Color'].default_value = hexa('#FFC870')
    froid = nt.nodes.new('ShaderNodeMath'); froid.operation = 'GREATER_THAN'; froid.inputs[1].default_value = 0.93   # quelques bureaux en blanc froid
    nt.links.new(brique.outputs['Color'], froid.inputs[0])
    teinte = nt.nodes.new('ShaderNodeMix'); teinte.data_type = 'RGBA'
    teinte.inputs['A'].default_value = hexa('#FFC870'); teinte.inputs['B'].default_value = hexa('#DCE6F5')
    nt.links.new(froid.outputs['Value'], teinte.inputs['Factor']); nt.links.new(teinte.outputs['Result'], b.inputs['Emission Color'])
    b.inputs['Emission Strength'].default_value = 0.0
    melange = nt.nodes.new('ShaderNodeMix'); melange.data_type = 'RGBA'
    melange.inputs['A'].default_value = hexa('#0D1117'); melange.inputs['B'].default_value = hexa('#2A2F38')   # vitres sombres, façade plus claire
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

# --- Dehors : le balcon (dalle, garde-corps vitré, deux appliques) et la façade de l'immeuble autour de la
# baie, avec les fenêtres des voisins (même matière que la ville, en partie allumées).
DALLE = materiau_uni('dalle balcon', '#3B3E42', 0.8, bosse=0.03)
boite('balcon', (L / 2, P + 0.8, -0.12), (L + 0.4, 1.6, 0.24), DALLE)
boite('balcon garde-corps', (L / 2, P + 1.55, 0.55), (L + 0.4, 0.015, 1.0), M['verre'])
boite('balcon main courante', (L / 2, P + 1.55, 1.07), (L + 0.4, 0.05, 0.04), M['noir'], 0.005)
for x in (-0.15, L + 0.15):
    boite('balcon poteau', (x, P + 1.55, 0.55), (0.05, 0.05, 1.1), M['noir'])
FACADE = bpy.data.materials['façades']
for nom, c, t in (('façade gauche', (-9.0, P + 0.2, -10.0), (18.0, 0.4, 32.0)), ('façade droite', (L + 9.0, P + 0.2, -10.0), (18.0, 0.4, 32.0)),
                  ('façade haut', (L / 2, P + 0.2, H + 5.0), (L, 0.4, 10.0)), ('façade bas', (L / 2, P + 0.2, -13.0), (L, 0.4, 26.0))):
    boite(nom, c, t, FACADE)
APPLIQUE = materiau_uni('applique', '#FFE2B0', emission='#FFC27A', force=8.0)
for x in (0.3, L - 0.3):
    boite('applique balcon', (x, P + 0.43, 2.2), (0.08, 0.06, 0.22), M['noir'], 0.004)
    boite('applique balcon verre', (x, P + 0.465, 2.2), (0.05, 0.01, 0.16), APPLIQUE)
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
lumiere('suspension', 'POINT', (6.05, 2.45, 2.05), 70, '#FFC27A', 0.1)
for x in (0.3, L - 0.3):   # appliques du balcon : deux cônes doux sur la façade
    lumiere('applique balcon', 'SPOT', (x, P + 0.5, 2.15), 8, '#FFC27A', 0.03, (180, 0, 0), cone=110)
lumiere('lampe à poser', 'POINT', (4.55, 1.2, 0.92), 25, '#FFB866', 0.05)
lumiere('lampadaire', 'POINT', (7.5, 0.48, 1.45), 110, '#FFB866', 0.12)
# Spots encastrés : cônes doux dans le salon ; dans l'extension, ils lèchent les lames du décor et les affiches.
for x, y in ((1.2, 1.8), (1.2, 4.2), (3.4, 0.6), (7.2, 4.6), (0.9, SUD + 0.45), (3.3, SUD + 0.45), (2.1, -2.4),
             (5.1, SUD + 0.6), (6.1, SUD + 0.6), (4.6, -1.0)):
    lumiere('spot', 'SPOT', (x, y, H - 0.02), 40, '#FFD29A', 0.05, (0, 0, 0), cone=60)
for nom, yc in (('Avengers', 1.05), ('Rick et Morty', 4.95)):   # ruban LED sous chaque planche du décor
    for z in NIVEAUX:
        d = lumiere('LED étagère', 'AREA', ETAGERES[nom] @ Vector((0.27, yc, z - EP / 2 - 0.01)), 7, '#FFC680', 1.0, (0, 0, 180))
        d.shape, d.size_y = 'RECTANGLE', 0.04
for z, r, c in ((1.9, 7, '#FFC24A'), (1.58, 3, '#3FD3C2')):   # le néon éclaire le mur derrière lui : halo rond et doux
    lumiere('lueur néon', 'POINT', (NEON_X, SUD + 0.32, z), r, c, 0.3)
for y in (-3.25, -2.35):   # suspensions de l'îlot
    lumiere('suspension îlot', 'SPOT', (6.22, y, 1.98), 35, '#FFC27A', 0.06, (0, 0, 0), cone=95)
for z in (1.48, 1.86):     # LED sous les étagères de la cuisine
    d = lumiere('LED cuisine', 'AREA', (L - 0.06, -2.45, z - 0.03), 6, '#FFC680', 1.9, (0, 0, 0))
    d.shape, d.size_y = 'RECTANGLE', 0.04
lumiere('écrans', 'AREA', SETUP @ Vector((0.45, 3.0, 1.1)), 18, '#8FB8D8', 0.8, (0, -90, -90))
vise_kl = (VISAGE - KL_PANNEAU).to_track_quat('-Z', 'Y').to_euler()
lumiere('key light', 'AREA', KL_PANNEAU + (VISAGE - KL_PANNEAU).normalized() * 0.03, 25, '#FFF1DC', 0.33,
        [math.degrees(a) for a in vise_kl])
lumiere('TV (rétroéclairage)', 'AREA', (L - 0.08, 3.0, 1.55), 30, '#E0A93B', 1.6, (0, 90, 0))   # halo doré sur le mur teal
reflet_tv = lumiere('TV (reflet)', 'AREA', (L - 0.2, 3.0, 1.5), 0, '#B8C8DC', 1.8, (0, 90, 0))   # la lueur de l'écran allumé
for t, v in etats:
    reflet_tv.energy = v * 14; reflet_tv.keyframe_insert('energy', frame=t * FPS)


# ------------------------------------------------------------------ caméras d'aperçu

def camera(nom, position, cible, focale=24):
    c = bpy.data.objects.new(nom, bpy.data.cameras.new(nom)); scene.collection.objects.link(c)
    c.data.lens = focale
    c.location = position
    c.rotation_euler = (Vector(cible) - Vector(position)).to_track_quat('-Z', 'Y').to_euler()
    return c


v = lambda nom, p: tuple(DEPLACEMENTS[nom] @ Vector(p))   # points des blocs déplacés
CAMS = {
    'porte': camera('porte', (1.2, 0.5, 1.6), (5.0, 4.4, 1.0), 22),
    'salon': camera('salon', (3.4, 3.0, 1.6), (L, 3.0, 1.0), 24),
    'canape': camera('canape', (7.4, 4.9, 1.7), (4.8, 2.4, 0.6), 24),
    'etag_sud': camera('etag_sud', v('Avengers', (1.5, 1.05, 1.45)), v('Avengers', (0.1, 1.05, 1.45)), 30),
    'etag_nord': camera('etag_nord', v('Rick et Morty', (1.5, 4.95, 1.45)), v('Rick et Morty', (0.1, 4.95, 1.45)), 30),
    'decor': camera('decor', (2.1, -1.2, 1.7), (2.1, SUD, 1.5), 24),
    'cuisine': camera('cuisine', (3.6, 0.6, 1.65), (7.2, -3.4, 0.9), 24),
    'coin_ne': camera('coin_ne', (7.35, 5.35, 1.75), (2.0, 1.4, 0.9), 20),
    'micro': camera('micro', v('setup', (1.05, 3.15, 1.2)), v('setup', (0.8, 3.4, 1.2)), 45),
    'dehors': camera('dehors', (3.5, 10.0, 2.2), (3.6, 4.0, 1.3), 24),
    'evier': camera('evier', (7.05, -1.45, 1.55), (7.67, -1.95, 0.82), 32),
    'vue_sud': camera('vue_sud', (6.6, 4.9, 1.85), (2.6, -3.6, 0.9), 18),
    'vue_nord': camera('vue_nord', (5.2, -4.3, 1.75), (3.6, 5.5, 1.1), 18),
    'tv_face': camera('tv_face', (4.35, 3.0, 1.52), (8.0, 3.0, 1.45), 30),
    'console': camera('console', (6.95, 1.55, 0.85), (7.75, 1.95, 0.6), 30),
    'setup': camera('setup', v('setup', (1.55, 3.55, 1.45)), v('setup', (0.35, 2.85, 0.95)), 26),
    'affiches': camera('affiches', (4.6, 3.2, 1.6), (4.6, 0.0, 1.55), 30),
    'bureau': camera('bureau', v('setup', (2.6, 3.0, 1.45)), v('setup', (0.2, 3.0, 1.2)), 30),
    'baie': camera('baie', (6.5, 1.2, 1.5), (3.0, 6.0, 1.3), 24),
    'etageres': camera('etageres', (2.1, -0.6, 1.55), (2.1, SUD, 1.4), 30),
}
cd = camera('dessus', (L / 2, YC, 14), (L / 2 + 0.001, YC, 0)); cd.data.type = 'ORTHO'; cd.data.ortho_scale = (PROF + 0.4) * 16 / 9
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
if 'clip' in opt:   # un clip du pack : caméras animées et coupes (blender/<clip>.py)
    sys.path.insert(0, ICI); import importlib
    PLANS_CLIP = importlib.import_module(opt['clip']).monter(scene, FPS)
if opt.get('gpu') == '1':   # rendu sur carte graphique (PC du client) : OptiX, CUDA, HIP, oneAPI ou Metal
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for genre in ('OPTIX', 'CUDA', 'HIP', 'ONEAPI', 'METAL'):
        try:
            prefs.compute_device_type = genre
        except TypeError:
            continue
        prefs.refresh_devices()
        cartes = [d for d in prefs.devices if d.type == genre]
        if cartes:
            for d in prefs.devices:
                d.use = d.type == genre
            scene.cycles.device = 'GPU'; print('GPU :', genre, [d.name for d in cartes]); break
if 'film' in opt:   # rendu final, image par image (PNG) ; relancé, il reprend où il s'était arrêté
    scene.render.use_motion_blur, scene.render.motion_blur_shutter = True, 0.5
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = os.path.join(os.path.abspath(opt['film']), 'i')
    scene.render.use_overwrite, scene.render.use_placeholder = False, True
    bpy.ops.render.render(animation=True)
    sys.exit(0)
if 'animatique' in opt:   # prévisualisation rapide des mouvements (Workbench, 480 × 270, 10 i/s), titres des plans incrustés
    import shutil, subprocess, tempfile
    scene.render.engine = 'BLENDER_WORKBENCH'
    for o in scene.objects:   # Workbench ne sait pas rendre le verre : on le retire de l'aperçu
        if o.type == 'MESH' and any(m and m.name.startswith('verre') for m in o.data.materials):
            o.hide_render = True
    scene.display.shading.light, scene.display.shading.color_type = 'STUDIO', 'TEXTURE'
    scene.render.resolution_x, scene.render.resolution_y, scene.frame_step = 480, 270, 3
    dossier = tempfile.mkdtemp(); scene.render.filepath = os.path.join(dossier, 'i')
    scene.render.image_settings.file_format = 'PNG'
    bpy.ops.render.render(animation=True)
    police = os.path.join(ICI, '..', 'da', 'Rubik-2.ttf').replace(':', '\\:')
    titres = ','.join(f"drawtext=fontfile={police}:text='{n}':x=12:y=12:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.5:"
                      f"enable='between(t,{d},{fin})'" for (n, d), fin in zip(PLANS_CLIP, [p[1] for p in PLANS_CLIP[1:]] + [DUREE]))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS // 3), '-pattern_type', 'glob', '-i', os.path.join(dossier, 'i*.png'),
                    '-vf', titres, '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', os.path.abspath(opt['animatique'])], check=True)
    shutil.rmtree(dossier); sys.exit(0)
scene.frame_set(int(opt.get('image', 360)))   # image fixe : à 12 s, la TV est allumée
if 'coins_tv' in opt:   # où tombe l'écran de la TV dans l'image (pour y caler une source dans OBS)
    from bpy_extras.object_utils import world_to_camera_view
    bpy.context.view_layer.update()
    d = scene.objects['dalle TV']
    for c in [d.matrix_world @ Vector((x, y, 0)) for x, y in ((-0.5, -0.5), (0.5, -0.5), (0.5, 0.5), (-0.5, 0.5))]:
        p = world_to_camera_view(scene, scene.camera, c)
        print('COIN', round(p.x * scene.render.resolution_x, 1), round((1 - p.y) * scene.render.resolution_y, 1))
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
