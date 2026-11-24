"""Material/edit the user's Blender room and export a batched glTF for /index.
blender -b -P scripts/build-retro-room.py -- --source room.blend --blend material-room.blend
"""
import bpy, math, random, os, sys, json, argparse
from pathlib import Path
from mathutils import Vector
parser=argparse.ArgumentParser();parser.add_argument('--source',required=True);parser.add_argument('--blend',required=True)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/room';OUT.mkdir(parents=True,exist_ok=True)
ART=ROOT/'artifacts/room';ART.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=args.source);s=bpy.context.scene
for o in bpy.data.collections['07_Wardrobe'].objects:o.location.y-=.18
for o in s.objects:
    if o.name.startswith('Window_FloorPlant'):o.location.x-=.08
bpy.context.view_layer.update()
def bounds(objects):
    v=[o.matrix_world@Vector(c) for o in objects if o.type=='MESH' for c in o.bound_box]
    return [min(p[i] for p in v) for i in range(3)],[max(p[i] for p in v) for i in range(3)]
wb=bounds(bpy.data.collections['07_Wardrobe'].objects)
curt=bounds([o for o in s.objects if o.name.startswith('Curtain_Pleated_1')])
clearance=curt[0][1]-wb[1][1];assert clearance>.035,clearance

def image(name,w,h,pixels):
    im=bpy.data.images.new(name,width=w,height=h,alpha=True);im.pixels.foreach_set(pixels);im.filepath_raw=str(ART/(name+'.png'));im.file_format='PNG';im.save();im.pack();return im
rng=random.Random(1978);N=256
values=[rng.random() for _ in range(N*N)];colors=[];normals=[]
for y in range(N):
    for x in range(N):
        n=values[y*N+x];tone=.97+.045*n+.015*math.sin(x*.029)*math.sin(y*.021)
        colors.extend([.79*tone,.735*tone,.61*tone,1])
        normals.extend([.5+(values[y*N+(x+1)%N]-n)*.10,.5+(values[((y+1)%N)*N+x]-n)*.10,1,1])
grain=image('aged-abs-color',N,N,colors);normal=image('aged-abs-normal',N,N,normals);normal.colorspace_settings.name='Non-Color'
def mat(name,color,rough=.5,metal=0,textured=False):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    if textured:
        t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=grain;m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
        t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=normal
        n=m.node_tree.nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.24;m.node_tree.links.new(t.outputs['Color'],n.inputs['Color']);m.node_tree.links.new(n.outputs['Normal'],p.inputs['Normal'])
    return m
case=mat('Retro | aged ivory ABS',(.65,.58,.43),.48,textured=True)
cap=mat('Retro | keycap parchment',(.68,.61,.47),.59)
modifier=mat('Retro | keycap taupe',(.38,.33,.25),.61)
recess=mat('Retro | charcoal recess',(.018,.023,.020),.72)
cable=mat('Retro | aged rubber',(.13,.12,.095),.83)
led=mat('Retro | amber power LED',(.9,.36,.035),.3)
p=led.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(1,.28,.015,1);p.inputs['Emission Strength'].default_value=3
for o in s.objects:
    if o.type!='MESH':continue
    name=o.name;material=None
    if name.startswith(('CRT_','RetroPC_','Keyboard98_','Key98_','Mouse_','Mouse_Faceted')):
        material=case
        if any(token in name for token in ['Recess','SideVent','Intake','DriveSlot','Plate','Mouse_Split']):material=recess
        if any(token in name for token in ['Cable','ThinCable']):material=cable
        if name.startswith('Key98_'):
            legend=o.get('legend','');material=cap if len(legend)==1 or legend.startswith('Num') or legend=='Space' else modifier
        if 'Indicator' in name:material=led
        if name=='CRT_Screen_Replaceable':continue
        o.data=o.data.copy();o.data.materials.clear();o.data.materials.append(material)
        uv=o.data.uv_layers.new(name='MaterialUV') if not o.data.uv_layers else o.data.uv_layers.active
        for p in o.data.polygons:
            axis=max(range(3),key=lambda i:abs(p.normal[i]));a,b=[i for i in range(3) if i!=axis]
            for li in p.loop_indices:
                co=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=(co[a]*7,co[b]*7)

# Embedded amber desktop texture for Blender. Web replaces it with a live canvas.
W,H=1024,768;pixels=[0.0]*(W*H*4)
for y in range(H):
    for x in range(W):
        k=(y*W+x)*4;edge=max(abs(x-W/2)/(W/2),abs(y-H/2)/(H/2));shade=1-.55*edge**4
        pixels[k:k+4]=[.022*shade,.038*shade,.042*shade,1]
amber=(.94,.61,.18,1)
def rect(x,y,w,h,color=amber):
    for yy in range(max(0,y),min(H,y+h)):
        for xx in range(max(0,x),min(W,x+w)):
            k=((H-1-yy)*W+xx)*4;pixels[k:k+4]=color
font={
'A':['01110','10001','10001','11111','10001','10001','10001'],'B':['11110','10001','10001','11110','10001','10001','11110'],
'C':['01111','10000','10000','10000','10000','10000','01111'],'D':['11110','10001','10001','10001','10001','10001','11110'],
'E':['11111','10000','10000','11110','10000','10000','11111'],'F':['11111','10000','10000','11110','10000','10000','10000'],
'G':['01111','10000','10000','10111','10001','10001','01111'],'H':['10001','10001','10001','11111','10001','10001','10001'],
'I':['111','010','010','010','010','010','111'],'J':['00111','00010','00010','00010','10010','10010','01100'],
'K':['10001','10010','10100','11000','10100','10010','10001'],'L':['10000','10000','10000','10000','10000','10000','11111'],
'M':['10001','11011','10101','10101','10001','10001','10001'],'N':['10001','11001','10101','10011','10001','10001','10001'],
'O':['01110','10001','10001','10001','10001','10001','01110'],'P':['11110','10001','10001','11110','10000','10000','10000'],
'Q':['01110','10001','10001','10001','10101','10010','01101'],'R':['11110','10001','10001','11110','10100','10010','10001'],
'S':['01111','10000','10000','01110','00001','00001','11110'],'T':['11111','00100','00100','00100','00100','00100','00100'],
'U':['10001','10001','10001','10001','10001','10001','01110'],'V':['10001','10001','10001','10001','10001','01010','00100'],
'W':['10001','10001','10001','10101','10101','11011','10001'],'X':['10001','10001','01010','00100','01010','10001','10001'],
'Y':['10001','10001','01010','00100','00100','00100','00100'],'Z':['11111','00001','00010','00100','01000','10000','11111'],
'0':['01110','10001','10011','10101','11001','10001','01110'],'1':['010','110','010','010','010','010','111'],'9':['01110','10001','10001','01111','00001','00001','01110'],
':':['0','1','0','0','1','0','0'],'/':['00001','00001','00010','00100','01000','10000','10000'],'.':['0','0','0','0','0','1','1']}
def text(label,x,y,scale):
    for char in label:
        glyph=font.get(char)
        if glyph:
            for gy,line in enumerate(glyph):
                for gx,on in enumerate(line):
                    if on=='1':rect(x+gx*scale,y+gy*scale,scale,scale)
            x+=(len(glyph[0])+1)*scale
        else:x+=4*scale
for i,label in enumerate(['WORK','TERMINAL','INSIGHT','FOCUS','ROOM','POWER']):
    x=70+(i%2)*180;y=70+(i//2)*150
    rect(x,y+15,65,43);rect(x+5,y+20,55,33,(.025,.045,.04,1));rect(x,y+7,29,12);text(label,x-7,y+76,2)
text('DUSTLAND',420,535,10);text('A PERSONAL SPACE',470,454,3);text('OPEN AN ICON',65,661,2)
rect(40,704,945,2);text('DUST OS / 01',65,725,2);text('19:00',854,725,2)
for y in range(0,H,4):
    for x in range(W):
        k=(y*W+x)*4
        for c in range(3):pixels[k+c]*=.72
screenimg=image('crt-desktop',W,H,pixels)
glass=mat('Retro | amber phosphor glass',(.016,.028,.026),.19,.05)
p=glass.node_tree.nodes.get('Principled BSDF');p.inputs['Coat Weight'].default_value=.72;p.inputs['Coat Roughness'].default_value=.14
t=glass.node_tree.nodes.new('ShaderNodeTexImage');t.image=screenimg
glass.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color']);glass.node_tree.links.new(t.outputs['Color'],p.inputs['Emission Color']);p.inputs['Emission Strength'].default_value=1.1
scr=bpy.data.objects['CRT_Screen_Replaceable'];scr.data.materials.clear();scr.data.materials.append(glass)
# Orient the original screen grid toward the viewer instead of the CRT interior.
for face in scr.data.polygons:
    if face.normal.x > 0: face.flip()
scr.data.update()
uv=scr.data.uv_layers.new(name='ScreenUV') if not scr.data.uv_layers else scr.data.uv_layers.active
for p in scr.data.polygons:
    for li in p.loop_indices:
        co=scr.data.vertices[scr.data.loops[li].vertex_index].co;uv.data[li].uv=((.12+.232-co.y)/.464,(co.z-(1.236-.171))/.342)
s['Curtain_clearance_metres']=round(clearance,4)
s['MaterialRevision']='Aged ABS with embedded grain/normal textures, matte keycaps, charcoal vents and emissive amber CRT; other furniture remains clay.'
s.camera=bpy.data.objects['CAM_01_Reference_Desk'];s.render.resolution_x=1400;s.render.resolution_y=1050;s.cycles.samples=24
for o in bpy.data.images:
    if o.source=='FILE' and not o.packed_file:
        try:o.pack()
        except Exception:pass
bpy.ops.wm.save_as_mainfile(filepath=args.blend)
s.render.filepath=str(ART/'material-preview.png');bpy.ops.render.render(write_still=True)
# Separate export scene: merge static meshes by material, keep interactive CRT parts.
# The editable Blender file is saved before batching and retains all original objects.
source=list(s.objects);export=bpy.data.scenes.new('WEB_EXPORT');bpy.context.window.scene=export
groups={};keep=[]
for o in source:
    if o.type!='MESH':continue
    q=o.copy();q.data=o.data.copy();export.collection.objects.link(q);q.matrix_world=o.matrix_world.copy();q.hide_render=False;q.hide_set(False)
    q.parent=None;q.matrix_world=o.matrix_world.copy()
    if o.name in ['CRT_Screen_Replaceable','CRT_PowerButton','CRT_PowerIndicator']:keep.append(q);continue
    material=q.data.materials[0] if len(q.data.materials) else None
    groups.setdefault(material.name if material else 'Untextured',[]).append(q)
for name,objects in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name='RoomBatch_'+name.replace(' ','_').replace('|','')
for q in keep:q.name=q.name.split('.001')[0]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(OUT/'retro-room.glb'),export_format='GLB',use_selection=True,export_apply=True,export_cameras=False,export_lights=False,export_yup=True,export_texcoords=True,export_normals=True)
report={'curtainClearanceMetres':round(clearance,4),'meshesBefore':sum(o.type=='MESH' for o in source),'meshesAfter':len(export.objects),'glbBytes':(OUT/'retro-room.glb').stat().st_size,'blenderFile':args.blend,'screenObject':'CRT_Screen_Replaceable'}
(ART/'export-report.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print('MATERIAL_AND_EXPORT_COMPLETE',json.dumps(report),flush=True)
