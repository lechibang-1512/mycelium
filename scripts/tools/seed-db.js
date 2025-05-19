const bcrypt = require('bcryptjs');
const { generateId } = require('../../backend/utils/generateId');
const { User, Role, Permission, RolePermission, UserRole } = require('../../backend/models/security');
const { Warehouse, WarehouseZone } = require('../../backend/models/master');

async function seed() {
    console.log('🌱 Seeding security_db...');
    
    // Create admin user
    // Use a hardcoded default for seeding; users should change this immediately
    const adminPassword = bcrypt.hashSync('admin', 10);
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
        { name: 'inventory:read', resource: 'inventory', action: 'read', description: 'Read inventory data' },
        { name: 'inventory:write', resource: 'inventory', action: 'write', description: 'Modify inventory data' },
        { name: 'inventory:delete', resource: 'inventory', action: 'delete', description: 'Delete inventory data' },
        { name: 'invoice:read', resource: 'invoice', action: 'read', description: 'Read invoice data' },
        { name: 'invoice:write', resource: 'invoice', action: 'write', description: 'Modify invoice data' },
        { name: 'invoice:delete', resource: 'invoice', action: 'delete', description: 'Delete invoice data' },
        { name: 'repair:read', resource: 'repair', action: 'read', description: 'Read repair data' },
        { name: 'repair:write', resource: 'repair', action: 'write', description: 'Modify repair data' },
        { name: 'repair:delete', resource: 'repair', action: 'delete', description: 'Delete repair data' },
        { name: 'rma:read', resource: 'rma', action: 'read', description: 'Read RMA data' },
        { name: 'rma:write', resource: 'rma', action: 'write', description: 'Modify RMA data' },
        { name: 'rma:delete', resource: 'rma', action: 'delete', description: 'Delete RMA data' },
        { name: 'serialized:read', resource: 'serialized', action: 'read', description: 'Read serialized inventory data' },
        { name: 'serialized:write', resource: 'serialized', action: 'write', description: 'Modify serialized inventory data' },
        { name: 'serialized:delete', resource: 'serialized', action: 'delete', description: 'Delete serialized inventory data' },
        { name: 'stocktake:read', resource: 'stocktake', action: 'read', description: 'Read stocktake data' },
        { name: 'stocktake:write', resource: 'stocktake', action: 'write', description: 'Modify stocktake data' },
        { name: 'stocktake:delete', resource: 'stocktake', action: 'delete', description: 'Delete stocktake data' },
        { name: 'users:read', resource: 'users', action: 'read', description: 'Read users data' },
        { name: 'users:write', resource: 'users', action: 'write', description: 'Modify users data' },
        { name: 'users:delete', resource: 'users', action: 'delete', description: 'Delete users data' },
        { name: 'warehouse:read', resource: 'warehouse', action: 'read', description: 'Read warehouse data' },
        { name: 'warehouse:write', resource: 'warehouse', action: 'write', description: 'Modify warehouse data' },
        { name: 'warehouse:delete', resource: 'warehouse', action: 'delete', description: 'Delete warehouse data' },
        { name: 'reports:read', resource: 'reports', action: 'read', description: 'View system reports' },
        { name: 'settings:manage', resource: 'settings', action: 'manage', description: 'Manage system settings' }
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
