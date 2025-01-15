const bcrypt = require('bcryptjs');
const { generateId } = require('../../backend/utils/generateId');
const { User } = require('../../backend/models/security');
const { Warehouse, WarehouseZone } = require('../../backend/models/master');

async function seed() {
    console.log('🌱 Seeding security_db...');
    
    // Create admin user
    const adminPassword = bcrypt.hashSync(process.env.ADMIN_DEFAULT_PASSWORD || 'admin', 10);
    const [admin, adminCreated] = await User.findOrCreate({
        where: { username: 'admin' },
        defaults: {
            user_id: generateId(),
            password: adminPassword,
            email: 'admin@mycelium.com',
            full_name: 'System Admin',
            role: 'admin',
            is_active: 1,
            is_locked: 0
        }
    });
    
    if (adminCreated) {
        console.log('   ✓ Admin user created');
    } else {
        await admin.update({ password: adminPassword });
        console.log('   ✓ Admin user password updated/reset');
    }
    
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
