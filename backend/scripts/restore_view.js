
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mariadb = require('mariadb');

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});

async function restoreView() {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log('Connected to database');

        const dropSql = "DROP VIEW IF EXISTS `v_all_transactions`";
        console.log('Dropping view if exists...');
        await conn.query(dropSql);

        const createSql = `
        CREATE VIEW \`v_all_transactions\` AS 
        select 
            coalesce(\`il\`.\`transaction_group_id\`,concat('LOG-',\`il\`.\`log_id\`)) AS \`transaction_id\`,
            max(\`il\`.\`transaction_type\`) AS \`transaction_type\`,
            min(\`il\`.\`transaction_date\`) AS \`transaction_date\`,
            max(\`il\`.\`supplier_id\`) AS \`supplier_id\`,
            max(\`il\`.\`warehouse_id\`) AS \`warehouse_id\`,
            max(\`il\`.\`zone_id\`) AS \`zone_id\`,
            sum(coalesce(\`il\`.\`total_amount\`,\`il\`.\`total_value\`,0)) AS \`total_amount\`,
            sum(coalesce(\`il\`.\`subtotal\`,\`il\`.\`total_value\`,0)) AS \`subtotal\`,
            sum(coalesce(\`il\`.\`tax_amount\`,0)) AS \`tax_amount\`,
            max(\`il\`.\`notes\`) AS \`notes\`,
            case when \`il\`.\`transaction_group_id\` is not null then 'receipt' else 'inventory_log' end AS \`source\`,
            count(distinct \`il\`.\`product_id\`) AS \`item_count\`,
            min(\`il\`.\`created_at\`) AS \`created_at\`,
            max(\`il\`.\`updated_at\`) AS \`updated_at\` 
        from \`inventory_log\` \`il\` 
        where \`il\`.\`transaction_type\` in ('incoming','outgoing','transfer','rma_return','rma_disposition') 
        and (\`il\`.\`transaction_group_id\` is not null or \`il\`.\`receipt_id\` is null) 
        group by coalesce(\`il\`.\`transaction_group_id\`,concat('LOG-',\`il\`.\`log_id\`)),case when \`il\`.\`transaction_group_id\` is not null then 'receipt' else 'inventory_log' end
        `;

        console.log('Creating view v_all_transactions...');
        await conn.query(createSql);
        console.log('View restored successfully!');

    } catch (err) {
        console.error('Error restoring view:', err);
    } finally {
        if (conn) conn.release();
        process.exit();
    }
}

restoreView();
