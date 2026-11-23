"""Export the user's current editable collection without rebuilding or saving over it."""
import bpy, math
from pathlib import Path
out=Path(__file__).resolve().parents[1]/'public/models/portfolio'
for source,target in [('CLEAR','clear'),('SMOKE','smoke'),('IVORY','ivory'),('BLACK','black'),('RED','blue')]:
    collection=bpy.data.collections['TAPE / '+source]
    parent=next(o for o in collection.objects if o.type=='EMPTY')
    old=parent.matrix_world.copy()
    parent.location=(0,0,0);parent.rotation_euler=(math.pi/2,0,0);parent.scale=(.72,)*3
    bpy.ops.object.select_all(action='DESELECT')
    for obj in collection.objects: obj.hide_set(False);obj.select_set(True)
    bpy.context.view_layer.objects.active=parent
    bpy.ops.export_scene.gltf(filepath=str(out/(target+'.glb')),export_format='GLB',use_selection=True,export_apply=True,export_cameras=False,export_lights=False)
    parent.matrix_world=old
print('EXPORTED_CURRENT_USER_COLORS')
