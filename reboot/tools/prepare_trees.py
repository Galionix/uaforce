"""Extract existing low-poly meshes; preserve original topology in a game-sized derivative."""
import bpy
from pathlib import Path
from mathutils import Matrix
root=Path(__file__).resolve().parents[1]
source=Path('/Users/dmitry/Documents/projects/game-recovery-evidence/2026-09-08/telegram-export/files/tree2.blend')
bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False,use_scripts=False)
bpy.ops.object.select_all(action='DESELECT')
for index,name in enumerate(['Tree','Tree.001']):
    original=bpy.data.objects[name]
    mesh=original.data.copy()
    points=[original.matrix_world @ v.co for v in mesh.vertices]
    low=[min(p[i] for p in points) for i in range(3)]
    high=[max(p[i] for p in points) for i in range(3)]
    scale=4/max(high[2]-low[2],.01)
    center=[(low[0]+high[0])/2,(low[1]+high[1])/2,low[2]]
    for vertex,point in zip(mesh.vertices,points):vertex.co=[(point[i]-center[i])*scale for i in range(3)]
    ob=bpy.data.objects.new('recovered_tree_'+str(index),mesh);bpy.context.collection.objects.link(ob);ob.matrix_world=Matrix.Identity(4)
    mat=bpy.data.materials.new('recovered_tree_palette_'+str(index));mat.diffuse_color=(.17,.23,.12,1);mesh.materials.clear();mesh.materials.append(mat)
    ob.select_set(True);bpy.context.view_layer.objects.active=ob
    print(name,'->',ob.name,len(mesh.vertices),'vertices',len(mesh.polygons),'faces')
bpy.ops.export_scene.gltf(filepath=str(root/'public/assets/recovered-trees.glb'),export_format='GLB',use_selection=True,export_animations=False)
