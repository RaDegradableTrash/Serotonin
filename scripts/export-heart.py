"""Export the supplied Blender heart, preserving its selected heartbeat range.
Run: blender -b <source.blend> -P scripts/export-heart.py
"""
import bpy
from pathlib import Path
out=Path.cwd()/'public'/'models'/'lullaby-heart-animation-copy.glb'
out.parent.mkdir(parents=True,exist_ok=True)
if bpy.context.object and bpy.context.object.mode != 'OBJECT': bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
 if o.type in {'MESH','ARMATURE'}:
  o.hide_set(False)
  o.select_set(True)
for o in bpy.context.selected_objects:
 if o.type == 'MESH':
  bpy.context.view_layer.objects.active=o
  o.data.validate()
  o.data.update()
  for face in o.data.polygons: face.use_smooth=True
print("TIMELINE",bpy.context.scene.frame_start,bpy.context.scene.frame_end,bpy.context.scene.render.fps)
bpy.context.scene.frame_set(bpy.context.scene.frame_start)
active_actions={o.animation_data.action for o in bpy.context.selected_objects if o.animation_data and o.animation_data.action}
for action in list(bpy.data.actions):
 if action not in active_actions: bpy.data.actions.remove(action)
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_materials='NONE',export_animations=True,export_frame_range=True,export_force_sampling=True,export_cameras=False,export_lights=False)
print('EXPORTED',out,out.stat().st_size)
