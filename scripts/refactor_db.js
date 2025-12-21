const fs = require('fs');
const path = require('path');

const masterDbPath = path.join(__dirname, '..', 'sql', 'master_db.sql');
const pcComponentsPath = path.join(__dirname, '..', 'sql', 'pc_components.sql');

let _masterSql = fs.readFileSync(masterDbPath, 'utf8');

// The rest of the master_db logic is correct and already done, but to be safe we'll skip or just re-run.
// Since master_db.sql was already refactored correctly and unifiedInventory was injected, we will only do pc_components.

let pcSql = fs.readFileSync(pcComponentsPath, 'utf8');

const tablesToRefactor = [
    'cables', 'case_fans', 'cpu', 'cpu_coolers', 'expansion_cards', 'gpu', 
    'headphones', 'headsets', 'keyboard', 'mice', 'microphones', 'monitors', 
    'motherboard', 'power_supply', 'ram', 'storage', 'pc_cases', 'mouse'
];

tablesToRefactor.forEach(table => {
    const regex = new RegExp("CREATE TABLE `" + table + "` \\(([\\s\\S]*?)\\) ENGINE = InnoDB", "g");
    
    pcSql = pcSql.replace(regex, (match, columns) => {
        const columnsToRemove = [
            "`" + table + "_id`",
            "`part_code`",
            "`name`",
            "`description`",
            "`manufacturer`",
            "`msrp`",
            "`supplier_id`",
            "`unit_cost`",
            "`unit_price`",
            "`currency`",
            "`image_url`",
            "`warranty_months`",
            "`reorder_point`",
            "`is_active`",
            "`created_at`",
            "`updated_at`",
            "`datasheet_url`"
        ];

        let lines = columns.split('\n');
        let newLines = [];
        
        newLines.push("  `product_id` char(36) NOT NULL,");

        lines.forEach(line => {
            if (line.trim() === '') return;
            
            let skip = false;
            for (let col of columnsToRemove) {
                if (line.includes(col)) {
                    skip = true;
                    break;
                }
            }
            if (line.includes('PRIMARY KEY')) {
                newLines.push("  PRIMARY KEY (`product_id`),");
                newLines.push("  CONSTRAINT `fk_" + table + "_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE,");
                skip = true;
            }
            if (line.includes('UNIQUE KEY `part_code`')) {
                skip = true;
            }
            if (line.includes('KEY `idx_') && line.includes('active')) {
                skip = true;
            }

            if (!skip) {
                if (line.includes("KEY `") && line.includes(table + "_id`")) {
                    return;
                }
                newLines.push(line);
            }
        });

        for (let i = newLines.length - 1; i >= 0; i--) {
            if (newLines[i].trim().length > 0) {
                if (newLines[i].endsWith(',')) {
                    newLines[i] = newLines[i].substring(0, newLines[i].length - 1);
                }
                break;
            }
        }

        return "CREATE TABLE `" + table + "_specs` (\n" + newLines.join('\n') + "\n) ENGINE = InnoDB";
    });
    
    pcSql = pcSql.replace(new RegExp("DROP TABLE IF EXISTS `" + table + "`;", 'g'), "DROP TABLE IF EXISTS `" + table + "_specs`;");
    pcSql = pcSql.replace(new RegExp("LOCK TABLES `" + table + "` WRITE;", 'g'), "LOCK TABLES `" + table + "_specs` WRITE;");
    pcSql = pcSql.replace(new RegExp("ALTER TABLE `" + table + "`", 'g'), "ALTER TABLE `" + table + "_specs`");
});

fs.writeFileSync(pcComponentsPath, pcSql);
console.log("Updated pc_components.sql");
