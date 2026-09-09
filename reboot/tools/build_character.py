"""Create a game model derived from the recovered Cossack reference images.
Original PNGs remain unchanged. Run using Blender --background --python.
"""
import bpy
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, color, roughness=.8):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    return m

olive = material('reference_olive_uniform', (.19, .24, .075))
vest = material('reference_plate_carrier', (.12, .15, .045))
skin = material('warm_skin', (.64, .36, .19))
hair = material('reference_dark_moustache', (.075, .039, .013))
boot = material('brown_boots', (.11, .075, .035))
metal = material('rifle_metal', (.055, .068, .07), .35)
wood = material('rifle_stock', (.23, .13, .065))
blue = material('ukraine_blue', (.025, .26, .8))
yellow = material('ukraine_yellow', (.95, .73, .025))
white = material('eyes', (.8, .77, .61))
black = material('pupils', (.022, .019, .015))

def empty(name, pos, parent=None):
    ob = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(ob)
    ob.parent = parent; ob.location = pos
    return ob

root = empty('cossack', (0, 0, 0))

def shape(name, pos, scale, mat, parent=root, sphere=False, bevel=0):
    if sphere:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8)
    else:
        bpy.ops.mesh.primitive_cube_add(size=2)
    ob = bpy.context.object; ob.name = name; ob.parent = parent; ob.location = pos; ob.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(mat)
    if bevel:
        mod = ob.modifiers.new('soft_edges', 'BEVEL'); mod.width = bevel; mod.segments = 2
        bpy.context.view_layer.objects.active = ob; bpy.ops.object.modifier_apply(modifier=mod.name)
    return ob

shape('hips', (0, 0, .67), (.26, .16, .17), olive, bevel=.06)
shape('belt', (0, -.005, .75), (.28, .18, .045), boot, bevel=.015)
shape('belt_buckle', (0, -.19, .75), (.06, .025, .04), metal)
shape('torso', (0, 0, 1.02), (.31, .19, .29), olive, bevel=.075)
shape('plate_carrier', (0, -.205, 1.015), (.25, .055, .235), vest, bevel=.04)
for x in [-.165, -.055, .055, .165]:
    for z in [.9, 1, 1.1]: shape('molle_webbing', (x, -.268, z), (.044, .012, .032), olive, bevel=.004)
for x in [-.22,.22]: shape('shoulder_strap', (x, -.09, 1.255), (.048,.17,.036), vest, bevel=.02)
shape('neck', (0, 0, 1.33), (.095, .09, .095), skin, sphere=True)
head = empty('head', (0, -.012, 1.5), root)
shape('large_head', (0, 0, 0), (.205, .178, .255), skin, parent=head, sphere=True)
for x in [-.215,.215]: shape('ear', (x, 0, -.005), (.04,.055,.075), skin, parent=head, sphere=True)
shape('nose', (0, -.174, -.015), (.045,.085,.064), skin, parent=head, sphere=True)
for x in [-.082,.082]:
    shape('eye', (x,-.158,.055), (.055,.025,.025), white, parent=head, sphere=True)
    shape('pupil', (x,-.18,.056), (.018,.012,.02), black, parent=head, sphere=True)
    shape('brow', (x,-.167,.096), (.066,.025,.016), hair, parent=head, sphere=True)
    mustache = shape('reference_moustache', (x,-.192,-.075), (.095,.04,.038), hair, parent=head, sphere=True)
    mustache.rotation_euler.y = (-.28 if x < 0 else .28)
    shape('moustache_tip', (x*1.85,-.169,-.11), (.025,.03,.062), hair, parent=head, sphere=True)
shape('mouth', (0,-.173,-.11), (.045,.012,.013), boot, parent=head)
shape('oseledets_root', (-.018,.015,.235), (.075,.09,.035), hair, parent=head, sphere=True)
for i in range(6):
    shape('oseledets_lock', (-.045-i*.023,.06+i*.05,.23-i*.045), (.036-i*.003,.058,.034), hair, parent=head, sphere=True)

for side, sign in [('left',-1),('right',1)]:
    leg = empty('leg_'+side, (sign*.155,0,.67), root)
    shape('short_trousers_'+side, (0,0,-.175), (.128,.15,.22), olive, parent=leg, bevel=.065)
    shape('boot_'+side, (0,-.06,-.49), (.127,.205,.115), boot, parent=leg, bevel=.045)
    shape('boot_sole_'+side, (0,-.065,-.58), (.13,.21,.024), metal, parent=leg, bevel=.012)
    arm = empty('arm_'+side, (sign*.335,0,1.21), root)
    shape('sleeve_'+side, (sign*.026,0,-.09), (.125,.155,.15), olive, parent=arm, bevel=.055)
    shape('forearm_'+side, (sign*.028,-.10,-.25), (.083,.14,.115), skin, parent=arm, sphere=True)
    shape('hand_'+side, (sign*.028,-.24,-.29), (.079,.086,.067), skin, parent=arm, sphere=True)
    if sign == -1:
        shape('flag_blue', (-.102,-.11,-.05), (.008,.049,.025), blue, parent=arm)
        shape('flag_yellow', (-.102,-.11,-.1), (.008,.049,.025), yellow, parent=arm)

gun = empty('weapon', (.18,-.35,.95), root)
shape('rifle_receiver', (0,-.02,0), (.045,.21,.049), metal, parent=gun, bevel=.01)
shape('wood_stock', (0,.19,-.035), (.042,.1,.055), wood, parent=gun, bevel=.015)
shape('barrel', (0,-.34,.015), (.017,.15,.017), metal, parent=gun)
shape('magazine', (0,-.07,-.1), (.033,.07,.08), metal, parent=gun, bevel=.014)
shape('front_sight', (0,-.41,.05), (.012,.017,.035), metal, parent=gun)

# The game animates the named limb pivots. Preserve an editable authored source.
bpy.context.scene['provenance'] = 'Derived from recovered cossack-front.png, cossack-three-quarter.png, cossack-profile.png; not an original team mesh.'
target = ROOT/'public/assets/cossack.glb'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'tools/cossack.blend'))
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', export_yup=True, export_animations=False)
print('Created reference-derived character:', target)
