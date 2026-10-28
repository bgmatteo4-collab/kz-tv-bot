"""L'intro de lancement du live (12 s) : « l'allumage ». Le studio est éteint côté décor, le néon KAYZX TV
grésille et s'allume, puis on découvre le setup et le coin stream en plan large.
Appelé par piece.py :  --clip intro  [--animatique sortie.mp4]  [--film dossier/]"""
import math

import bpy

DUREE = 12.0

# Chaque plan : (nom, début en s, [(temps, position caméra, point visé), ...], focale).
PLANS = [
    ('1 · le néon s\'allume', 0.0, [
        (0.0, (2.55, -3.05, 1.82), (2.3, -4.95, 1.78)),      # tout près du mur, le néon éteint occupe le cadre
        (4.0, (2.2, -3.35, 1.76), (2.0, -4.95, 1.74)),       # dérive lente vers la gauche
    ], 50),
    ('2 · le setup', 4.0, [
        (4.0, (1.15, -4.05, 1.52), (1.75, -2.75, 1.12)),     # derrière l'épaule, les écrans allumés
        (7.5, (1.45, -3.65, 1.34), (1.8, -2.75, 1.08)),
    ], 30),
    ('3 · le coin stream', 7.5, [
        (7.5, (3.05, -2.75, 1.70), (2.3, -4.95, 1.70)),      # recul lent : le décor entier, néon allumé
        (12.0, (3.75, -1.35, 1.86), (2.3, -4.95, 1.72)),
    ], 24),
]

# Grésillement du néon : (temps, intensité). 0 = éteint, 1 = plein régime.
ALLUMAGE = [
    (0.0, 0.0), (1.30, 0.0), (1.34, 0.9), (1.38, 0.05), (1.46, 0.7), (1.50, 0.0),
    (1.78, 0.0), (1.82, 1.0), (1.88, 0.15), (1.94, 1.0), (2.60, 1.0), (DUREE, 1.0),
]


def camera_animee(scene, nom, cles, focale, fps):
    cam = bpy.data.objects.new(nom, bpy.data.cameras.new(nom)); scene.collection.objects.link(cam)
    cam.data.lens = focale; cam.data.clip_start = 0.02
    cible = bpy.data.objects.new(nom + ' (visée)', None); scene.collection.objects.link(cible)
    contrainte = cam.constraints.new('TRACK_TO'); contrainte.target = cible
    contrainte.track_axis, contrainte.up_axis = 'TRACK_NEGATIVE_Z', 'UP_Y'
    for t, pos, vise in cles:
        cam.location, cible.location = pos, vise
        cam.keyframe_insert('location', frame=t * fps); cible.keyframe_insert('location', frame=t * fps)
    return cam


def allumer_neon(scene, fps):
    """Le néon et son halo suivent ALLUMAGE : clés en CONSTANT pour que le grésillement claque, net."""
    tubes = [(m, m.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value)
             for m in bpy.data.materials if m.name.startswith('néon ') and m.node_tree]
    halos = [(o.data, o.data.energy) for o in scene.objects if o.name.startswith('lueur néon')]
    for t, k in ALLUMAGE:
        frame = round(t * fps)
        dur = k > 0.5 and t > 2.0   # une fois allumé pour de bon, on repasse en fondu doux
        for m, plein in tubes:
            e = m.node_tree.nodes['Principled BSDF'].inputs['Emission Strength']
            e.default_value = plein * k
            e.keyframe_insert('default_value', frame=frame)
            fc = m.node_tree.animation_data.action.fcurves[-1]
            for p in fc.keyframe_points:
                if abs(p.co[0] - frame) < 0.01:
                    p.interpolation = 'BEZIER' if dur else 'CONSTANT'
        for d, plein in halos:
            d.energy = plein * k
            d.keyframe_insert('energy', frame=frame)
            for fc in d.animation_data.action.fcurves:
                for p in fc.keyframe_points:
                    if abs(p.co[0] - frame) < 0.01:
                        p.interpolation = 'BEZIER' if dur else 'CONSTANT'


def monter(scene, fps):
    scene.frame_end = int(DUREE * fps) - 1
    allumer_neon(scene, fps)
    for nom, debut, cles, focale in PLANS:
        cam = camera_animee(scene, nom, cles, focale, fps)
        scene.timeline_markers.new(nom, frame=int(round(debut * fps))).camera = cam
        if debut == 0.0:
            scene.camera = cam
    return [(nom, debut) for nom, debut, *_ in PLANS]
