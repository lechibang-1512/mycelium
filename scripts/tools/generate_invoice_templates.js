const fs = require('fs');
const path = require('path');
const InvoiceParser = require('../backend/services/InvoiceParser');

const parser = new InvoiceParser();

function generateTemplates() {
    const templatesDir = path.join(__dirname, '../templates');

    // Generate XML template
    const xmlTemplate = parser.generateTemplate('xml');
    fs.writeFileSync(path.join(templatesDir, 'generated_invoice_template.xml'), xmlTemplate);
    console.log('✅ Generated XML template');

    // Generate JSON template
    const jsonTemplate = parser.generateTemplate('json');
    fs.writeFileSync(path.join(templatesDir, 'generated_invoice_template.json'), jsonTemplate);
    console.log('✅ Generated JSON template');

    // Generate CSV template
    const csvTemplate = parser.generateTemplate('csv');
    fs.writeFileSync(path.join(templatesDir, 'generated_invoice_template.csv'), csvTemplate);
    console.log('✅ Generated CSV template');

    console.log('\n📁 Templates generated in /templates/ directory');
    console.log('Use these templates as starting points for your invoice imports.');
}

if (require.main === module) {
    generateTemplates();
}

module.exports = { generateTemplates };