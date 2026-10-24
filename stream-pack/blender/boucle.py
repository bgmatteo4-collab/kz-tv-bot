"""La boucle d'attente (60 s) : un drone entre par la baie, six plans posés sur le salon, la cuisine, le décor du stream
et le setup, puis le drone ressort ; la dernière image retombe sur la première (même position, vitesse nulle).
Appelé par piece.py :  --clip boucle  [--animatique sortie.mp4]  [--film dossier/]"""
import math

import bpy
from mathutils import Vector

# Chaque plan : (nom, début en s, [(temps, position caméra, point visé), ...] ou 'drone', focale).
# Le drone (plans 1 et 8) est une seule caméra : ses clés de 51 s à 60 s rejoignent celles de 0 s.
DRONE = [
    (0.0, (3.5, 11.0, 2.8), (3.5, 4.0, 1.2)),     # dehors, face à la façade : le loft éclairé derrière la baie
    (4.0, (3.5, 9.0, 2.2), (3.5, 3.5, 1.2)),      # approche lente au-dessus du balcon
    (6.5, (3.5, 7.2, 1.75), (3.5, 3.0, 1.2)),
    (8.0, (3.5, 6.0, 1.6), (4.2, 2.5, 1.2)),      # passage par le coulissant ouvert
    (11.0, (4.7, 4.6, 1.45), (7.9, 3.0, 1.45)),   # au-dessus du canapé, la TV s'allume (10,5 s)
    (14.0, (5.6, 3.7, 1.35), (7.9, 3.0, 1.45)),
    (51.0, (1.6, -2.0, 1.9), (3.5, 6.0, 1.6)),    # depuis le coin stream, cap sur la baie
    (54.0, (3.0, 2.0, 1.75), (3.5, 12.0, 2.0)),   # le long du canapé
    (56.0, (3.5, 6.1, 1.8), (3.5, 14.0, 2.4)),    # sortie par le coulissant
    (57.8, (3.6, 8.6, 2.3), (4.5, 13.0, 2.5)),    # la ville
    (59.0, (3.8, 10.2, 2.6), (7.5, 10.5, 2.4)),   # demi-tour
    (60.0, (3.5, 11.0, 2.8), (3.5, 4.0, 1.2)),    # = image 0
]
PLANS = [
    ('1 · entrée du drone', 0.0, 'drone', 20),
    ('2 · le salon', 14.0, [(14.0, (3.9, 0.5, 1.05), (7.0, 3.6, 1.0)), (21.0, (3.95, 1.0, 1.55), (7.5, 3.2, 1.2))], 26),
    ('3 · la cuisine', 21.0, [(21.0, (4.6, -0.9, 1.55), (6.6, -2.4, 1.0)), (29.0, (4.7, -2.6, 1.45), (6.8, -4.9, 1.2))], 26),
    ('4 · le décor et le néon', 29.0, [(29.0, (4.1, -3.8, 1.85), (2.9, -4.95, 1.75)), (36.0, (3.6, -3.55, 1.8), (1.7, -4.95, 1.7))], 26),
    ('5 · étagère Avengers', 36.0, [(36.0, (3.9, -3.95, 1.85), (3.7, -4.95, 1.8)), (41.0, (2.9, -3.95, 1.82), (2.75, -4.95, 1.76))], 30),
    ('6 · Rick et Morty', 41.0, [(41.0, (1.45, -4.05, 1.42), (1.1, -4.95, 1.32)), (46.0, (0.55, -4.0, 1.38), (0.6, -4.95, 1.28))], 30),
    ('7 · le setup', 46.0, [(46.0, (1.0, -4.15, 1.5), (1.6, -2.75, 1.15)), (51.0, (1.3, -3.75, 1.32), (1.7, -2.75, 1.1))], 30),
    ('8 · sortie du drone', 51.0, 'drone', 20),
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
