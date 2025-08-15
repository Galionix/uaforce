import bpy
from bpy.types import Panel, Operator
from bpy.props import EnumProperty

# Box type configurations
BOX_TYPES = {
    'light': {
        'mass': 5.0,
        'health': 30,
        'destructible': True,
        'explosive': False,
        'material_color': (0.8, 0.6, 0.4, 1.0)  # Light brown
    },
    'heavy': {
        'mass': 20.0,
        'health': 50,
        'destructible': True,
        'explosive': False,
        'material_color': (0.4, 0.4, 0.4, 1.0)  # Gray
    },
    'explosive': {
        'mass': 15.0,
        'health': 25,
        'destructible': True,
        'explosive': True,
        'material_color': (1.0, 0.0, 0.0, 1.0)  # Red
    },
    'armored': {
        'mass': 25.0,
        'health': 100,
        'destructible': True,
        'explosive': False,
        'material_color': (0.2, 0.2, 0.8, 1.0)  # Blue
    }
}

class PROJECTILE_OT_set_properties(Operator):
    """Set projectile properties on selected objects"""
    bl_idname = "projectile.set_properties"
    bl_label = "Set Projectile Properties"
    bl_options = {'REGISTER', 'UNDO'}
    
    box_type: EnumProperty(
        name="Box Type",
        description="Type of box to create",
        items=[
            ('light', "Light Box", "Fast moving, low health"),
            ('heavy', "Heavy Box", "Slow moving, medium health"),
            ('explosive', "Explosive Box", "Chain reactions, low health"),
            ('armored', "Armored Box", "Very durable, high health"),
        ],
        default='light'
    )
    
    def execute(self, context):
        return set_projectile_properties(self.box_type)

class PROJECTILE_OT_create_test_boxes(Operator):
    """Create a batch of test boxes"""
    bl_idname = "projectile.create_test_boxes"
    bl_label = "Create Test Boxes"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        return batch_create_test_boxes()

class PROJECTILE_OT_list_objects(Operator):
    """List all objects with projectile properties"""
    bl_idname = "projectile.list_objects"
    bl_label = "List Projectile Objects"
    
    def execute(self, context):
        list_projectile_objects()
        return {'FINISHED'}

class PROJECTILE_OT_clear_properties(Operator):
    """Clear projectile properties from selected objects"""
    bl_idname = "projectile.clear_properties"
    bl_label = "Clear Properties"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        return clear_projectile_properties()

class PROJECTILE_PT_main_panel(Panel):
    """Main panel for projectile setup"""
    bl_label = "Projectile Test Setup"
    bl_idname = "PROJECTILE_PT_main_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Projectile"
    
    def draw(self, context):
        layout = self.layout
        
        # Info section
        box = layout.box()
        box.label(text="Selected Objects: " + str(len(context.selected_objects)))
        
        # Set properties section
        box = layout.box()
        box.label(text="Set Properties on Selected:")
        
        # Create operator with property
        row = box.row()
        op = row.operator("projectile.set_properties", text="Light Boxes")
        op.box_type = 'light'
        
        row = box.row()
        op = row.operator("projectile.set_properties", text="Heavy Boxes")
        op.box_type = 'heavy'
        
        row = box.row()
        op = row.operator("projectile.set_properties", text="Explosive Boxes")
        op.box_type = 'explosive'
        
        row = box.row()
        op = row.operator("projectile.set_properties", text="Armored Boxes")
        op.box_type = 'armored'
        
        # Batch creation section
        box = layout.box()
        box.label(text="Batch Creation:")
        box.operator("projectile.create_test_boxes")
        
        # Utility section
        box = layout.box()
        box.label(text="Utilities:")
        box.operator("projectile.list_objects")
        box.operator("projectile.clear_properties")

def set_projectile_properties(box_type):
    """
    Set custom properties on selected objects for projectile testing.
    """
    
    # Check if any objects are selected
    if not bpy.context.selected_objects:
        print("No objects selected! Please select objects and run again.")
        return {'CANCELLED'}
    
    if box_type not in BOX_TYPES:
        print(f"Invalid box type! Choose from: {list(BOX_TYPES.keys())}")
        return {'CANCELLED'}
    
    config = BOX_TYPES[box_type]
    
    # Process each selected object
    for obj in bpy.context.selected_objects:
        if obj.type == 'MESH':
            # Set custom properties for Babylon.js export
            obj["isEnvironment"] = True
            obj["health"] = config['health']
            obj["destructible"] = config['destructible']
            obj["mass"] = config['mass']
            obj["explosive"] = config['explosive']
            
            # Add physics properties
            obj["restitution"] = 0.3  # Bounciness
            obj["friction"] = 0.8     # Surface friction
            
            # Set material color
            create_material_for_object(obj, box_type, config['material_color'])
            
            # Rename object to include type
            if not obj.name.startswith(box_type):
                obj.name = f"{box_type}_{obj.name}"
            
            print(f"Set {box_type} properties on {obj.name}")
    
    print(f"Applied {box_type} box properties to {len(bpy.context.selected_objects)} objects")
    return {'FINISHED'}

def create_material_for_object(obj, box_type, color):
    """Create and assign a material with the specified color"""
    
    # Create material name
    mat_name = f"{box_type}_box_material"
    
    # Check if material already exists
    if mat_name in bpy.data.materials:
        material = bpy.data.materials[mat_name]
    else:
        # Create new material
        material = bpy.data.materials.new(name=mat_name)
        material.use_nodes = True
        
        # Get the principled BSDF node
        bsdf = material.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            # Convert RGBA to RGB for base color (remove alpha channel)
            rgb_color = color[:3] + (1.0,)  # Keep as 4-tuple but ensure alpha is 1.0
            bsdf.inputs[0].default_value = rgb_color  # Base Color
            
            # Add some variation based on type
            if box_type == 'explosive':
                # Check if Emission inputs exist (different Blender versions have different indices)
                try:
                    bsdf.inputs["Emission Strength"].default_value = 0.2
                    bsdf.inputs["Emission Color"].default_value = (1.0, 0.0, 0.0, 1.0)
                except KeyError:
                    # Fallback for older Blender versions
                    try:
                        bsdf.inputs[26].default_value = 0.2  # Emission strength
                        bsdf.inputs[27].default_value = (1.0, 0.0, 0.0, 1.0)  # Emission color
                    except IndexError:
                        pass  # Skip if indices don't exist
            elif box_type == 'armored':
                try:
                    bsdf.inputs["Metallic"].default_value = 0.8
                    bsdf.inputs["Roughness"].default_value = 0.2
                except KeyError:
                    # Fallback for older Blender versions
                    try:
                        bsdf.inputs[6].default_value = 0.8  # Metallic
                        bsdf.inputs[9].default_value = 0.2  # Roughness
                    except IndexError:
                        pass  # Skip if indices don't exist
    
    # Assign material to object
    if obj.data.materials:
        obj.data.materials[0] = material
    else:
        obj.data.materials.append(material)

def batch_create_test_boxes():
    """Create a set of test boxes with different properties"""
    
    box_configs = [
        {'type': 'light', 'location': (0, 0, 0)},
        {'type': 'heavy', 'location': (3, 0, 0)},
        {'type': 'explosive', 'location': (6, 0, 0)},
        {'type': 'armored', 'location': (9, 0, 0)},
        # Stack some boxes
        {'type': 'light', 'location': (0, 0, 2)},
        {'type': 'light', 'location': (0, 0, 4)},
        {'type': 'explosive', 'location': (6, 0, 2)},
    ]
    
    created_objects = []
    
    for i, box_config in enumerate(box_configs):
        box_type = box_config['type']
        location = box_config['location']
        config = BOX_TYPES[box_type]
        
        # Create cube
        bpy.ops.mesh.primitive_cube_add(location=location)
        obj = bpy.context.active_object
        obj.name = f"{box_type}_box_{i:02d}"
        
        # Set custom properties
        obj["isEnvironment"] = True
        obj["health"] = config['health']
        obj["destructible"] = config['destructible']
        obj["mass"] = config['mass']
        obj["explosive"] = config['explosive']
        obj["restitution"] = 0.3
        obj["friction"] = 0.8
        
        # Create and assign material
        create_material_for_object(obj, box_type, config['material_color'])
        
        created_objects.append(obj)
        print(f"Created {box_type} box at {location}")
    
    print(f"Created {len(created_objects)} test boxes")
    return {'FINISHED'}

def list_projectile_objects():
    """List all objects that have projectile properties"""
    objects_with_props = []
    
    for obj in bpy.data.objects:
        if obj.type == 'MESH' and "isEnvironment" in obj:
            objects_with_props.append(obj)
            print(f"{obj.name}: health={obj.get('health', 'N/A')}, mass={obj.get('mass', 'N/A')}, explosive={obj.get('explosive', False)}")
    
    if not objects_with_props:
        print("No objects found with projectile properties")
    else:
        print(f"Found {len(objects_with_props)} objects with projectile properties")

def clear_projectile_properties():
    """Remove projectile properties from selected objects"""
    properties_to_remove = ["isEnvironment", "health", "destructible", "mass", "explosive", "restitution", "friction"]
    
    if not bpy.context.selected_objects:
        print("No objects selected!")
        return {'CANCELLED'}
    
    for obj in bpy.context.selected_objects:
        for prop in properties_to_remove:
            if prop in obj:
                del obj[prop]
        print(f"Cleared properties from {obj.name}")
    
    print(f"Cleared properties from {len(bpy.context.selected_objects)} objects")
    return {'FINISHED'}

# Registration
classes = [
    PROJECTILE_OT_set_properties,
    PROJECTILE_OT_create_test_boxes,
    PROJECTILE_OT_list_objects,
    PROJECTILE_OT_clear_properties,
    PROJECTILE_PT_main_panel,
]

def register():
    for cls in classes:
        bpy.utils.register_class(cls)

def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)

# Auto-register when script is run
if __name__ == "__main__":
    register()
    print("Projectile Test Setup panel added to 3D Viewport > N panel > Projectile tab")
