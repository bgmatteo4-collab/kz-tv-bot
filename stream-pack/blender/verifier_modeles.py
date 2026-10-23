"""Importe chaque modèle Objaverse, note ses dimensions et rend une vignette (contrôle visuel).
    blender -b -P stream-pack/blender/verifier_modeles.py"""
import bpy, os, json, math
from mathutils import Vector
ICI = os.path.dirname(os.path.abspath(__file__))
DOS = os.path.join(ICI, '..', 'assets', 'objaverse')
OUT = os.path.join(ICI, '..', 'rendus', 'modeles'); os.makedirs(OUT, exist_ok=True)
dims = {}
for f in sorted(os.listdir(DOS)):
    if not f.endswith('.glb'): continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=os.path.join(DOS, f))
    objs = [o for o in s.objects if o.type == 'MESH']
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    d = mx - mn; dims[f[:-4]] = [round(v, 3) for v in d]
    c = (mn + mx) / 2; r = max(d) * 1.25
    cam = bpy.data.objects.new('c', bpy.data.cameras.new('c')); s.collection.objects.link(cam); s.camera = cam
    cam.location = c + Vector((r, -r * 1.2, r * 0.7))
    cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
    w = bpy.data.worlds.new('w'); s.world = w; w.color = (0.6, 0.6, 0.6)
    sol = bpy.data.lights.new('sun', 'SUN'); sol.energy = 3; o = bpy.data.objects.new('sun', sol); o.rotation_euler = (0.8, 0.2, 0.6); s.collection.objects.link(o)
    s.render.engine = 'CYCLES'; s.cycles.samples = 12; s.cycles.use_denoising = True
    s.render.resolution_x = s.render.resolution_y = 300
    s.render.filepath = os.path.join(OUT, f[:-4] + '.png')
    bpy.ops.render.render(write_still=True)
json.dump(dims, open(os.path.join(OUT, 'dimensions.json'), 'w'), indent=1)
