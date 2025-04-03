const bcrypt = require('bcryptjs');
const { generateId } = require('../../backend/utils/generateId');
const { User, Role, Permission, RolePermission, UserRole } = require('../../backend/models/security');
const { Warehouse, WarehouseZone } = require('../../backend/models/master');

async function seed() {
    console.log('🌱 Seeding security_db...');
    
    // Create admin user
    const adminPassword = bcrypt.hashSync(process.env.ADMIN_DEFAULT_PASSWORD || 'admin', 10);
    const [admin, adminCreated] = await User.findOrCreate({
        where: { username: 'admin' },
        defaults: {
            id: generateId(),
            password: adminPassword,
            email: 'admin@mycelium.com',
            fullName: 'System Admin',
            role: 'admin',
            is_active: 1
        }
    });
    
    if (adminCreated) {
        console.log('   ✓ Admin user created');
    } else {
        await admin.update({ password: adminPassword });
        console.log('   ✓ Admin user password updated/reset');
    }

    console.log('🌱 Seeding RBAC tables...');
    
    // Create admin role
    const adminRoleId = generateId();
    const [adminRole] = await Role.findOrCreate({
        where: { name: 'admin' },
        defaults: {
            role_id: adminRoleId,
            name: 'admin',
            description: 'System Administrator with full access'
        }
    });
    console.log('   ✓ Admin role ensured');

    // Create default permissions
    const permissions = [
        { name: 'inventory.read', resource: 'inventory', action: 'read', description: 'Read inventory data' },
        { name: 'inventory.write', resource: 'inventory', action: 'write', description: 'Modify inventory data' },
        { name: 'users.manage', resource: 'users', action: 'manage', description: 'Manage users and roles' },
        { name: 'warehouses.manage', resource: 'warehouses', action: 'manage', description: 'Manage warehouses and zones' },
        { name: 'reports.view', resource: 'reports', action: 'read', description: 'View system reports' },
        { name: 'settings.manage', resource: 'settings', action: 'manage', description: 'Manage system settings' }
    ];

    for (const perm of permissions) {
        const [permission] = await Permission.findOrCreate({
            where: { name: perm.name },
            defaults: {
                permission_id: generateId(),
                ...perm
            }
        });

        // Assign to admin role
        await RolePermission.findOrCreate({
            where: { role_id: adminRole.role_id, permission_id: permission.permission_id },
            defaults: { id: generateId(), role_id: adminRole.role_id, permission_id: permission.permission_id }
        });
    }
    console.log('   ✓ Default permissions created and assigned to admin role');

    // Assign admin role to admin user
    await UserRole.findOrCreate({
        where: { user_id: admin.id, role_id: adminRole.role_id },
        defaults: { id: generateId(), user_id: admin.id, role_id: adminRole.role_id }
    });
    console.log('   ✓ Admin role assigned to admin user');

    console.log('🌱 Seeding master_db...');
    
    // Create default warehouse
    const warehouseId = generateId();
    const [warehouse, warehouseCreated] = await Warehouse.findOrCreate({
        where: { name: 'Default Warehouse' },
        defaults: {
            warehouse_id: warehouseId,
            warehouse_uuid: warehouseId,
            location: 'Default Location',
            description: 'Automatically created default warehouse',
            is_active: 1
        }
    });
    
    if (warehouseCreated) {
        console.log('   ✓ Default Warehouse created');
        
        // Create default zone
        await WarehouseZone.create({
            id: generateId(),
            warehouse_id: warehouse.warehouse_id,
            zone_id: 1,
            zone_uuid: generateId(),
            name: 'Default Zone',
            is_active: 1
        });
        console.log('   ✓ Default Zone created');
    } else {
        console.log('   ✓ Default Warehouse already exists');
    }
    
    console.log('✅ Seeding complete!');
    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
