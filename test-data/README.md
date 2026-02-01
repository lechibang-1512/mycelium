# Invoice Import Test Documentation

## Overview
This directory contains test invoices in multiple formats to validate the Mycelium ERP invoice import system.

## Test Files

### 1. XML Invoice (`test_invoice.xml`)
- Format: Vietnamese e-invoice XML standard
- Contains: 5 different products with mixed serial tracking
- Features: Full supplier/buyer info, taxes, discounts, shipping
- Total Value: 95,280,000 VND

**Products Included:**
- iPhone 15 Pro Max 256GB (2 units with serials)
- Samsung Galaxy S24 Ultra LCD Screen (5 units with serials)  
- iPhone 14 Battery OEM Quality (10 units, no serials)
- USB-C Cable 2M Premium (25 units, no serials)
- Xiaomi 13 Pro Back Cover Glass (8 units with serials)

### 2. JSON Invoice (`test_invoice.json`)
- Format: JSON structure for API integration
- Contains: 5 different products with extensive serial tracking
- Features: Comprehensive product data with arrays for serial numbers
- Total Value: 100,640,000 VND

**Products Included:**
- Samsung Galaxy S23 FE 256GB (3 units with serials)
- iPhone 13 Pro Max Screen OLED (7 units with serials)
- Universal Phone Repair Tool Kit (12 units, no serials)
- Samsung Galaxy A54 Battery (15 units, no serials)
- iPhone Lightning to USB-C Adapter (20 units with serials)

### 3. CSV Invoice (`test_invoice.csv`)
- Format: Comma-separated values for bulk import
- Contains: 5 different products with mixed tracking
- Features: Simplified structure for spreadsheet imports
- Total Value: 50,878,000 VND

**Products Included:**
- Oppo Find X6 Pro 256GB (2 units with serials)
- Huawei P60 Pro Charging Port (8 units with serials)
- Universal Wireless Charger (6 units, no serials)
- Nokia G42 5G Back Camera (4 units with serials)
- Premium Tempered Glass (50 units, no serials)

## Testing Scripts

### `test-invoice-import.js`
Comprehensive test suite that:
- Tests parsing for all three formats
- Validates auto-format detection
- Shows parsed data structure
- Simulates import process
- Provides format compatibility checks

**Usage:**
```bash
node scripts/test-invoice-import.js
```

### `simple-import-test.js`
Simple focused test that:
- Tests JSON parsing with realistic data
- Shows proper field mapping
- Displays serial number handling
- Checks current database state

**Usage:**
```bash
node scripts/simple-import-test.js
```

## How to Use Test Data

### 1. Via API (Recommended)
```bash
# Upload XML invoice
curl -X POST http://localhost:3000/api/invoices/import \
  -H "Content-Type: application/xml" \
  --data-binary "@test-data/test_invoice.xml"

# Upload JSON invoice  
curl -X POST http://localhost:3000/api/invoices/import \
  -H "Content-Type: application/json" \
  --data-binary "@test-data/test_invoice.json"

# Upload CSV invoice
curl -X POST http://localhost:3000/api/invoices/import \
  -H "Content-Type: text/csv" \
  --data-binary "@test-data/test_invoice.csv"
```

### 2. Via Frontend Upload
1. Navigate to `/invoices` page
2. Click "Import Invoice" 
3. Select test file
4. System will auto-detect format and process

### 3. Via Node.js Script
```javascript
const fs = require('fs');
const InvoiceParser = require('../backend/services/InvoiceParser');

const content = fs.readFileSync('test-data/test_invoice.json', 'utf-8');
const parser = new InvoiceParser();
const parsed = await parser.parse(content, 'auto');
```

## Expected Results

### Products Created
The test invoices will create new products in the unified `products` table:
- Product Type: Automatically detected (PHONE, SPARE_PART, ACCESSORY)
- Categories: Assigned based on product names
- Brand Extraction: Automatically extracted from product names
- Serial Tracking: Enabled for items with serial numbers

### Inventory Updates
- Records added to `product_inventory` table
- Serial numbers stored individually or as comma-separated values
- Quantities properly allocated across warehouses

### Expected Serials Tracking
- Serial numbers logged in `expected_serials` table
- Links to original invoice for audit trail
- Ready for receiving process validation

## Validation Checklist

After import, verify:
- [ ] Products created with correct types and categories
- [ ] Inventory quantities match invoice quantities
- [ ] Serial numbers properly stored and tracked
- [ ] Invoice totals correctly calculated and stored
- [ ] Supplier information captured
- [ ] Expected serials ready for receiving process

## Troubleshooting

### Common Issues
1. **Field Mapping Errors**: Check JSON field names match parser expectations
2. **CSV Header Mismatch**: Ensure headers are lowercase, no spaces
3. **Serial Format Issues**: Verify serials are comma-separated strings
4. **Validation Failures**: Check required fields are present

### Debug Tips
- Enable debug logging in `.env`: `DEBUG=invoice:*`
- Check parser output before import service
- Validate JSON structure with schema
- Test with smaller invoices first

## Integration Notes

### Database Impact
- New products will be created automatically if they don't exist
- Existing products will have inventory added
- Supplier information will be created/updated
- All changes are logged for audit purposes

### Performance Considerations
- Large invoices (>100 items) may take longer to process
- Serial number validation adds processing time
- Batch import recommended for multiple invoices

### Error Handling
- Parsing errors return detailed validation messages
- Database errors roll back entire invoice
- Partial imports are not allowed
- Failed imports don't affect existing data

## Next Steps

1. **Test with Real Data**: Replace test invoices with actual supplier data
2. **Customize Validation**: Add business-specific validation rules
3. **Enhance Mapping**: Improve automatic product categorization
4. **Scale Testing**: Test with larger invoice volumes
5. **Integration Testing**: Test end-to-end workflow with receiving process