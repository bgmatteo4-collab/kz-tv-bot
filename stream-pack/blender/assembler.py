"""Assemble les images rendues en MP4, avec le grain film doux de la DA (sur tout le pack), dans Blender
(aucun autre logiciel) : un calque de grain animé est posé en incrustation sur les images.
    blender -b -P stream-pack/blender/assembler.py -- --images dossier/ --sortie clip.mp4 [--grain 0.12]"""
import glob
import os
import sys

import bpy
import numpy as np

args = sys.argv[sys.argv.index('--') + 1:]
opt = {args[i].lstrip('-'): args[i + 1] for i in range(0, len(args) - 1, 2)}
images = sorted(glob.glob(os.path.join(opt['images'], 'i*.png')))
assert images, 'aucune image à assembler'
FPS = int(opt.get('fps', 30))

scene = bpy.data.scenes.new('montage'); bpy.context.window.scene = scene if bpy.context.window else None
premiere = bpy.data.images.load(images[0]); w, h = premiere.size; bpy.data.images.remove(premiere)
scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = w, h, 100
scene.render.fps, scene.frame_start, scene.frame_end = FPS, 1, len(images)
scene.view_settings.view_transform, scene.view_settings.look = 'Standard', 'None'   # les PNG sont déjà étalonnés

# Grain : 24 tirages de bruit gris centré sur 0,5 (neutre en incrustation), qui tournent en boucle.
dossier_grain = os.path.join(opt['images'], 'grain'); os.makedirs(dossier_grain, exist_ok=True)
alea = np.random.default_rng(3)
grains = []
for k in range(24):
    chemin = os.path.join(dossier_grain, f'g{k:02d}.png')
    if not os.path.exists(chemin):
        g = np.clip(0.5 + alea.normal(0, 0.18, (h, w)), 0, 1).astype(np.float32)
        img = bpy.data.images.new(f'grain {k}', w, h)
        rgba = np.ones((h, w, 4), np.float32); rgba[..., :3] = g[::-1, :, None]   # Blender range les lignes de bas en haut
        img.pixels.foreach_set(rgba.ravel())
        img.filepath_raw, img.file_format = chemin, 'PNG'; img.save(); bpy.data.images.remove(img)
    grains.append(chemin)

ed = scene.sequence_editor_create()
pistes = ed.strips if hasattr(ed, 'strips') else ed.sequences
film = pistes.new_image('film', images[0], channel=1, frame_start=1)
for f in images[1:]:
    film.elements.append(os.path.basename(f))
grain = pistes.new_image('grain', grains[0], channel=2, frame_start=1)
for k in range(1, len(images)):
    grain.elements.append(os.path.basename(grains[k % len(grains)]))
grain.directory = dossier_grain + os.sep
grain.blend_type, grain.blend_alpha = 'OVERLAY', float(opt.get('grain', 0.12))

r = scene.render
if hasattr(r.image_settings, 'media_type'):
    r.image_settings.media_type = 'VIDEO'
r.image_settings.file_format = 'FFMPEG'
r.ffmpeg.format, r.ffmpeg.codec, r.ffmpeg.constant_rate_factor = 'MPEG4', 'H264', 'PERC_LOSSLESS'
r.filepath = os.path.abspath(opt['sortie'])
bpy.ops.render.render(animation=True, scene=scene.name)
print('vidéo :', r.filepath)
