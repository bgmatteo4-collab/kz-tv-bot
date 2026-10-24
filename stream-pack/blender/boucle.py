"""La boucle d'attente (30 s) : un drone entre par la baie, quatre plans sur les objets, et le drone ressort ;
la dernière image retombe sur la première (même position, vitesse nulle), la boucle est invisible.
Appelé par piece.py :  --clip boucle  [--animatique sortie.mp4]  [--film dossier/]"""
import math

import bpy
from mathutils import Vector

# Chaque plan : (nom, début en s, focale, [(temps, position caméra, point visé), ...]).
# Le drone (plans 1 et 5) est une seule caméra : ses clés de 21 s à 30 s rejoignent celles de 0 s.
DRONE = [
    (0.0, (3.5, 10.5, 2.6), (3.5, 4.0, 1.2)),     # dehors, face à la façade : le loft éclairé derrière la baie
    (3.0, (3.5, 8.0, 1.85), (3.5, 3.5, 1.2)),     # au-dessus du balcon
    (4.6, (3.5, 6.0, 1.6), (4.5, 3.0, 1.2)),      # passage par le coulissant ouvert
    (6.8, (4.9, 4.7, 1.45), (7.9, 3.0, 1.45)),    # au-dessus du canapé, la TV s'allume
    (8.5, (5.7, 3.8, 1.38), (7.9, 3.0, 1.4)),
    (20.5, (1.6, -2.0, 1.9), (3.5, 6.0, 1.6)),    # depuis le coin stream, cap sur la baie
    (23.5, (3.0, 2.0, 1.75), (3.5, 12.0, 2.0)),   # le long du canapé
    (25.5, (3.5, 6.1, 1.8), (3.5, 14.0, 2.4)),    # sortie par le coulissant
    (27.3, (3.6, 8.6, 2.3), (4.5, 13.0, 2.5)),    # la ville
    (28.6, (3.8, 9.8, 2.5), (7.5, 10.0, 2.3)),    # demi-tour
    (30.0, (3.5, 10.5, 2.6), (3.5, 4.0, 1.2)),    # = image 0
]
PLANS = [
    ('1 · entrée du drone', 0.0, 'drone', 20),
    # La cuisine : travelling le long de l'îlot, des tabourets vers les affiches.
    ('2 · la cuisine', 8.5, [(8.5, (4.6, -0.9, 1.55), (6.6, -2.4, 1.0)), (12.5, (4.7, -2.3, 1.5), (6.6, -4.9, 1.3))], 26),
    # Le décor du stream : on longe les étagères Avengers et le néon se dévoile.
    ('3 · le décor et le néon', 12.5, [(12.5, (3.95, -3.55, 1.78), (2.9, -4.95, 1.75)), (16.5, (3.25, -3.15, 1.72), (1.7, -4.95, 1.7))], 26),
    # Gros plan : l'étagère Rick et Morty et le gant de l'Infini.
    ('4 · Rick et Morty', 16.5, [(16.5, (1.45, -4.05, 1.42), (1.1, -4.95, 1.32)), (20.5, (0.6, -4.0, 1.38), (0.6, -4.95, 1.28))], 30),
    ('5 · sortie du drone', 20.5, 'drone', 20),
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


def monter(scene, fps):
    drone = camera_animee(scene, 'drone', DRONE, 20, fps)
    for nom, debut, cles, focale in PLANS:
        cam = drone if cles == 'drone' else camera_animee(scene, nom, cles, focale, fps)
        scene.timeline_markers.new(nom, frame=int(round(debut * fps))).camera = cam
    scene.camera = drone
    return [(nom, debut) for nom, debut, *_ in PLANS]
