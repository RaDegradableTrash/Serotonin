"""Export the supplied Blender heart, preserving its selected heartbeat range.
Run: blender -b <source.blend> -P scripts/export-heart.py
"""
import bpy
from pathlib import Path
out=Path.cwd()/'public'/'models'/'lullaby-heart.glb'
out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
 if o.type in {'MESH','ARMATURE'}: o.select_set(True)
for o in bpy.context.selected_objects:
 if o.type == 'MESH':
  bpy.context.view_layer.objects.active=o
  modifier=o.modifiers.new('Web mesh reduction','DECIMATE')
  modifier.ratio=.35
  bpy.ops.object.modifier_move_up(modifier=modifier.name)
  bpy.ops.object.modifier_apply(modifier=modifier.name)
  o.data.validate()
  o.data.update()
  for face in o.data.polygons: face.use_smooth=True
bpy.context.scene.frame_set(1)
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_materials='NONE',export_animations=True,export_frame_range=True,export_force_sampling=True,export_cameras=False,export_lights=False)
print('EXPORTED',out,out.stat().st_size)
