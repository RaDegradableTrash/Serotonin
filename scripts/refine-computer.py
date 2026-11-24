"""Reference-driven hard-surface refinement, executed before material assignment."""
import bmesh
C=bpy.data.collections['03_Computer']
def mesh(name,vs,fs):
    d=bpy.data.meshes.new(name);d.from_pydata(vs,[],fs);d.update()
    bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free()
    o=bpy.data.objects.new(name,d);C.objects.link(o);return o
def box(name,p,d,bevel=0):
    x,y,z=[a/2 for a in d]
    o=mesh(name,[(a*x,b*y,c*z) for a,b,c in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]],[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)])
    o.location=p
    if bevel:
        mod=o.modifiers.new('Single planar chamfer','BEVEL');mod.width=bevel;mod.segments=1
        bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.modifier_apply(modifier=mod.name);o.select_set(False)
    return o
def ringpts(x,y,z,w,h,c):
    return [(x,y+a,z+b) for a,b in [(-w/2+c,-h/2),(w/2-c,-h/2),(w/2,-h/2+c),(w/2,h/2-c),(w/2-c,h/2),(-w/2+c,h/2),(-w/2,h/2-c),(-w/2,-h/2+c)]]
def shell(name,rings,caps=True):
    vs=sum(rings,[]);n=len(rings[0]);fs=[]
    for j in range(len(rings)-1):
        fs.extend((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for i in range(n))
    if caps:fs += [tuple(range(n-1,-1,-1)),tuple(range((len(rings)-1)*n,len(rings)*n))]
    return mesh(name,vs,fs)
def disc(name,x,y,z,r,depth):
    rings=[[(xx,y+math.cos(i*math.tau/16)*rr,z+math.sin(i*math.tau/16)*rr) for i in range(16)] for xx,rr in [(x-depth/2,r*.88),(x,r),(x+depth/2,r)]]
    return shell(name,rings)
for o in list(s.objects):
    if o.name.startswith(('CRT_','RetroPC_')) and o.name!='CRT_Screen_Replaceable':bpy.data.objects.remove(o,do_unlink=True)
# Continuous front bezel: broad forehead, sloping reveal and deeper lower control chin.
shell('CRT_Bezel_Sculpted',[
    ringpts(1.075,.12,1.22,.586,.556,.008),ringpts(1.003,.12,1.22,.586,.556,.008),
    ringpts(.997,.12,1.22,.574,.544,.006),ringpts(.997,.12,1.236,.486,.364,.004),
    ringpts(1.036,.12,1.236,.464,.342,.002)],False)
shell('CRT_DeepTaperedHousing',[ringpts(1.078,.12,1.22,.579,.548,.008),ringpts(1.17,.12,1.22,.57,.54,.01),ringpts(1.42,.12,1.235,.37,.35,.015)])
shell('CRT_Recess_HousingSeam',[ringpts(1.074,.12,1.22,.581,.550,.008),ringpts(1.078,.12,1.22,.581,.550,.008)],False)
box('CRT_Base',(1.23,.12,.801),(.30,.35,.042),.012)
shell('CRT_TiltCradle',[ringpts(1.16,.12,.87,.19,.12,.027),ringpts(1.30,.12,.87,.16,.10,.022)])
for i,(dy,dz) in enumerate([(.16,0),(.135,0),(.11,.009),(.11,-.009),(.085,0),(.06,0),(.035,0)]):
    disc('CRT_ControlRecess',.995,.12+dy,.989+dz,.0068,.002)
    disc('CRT_ControlButton',.990,.12+dy,.989+dz,.0057,.004)
disc('CRT_PowerButton',.988,-.104,.993,.013,.008)
disc('CRT_PowerIndicator',.992,-.064,.993,.002,.002)
for i in range(11):
    x=1.17+i*.018;side=.285-(x-1.17)*.4
    box('CRT_SideVent',(x,.12-side-.002,1.26),(.008,.004,.10))
for i in range(15):box('CRT_TopVent',(1.25,.12+(i-7)*.016,1.451),(.055,.006,.002))
# Tall 1990s tower: inset drive stack, vertical power rail, floppy drive, grille and plinth.
yc=-.51
box('RetroPC_Case',(1.245,yc,1.12),(.35,.255,.675),.004)
box('RetroPC_FrontPanel',(1.058,yc,1.12),(.031,.252,.67),.002)
box('RetroPC_Recess_MainPanel',(1.039,yc+.014,1.145),(.004,.213,.59))
box('RetroPC_PowerRail',(1.031,yc-.112,1.13),(.018,.027,.646),.001)
for z,h in [(1.391,.061),(1.326,.059),(1.265,.059)]:
    box('RetroPC_DriveFace',(1.032,yc+.014,z),(.012,.207,h),.001)
box('RetroPC_CDTrayRecess',(1.024,yc+.014,1.403),(.003,.184,.021))
box('RetroPC_CDTray',(1.020,yc+.014,1.404),(.005,.178,.016),.001)
box('RetroPC_CDEject',(1.020,yc-.063,1.375),(.006,.023,.011),.001)
disc('RetroPC_CDJackRecess',1.019,yc+.080,1.375,.003,.003)
box('RetroPC_CDIndicator',(1.019,yc+.045,1.375),(.003,.007,.002))
box('RetroPC_FloppyPanel',(1.032,yc+.014,1.190),(.012,.207,.084),.001)
box('RetroPC_DriveSlot',(1.024,yc+.014,1.194),(.004,.147,.011))
box('RetroPC_FloppyLip',(1.018,yc+.014,1.200),(.011,.052,.010),.001)
box('RetroPC_FloppyEject',(1.018,yc-.048,1.178),(.010,.022,.009),.001)
box('RetroPC_FloppyIndicator',(1.021,yc+.065,1.178),(.003,.003,.003))
box('RetroPC_LowerPanel',(1.032,yc+.014,.999),(.014,.207,.294),.002)
box('RetroPC_Badge',(1.022,yc+.065,1.119),(.004,.060,.014),.001)
for i in range(22):box('RetroPC_Intake',(1.023,yc-.063,1.116-i*.009),(.004,.052,.0035))
box('RetroPC_PowerButton',(1.016,yc-.112,1.393),(.014,.019,.027),.002)
box('RetroPC_ResetButton',(1.016,yc-.112,.923),(.007,.008,.012),.001)
disc('RetroPC_Recess_Keylock',1.016,yc-.112,.883,.006,.004)
box('RetroPC_Plinth',(1.035,yc,.817),(.03,.231,.035),.002)
for y in [yc-.083,yc+.083]:box('RetroPC_Foot',(1.25,y,.784),(.25,.04,.015),.003)
# Dished key tops use a 3x3 low-poly surface, with sculpted row heights.
for o in list(s.objects):
    if not o.name.startswith('Key98_'):continue
    pts=[o.matrix_world@v.co for v in o.data.vertices];xmin,xmax=min(v.x for v in pts),max(v.x for v in pts);ymin,ymax=min(v.y for v in pts),max(v.y for v in pts)
    cx,cy=(xmin+xmax)/2,(ymin+ymax)/2;dx,dy=xmax-xmin,ymax-ymin;bottom=min(v.z for v in pts)
    row=max(0,min(5,round((1.004-cx)/.022)));top=.839+[.006,.003,.001,0,.001,.003][row]
    vs=[(cx+a*dx/2,cy+b*dy/2,bottom) for a,b in [(-1,-1),(1,-1),(1,1),(-1,1)]]
    for j in range(3):
        for i in range(3):
            a,b=i-1,j-1;vs.append((cx+a*dx*.39,cy+b*dy*.40,top-(.0016 if i==1 else 0)-(.0004 if j==1 else 0)))
    fs=[(0,3,2,1),(0,1,6,5,4),(1,2,12,9,6),(2,3,10,11,12),(3,0,4,7,10)]
    for j in range(2):
        for i in range(2):q=4+j*3+i;fs.append((q,q+1,q+4,q+3))
    old=o.data;new=mesh('temp_key',vs,fs);o.data=new.data;bpy.data.objects.remove(new,do_unlink=True)
# Restrained single-plane casing chamfers retain the low-poly language.
for o in list(s.objects):
    if o.name=='Keyboard98_Case':
        bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Case edge planes','BEVEL');mod.width=.003;mod.segments=1;bpy.ops.object.modifier_apply(modifier=mod.name)
mouse=bpy.data.objects.get('Mouse_Faceted')
if mouse:
    pts=[mouse.matrix_world@Vector(v) for v in mouse.bound_box]
    lo=[min(v[i] for v in pts) for i in range(3)];hi=[max(v[i] for v in pts) for i in range(3)]
    cx,cy=(lo[0]+hi[0])/2,(lo[1]+hi[1])/2;dx,dy=hi[0]-lo[0],hi[1]-lo[1];height=hi[2]-lo[2]
    bpy.data.objects.remove(mouse,do_unlink=True)
    for o in list(s.objects):
        if o.name.startswith('Mouse_Split'):bpy.data.objects.remove(o,do_unlink=True)
    rings=[]
    for z,scale in [(lo[2],.86),(lo[2]+height*.15,1),(lo[2]+height*.52,.94),(lo[2]+height*.9,.65),(hi[2],.28)]:
        rings.append([(cx+math.cos(i*math.tau/16)*dx*.5*scale,cy+math.sin(i*math.tau/16)*dy*.5*scale,z) for i in range(16)])
    shell('Mouse_Faceted',rings)
    box('Mouse_SplitButtons',(cx+dx*.20,cy,lo[2]+height*.87),(dx*.37,.0013,.0012))
assert len([o for o in s.objects if o.name.startswith('Key98_')])==98
