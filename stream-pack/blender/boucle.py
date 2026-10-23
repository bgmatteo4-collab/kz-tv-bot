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
    (4.8, (3.5, 6.0, 1.6), (4.5, 3.0, 1.2)),      # passage par le coulissant ouvert
    (7.0, (4.9, 4.7, 1.45), (7.9, 3.0, 1.45)),    # au-dessus du canapé, la TV s'allume
    (9.5, (5.9, 3.7, 1.35), (7.9, 3.0, 1.4)),
    (21.0, (1.5, 3.6, 1.6), (3.5, 6.0, 1.6)),     # depuis le bureau, cap sur la baie
    (23.5, (2.9, 5.0, 1.65), (3.5, 12.0, 2.0)),
    (25.0, (3.5, 6.1, 1.7), (3.5, 14.0, 2.4)),    # sortie par le coulissant
    (27.0, (3.6, 8.6, 2.3), (4.5, 13.0, 2.5)),    # la ville
    (28.5, (3.8, 9.8, 2.5), (7.5, 10.0, 2.3)),    # demi-tour
    (30.0, (3.5, 10.5, 2.6), (3.5, 4.0, 1.2)),    # = image 0
]
PLANS = [
    ('1 · entrée du drone', 0.0, 'drone', 20),
    ('2 · étagère Avengers', 9.5, [(9.5, (0.95, 0.55, 1.72), (0.15, 0.75, 1.72)), (13.5, (0.95, 1.35, 1.7), (0.15, 1.45, 1.66))], 35),
    ('3 · étagère Rick et Morty', 13.5, [(13.5, (1.0, 5.35, 1.38), (0.15, 5.2, 1.3)), (17.0, (1.0, 4.65, 1.45), (0.15, 4.55, 1.3))], 35),
    ('4 · le setup', 17.0, [(17.0, (2.05, 3.45, 1.55), (0.3, 2.95, 1.12)), (21.0, (1.45, 3.25, 1.4), (0.3, 2.9, 1.1))], 28),
    ('5 · sortie du drone', 21.0, 'drone', 20),
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
