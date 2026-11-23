"""Extend the user's recovered tape meshes; keep the source scene in its own collection.
blender -b PortfolioRecordTape.blend -P scripts/build-portfolio-tapes.py
"""
import bpy, bmesh, math, json
from pathlib import Path
from mathutils import Vector, Quaternion

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/models/portfolio'
ART = ROOT / 'artifacts/portfolio'
OUT.mkdir(parents=True, exist_ok=True)
ART.mkdir(parents=True, exist_ok=True)
SOURCE = {name: bpy.data.objects[name] for name in ['Cube','Cube.001','Cylinder','Cylinder.001','Cylinder.002','Cylinder.003']}
original = bpy.data.collections.new('SOURCE — original recovered meshes (unchanged)')
bpy.context.scene.collection.children.link(original)
for obj in list(bpy.context.scene.objects):
    for collection in list(obj.users_collection): collection.objects.unlink(obj)
    original.objects.link(obj)
original.hide_render = True
original.hide_viewport = True

def mat(name, color, rough=.3, metal=0, transmission=0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough
    p.inputs['Metallic'].default_value=metal
    p.inputs['IOR'].default_value=1.49
    p.inputs['Transmission Weight'].default_value=transmission
    if transmission:
        p.inputs['Alpha'].default_value=.3 if 'Smoked' in name else .22
    p.inputs['Coat Weight'].default_value=.4 if transmission else .22
    p.inputs['Coat Roughness'].default_value=.14
    m.diffuse_color=(*color,1)
    return m

ivory=mat('Ivory injection-moulded ABS',(.78,.76,.64),.3)
white=mat('Warm white reel nylon',(.82,.84,.78),.32)
black=mat('Graphite ABS',(.018,.022,.025),.32)
tape=mat('Iron oxide magnetic ribbon',(.038,.018,.012),.44)
steel=mat('Brushed steel screws',(.36,.4,.43),.26,.85)
brass=mat('Phosphor bronze spring',(.45,.25,.07),.32,.75)
felt=mat('Pressure felt',(.115,.12,.12),.95)
clear=mat('Optical clear acrylic',(.89,.97,1),.12,0,.88)
smoke=mat('Smoked transparent polycarbonate',(.23,.29,.32),.16,0,.72)
red=mat('Vermilion glossy polymer',(.63,.055,.022),.23)
gold=mat('Champagne label foil',(.65,.5,.23),.33,.35)
paper=mat('Matte paper label',(.81,.82,.76),.72)

active=None
def link(obj, name, material):
    obj.name=name
    for c in list(obj.users_collection): c.objects.unlink(obj)
    active.objects.link(obj)
    if material:
        obj.data.materials.clear(); obj.data.materials.append(material)
    return obj

def bevel(obj, width=.04, segments=1):
    mod=obj.modifiers.new('Small moulded edge','BEVEL'); mod.width=width; mod.segments=segments
    mod=obj.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    return obj

def box(name, loc, size, material, edge=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=link(bpy.context.object,name,material); o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if edge: bevel(o,edge,2)
    return o

def cyl(name, loc, radius, depth, material, sides=18):
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides,radius=radius,depth=depth,location=loc)
    return link(bpy.context.object,name,material)

def ring(name, loc, outer, inner, depth, material, n=24):
    verts=[]
    for z in [-depth/2,depth/2]:
        for radius in [outer,inner]:
            verts.extend([(radius*math.cos(i*math.tau/n),radius*math.sin(i*math.tau/n),z) for i in range(n)])
    faces=[]
    for i in range(n):
        j=(i+1)%n
        faces.extend([(i,j,2*n+j,2*n+i),(n+j,n+i,3*n+i,3*n+j),(i,n+i,n+j,j),(2*n+j,3*n+j,3*n+i,2*n+i)])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);active.objects.link(o);o.location=loc;o.data.materials.append(material)
    return o

def cut(obj, cutter):
    bpy.context.view_layer.objects.active=obj
    mod=obj.modifiers.new('Functional opening','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)

def duplicate(source,name,material):
    mesh=source.data.copy(); mesh.transform(source.matrix_world)
    for v in mesh.vertices: v.co += Vector((3.151867,.470937,0))
    o=bpy.data.objects.new(name,mesh);active.objects.link(o)
    o.data.materials.clear();o.data.materials.append(material)
    return o

def segment(name,a,b,width,depth,material,z=0):
    mid=((a[0]+b[0])/2,(a[1]+b[1])/2,z)
    o=box(name,mid,(math.dist(a,b),width,depth),material,.01)
    o.rotation_euler.z=math.atan2(b[1]-a[1],b[0]-a[0]);return o

def text(name,body,loc,size,material):
    curve=bpy.data.curves.new(name,'FONT');curve.body=body;curve.size=size;curve.extrude=0;curve.align_y='CENTER'
    o=bpy.data.objects.new(name,curve);active.objects.link(o);o.location=loc;o.data.materials.append(material)
    bpy.context.view_layer.objects.active=o;o.select_set(True)
    bpy.ops.object.convert(target='MESH');o.select_set(False)
    return o

variants=[('clear',clear,paper,white,True),('smoke',smoke,paper,black,False),('ivory',ivory,paper,white,False),('black',black,gold,white,False),('red',red,paper,black,False)]
stats=[]
for index,(slug,shell,label,reel,spokes) in enumerate(variants):
    active=bpy.data.collections.new('TAPE / '+slug.upper());bpy.context.scene.collection.children.link(active)
    front=duplicate(SOURCE['Cube.001'],'shell_front__'+slug,shell)
    back=duplicate(SOURCE['Cube.001'],'shell_back__'+slug,shell)
    for v in back.data.vertices: v.co.z=-v.co.z
    # Preserve the user's plate and its corner holes; add real spindle and head openings.
    for plate in [front,back]:
        for x in [-3.188388,3.151867]: cut(plate,cyl('spindle aperture',(x,.470937,0),1.06,3,None,18))
        for x,r in [(-4.1,.31),(-2.2,.22),(0,.19),(2.2,.22),(4.1,.31)]:
            cut(plate,cyl('head alignment aperture',(x,-3.85,0),r,3,None,16))
        if slug in ['ivory','black','red']:
            cut(plate,box('viewing window cutter',(0,.470937,0),(3.6,1.15,3),None,0))
        bevel(plate,.022,1)
    # The user's upper blank panel becomes a UV mapped, replaceable label surround.
    if slug in ['ivory','black']:
        for sign in [1,-1]:
            labelobj=duplicate(SOURCE['Cube'],'label_'+('front' if sign==1 else 'back')+'__'+slug,label)
            if sign==-1:
                for v in labelobj.data.vertices: v.co.z=-v.co.z
            cut(labelobj,box('label central cutout',(0,.470937,0),(8.65,2.45,3),None,0))
            labelobj['label_surface']='Replace material or add image texture; planar XY UV'
            uv=labelobj.data.uv_layers.new(name='Label Artwork')
            for poly in labelobj.data.polygons:
                for li in poly.loop_indices:
                    co=labelobj.data.vertices[labelobj.data.loops[li].vertex_index].co
                    uv.data[li].uv=((co.x+6)/12,(co.y+3.2)/6.4)
    else:
        box('label_front__'+slug,(0,3.18,.705),(10.4,1.02,.045),label,.03)
        box('label_back__'+slug,(0,3.18,-.705),(10.4,1.02,.045),label,.03)
    # Split moulded perimeter. Open bottom edge exposes the tape to a player's heads.
    for x in [-6.49,6.49]: box('sidewall',(x,0,0),(.16,7.92,.88),shell)
    box('topwall',(0,4.54,0),(11.9,.17,.88),shell)
    for sx in [-1,1]:
        for sy in [-1,1]:
            points=[(sx*(5.94+.55*math.cos(i*math.pi/8)),sy*(3.99+.55*math.sin(i*math.pi/8))) for i in range(5)]
            for a,b in zip(points,points[1:]):segment('rounded corner wall',a,b,.15,.88,shell)
    for x,w in [(-5.45,.98),(-3.55,.75),(-1.35,.42),(1.35,.42),(3.55,.75),(5.45,.98)]:
        box('head edge bridge',(x,-4.56,0),(w,.18,.86),shell)
    for x in [-5.82,5.82]:
        for y in [-3.807,3.79]:
            ring('screw support boss',(x,y,0),.43,.18,.88,shell,12)
            for z in [-.69,.69]:
                cyl('recessed screw',(x,y,z),.245,.065,steel,12)
                for angle in [0,math.pi/2]:
                    o=box('screw cross',(x,y,z+(.037 if z>0 else -.037)),(.32,.045,.012),black,0);o.rotation_euler.z=angle
    # Reuse the exact original low-poly hub teeth and wound reels.
    for hubname,rollname,x in [('Cylinder','Cylinder.001',3.151867),('Cylinder.002','Cylinder.003',-3.188388)]:
        duplicate(SOURCE[hubname],'original toothed hub__'+hubname,reel)
        duplicate(SOURCE[rollname],'original magnetic winding__'+rollname,tape)
        for z in [-.415,.415]:
            ring('slip washer',(x,.470937,z),1.99,1.01,.035,clear,24)
            if spokes:
                ring('white reel rim',(x,.470937,z+(.025 if z>0 else -.025)),1.99,1.68,.035,white,24)
                ring('white reel collar',(x,.470937,z),1.25,1.01,.045,white,18)
                for a in [0,math.tau/3,math.tau*2/3]:
                    o=box('reel spoke',(x+1.45*math.cos(a),.470937+1.45*math.sin(a),z),(.62,.37,.045),white,.035);o.rotation_euler.z=a
            for radius in [1.35,1.55,1.75,1.91]: ring('visible tape layers',(x,.470937,z*.95),radius,radius-.012,.012,black,36)
    # Ribbon travels tangentially from the reels, around both corner guides, across the heads.
    path=[(-5.13,.25),(-5.62,-2.85),(-5.35,-3.6),(-4.85,-4.03),(4.85,-4.03),(5.35,-3.6),(5.62,-2.85),(5.1,.25)]
    for a,b in zip(path,path[1:]): segment('continuous magnetic ribbon',a,b,.035,.48,tape)
    for x in [-5.35,5.35]:
        cyl('guide roller axle',(x,-3.36,0),.11,1.0,steel,12)
        ring('nylon guide roller',(x,-3.36,0),.35,.13,.55,reel,18)
        for z in [-.31,.31]:ring('roller flange',(x,-3.36,z),.39,.13,.04,reel,18)
    for x in [-2.2,2.2]:
        cyl('tape guide pin',(x,-3.95,0),.09,.73,steel,12)
        box('guide support',(x,-3.55,-.22),(.24,.65,.3),shell)
    segment('spring left leaf',(-1.45,-3.52),(0,-3.85),.055,.36,brass)
    segment('spring right leaf',(0,-3.85),(1.45,-3.52),.055,.36,brass)
    box('head pressure felt',(0,-3.94,0),(.8,.13,.42),felt)
    box('magnetic shield',(0,-3.35,-.12),(2.2,.12,.65),steel)
    for x in [-1.55,1.55]:box('spring anchor',(x,-3.52,0),(.2,.3,.75),shell)
    for x in [-4.6,4.6]:
        box('write protect tab',(x,4.48,0),(.8,.25,.4),shell)
        for sign in [-1,1]: segment('internal diagonal rib',(x,3.9),(x+sign*.65,3.1),.07,.15,shell,-.36)
    for x in [-5.95,5.95]:
        for y in [-2,-1.7,-1.4,-1.1,-.8]:box('grip rib',(x,y,.69),(.43,.06,.055),shell,.012)
    # Raised trapezoidal head shroud distinguishes the moulded cassette variants.
    if slug != 'clear':
        for sign in [-1,1]:
            name='shell_'+('front' if sign==1 else 'back')+'_head_shroud'
            outline=[(-4.85,-4.58),(4.85,-4.58),(4.38,-2.78),(-4.38,-2.78)]
            verts=[(x,y,z*sign) for z in [.65,.86] for x,y in outline]
            mesh=bpy.data.meshes.new(name)
            mesh.from_pydata(verts,[],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
            mesh.update();o=bpy.data.objects.new(name,mesh);active.objects.link(o);o.data.materials.append(shell)
            if sign==-1:
                bpy.context.view_layer.objects.active=o;o.select_set(True)
                bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.flip_normals();bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)
            for x,r in [(-4.1,.31),(-2.2,.22),(0,.19),(2.2,.22),(4.1,.31)]:cut(o,cyl('head port cutter',(x,-3.85,0),r,3,None,16))
            bevel(o,.035,1)
            if slug=='ivory':
                for i in range(9):box('shell_'+('front' if sign==1 else 'back')+'_moulded_ridge',(0,-2.95-i*.115,.88*sign),(8.35+i*.05,.035,.025),shell,.005)
    if slug in ['ivory','black','red']:
        for sign in [-1,1]:box('shell_'+('front' if sign==1 else 'back')+'_window',(0,.470937,.58*sign),(3.65,1.2,.045),clear,.03)
    for x in [-1.2,-.8,-.4,0,.4,.8,1.2]:box('tape window scale',(x,.470937,.7),(.025,.35,.018),white,0)
    # Modest printable annotation; the upper label deliberately remains mostly blank.
    text('label_front_type','DUSTLAND   /   '+slug.upper(),(-4.95,3.15,.75),.22,black)
    if slug in ['ivory','black','red']:
        text('label_front_side','A',(-5.2,-1.75,.76),.48,black)
        text('label_front_caption','MAGNETIC MEMORY',(-3.8,-1.75,.76),.18,black)
    objects=list(active.objects)
    for obj in objects:
        if obj.type=='MESH':
            bm=bmesh.new();bm.from_mesh(obj.data)
            bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
    parent=bpy.data.objects.new('Cassette_'+slug,None);active.objects.link(parent)
    for obj in objects:obj.parent=parent
    # Orient the original XY face toward glTF +Z, at a consistent web display scale.
    parent.rotation_euler.x=math.pi/2;parent.scale=(.72,)*3
    bpy.ops.object.select_all(action='DESELECT')
    for obj in active.objects:obj.hide_set(False);obj.select_set(True)
    bpy.context.view_layer.objects.active=parent
    bpy.ops.export_scene.gltf(filepath=str(OUT/(slug+'.glb')),export_format='GLB',use_selection=True,export_apply=True,export_cameras=False,export_lights=False)
    stats.append({'variant':slug,'objects':len(objects),'vertices':sum(len(o.data.vertices) for o in objects if o.type=='MESH'),'bytes':(OUT/(slug+'.glb')).stat().st_size})
    parent.rotation_euler.x=0;parent.scale=(1,1,1);parent.location=((index%3)*15,(index//3)*-12,0)

# Save an editable collection layout, with the original mesh source isolated and retained.
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.data.collections['TAPE / CLEAR'].objects:obj.select_set(True)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_distance=35
            area.spaces.active.region_3d.view_location=(14,-5,0)
            area.spaces.active.region_3d.view_rotation=Quaternion((1,0,0,0))
            area.spaces.active.shading.type='MATERIAL'
            area.spaces.active.overlay.show_extras=False
bpy.context.scene.world.color=(.15,.15,.15)
bpy.ops.wm.save_as_mainfile(filepath='C:/Users/Ragon/Documents/Blender/PortfolioRecordTape_Complete.blend')
(ART/'model-manifest.json').write_text(json.dumps(stats,indent=2))
print('PORTFOLIO_COMPLETE',json.dumps(stats))
