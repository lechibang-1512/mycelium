# Mycelium ERP Invoice Import System

This document describes the invoice template and importing system for Mycelium ERP.

## Overview

The invoice import system supports multiple formats (XML, JSON, CSV) and automatically parses, validates, and imports invoice data into the ERP system. The system handles supplier creation, product cataloging, and serial number tracking.

## Supported Formats

### 1. XML Format (Primary)
Standard Vietnamese e-invoice format (T-VAN compatible). See `templates/invoice_template.xml` for the complete structure.

### 2. JSON Format
Structured JSON format with schema validation. See `templates/invoice_template.json` and `templates/invoice_schema.json`.

### 3. CSV Format
Simple comma-separated values format for bulk imports. See `templates/invoice_template.csv`.

## File Structure

```
templates/
├── invoice_template.xml      # XML template
├── invoice_template.json     # JSON template
├── invoice_template.csv      # CSV template
├── invoice_schema.json       # JSON schema for validation
├── generated_*.xml/json/csv  # Auto-generated templates
backend/services/
├── InvoiceParser.js          # Multi-format parser
├── InvoiceImportService.js   # Import service
routes/
├── invoices.js               # API endpoints
scripts/
├── import_xml_invoice.js     # Legacy XML import script
├── generate_invoice_templates.js # Template generator
```

## API Usage

### Import Invoice

```http
POST /api/invoices/import
Content-Type: multipart/form-data

file: <invoice_file>
format: auto|xml|json|csv (optional, defaults to auto-detection)
```

**Response:**
```json
{
  "success": true,
  "invoiceId": 123,
  "invoiceUuid": "uuid-string",
  "message": "Invoice imported successfully",
  "format": "xml",
  "itemCount": 2
}
```

### Error Response:
```json
{
  "success": false,
  "error": "Validation failed: invoiceNumber is required"
}
```

## Template Fields

### General Information
- `invoiceNumber`: Unique invoice identifier (required)
- `pattern`: Invoice pattern (e.g., "01GTKT0/001")
- `serial`: Serial number (e.g., "AA/24P")
- `date`: Invoice date (YYYY-MM-DD)
- `dueDate`: Payment due date (YYYY-MM-DD)
- `currency`: Currency code (VND, USD, EUR)
- `paymentMethod`: Payment method

### Seller Information
- `name`: Supplier company name (required)
- `taxCode`: Tax identification number
- `address`: Supplier address
- `email`: Contact email
- `phone`: Contact phone

### Items
- `productName`: Product description (required)
- `unit`: Unit of measurement (default: "Cái")
- `quantity`: Quantity ordered (required)
- `unitPrice`: Price per unit (required)
- `totalAmount`: Total amount for item
- `taxRate`: Tax rate percentage (default: 10)
- `taxAmount`: Tax amount for item
- `discountAmount`: Discount for item
- `serials`: Serial numbers/IMEIs (comma-separated)

### Summary
- `subtotal`: Subtotal before tax
- `taxRate`: Overall tax rate
- `taxAmount`: Total tax amount
- `shippingFee`: Shipping/delivery fee
- `discountAmount`: Total discount
- `totalAmount`: Final total (required)

## Auto-Processing Features

### Supplier Management
- Automatically creates new suppliers if they don't exist
- Matches by tax code first, then by name
- Updates supplier information if found

### Product Cataloging
- Auto-creates products in the catalog
- Matches existing products by exact name
- Creates new product entries with pricing

### Serial Number Tracking
- Parses comma-separated serials/IMEIs
- Creates expected serial records for tracking
- Supports multiple serials per item

### Duplicate Prevention
- Checks for existing invoices by invoice number
- Returns existing invoice data if duplicate found
- Prevents double-importing

## Validation

### JSON Schema Validation
JSON invoices are validated against `invoice_schema.json` which includes:
- Required field validation
- Data type checking
- Format validation (email, date)
- Numeric range validation

### Business Logic Validation
- Invoice number uniqueness
- Positive amounts and quantities
- Valid tax rates (0-100%)
- Required supplier and item information

## Error Handling

The system provides detailed error messages for:
- Parsing errors (malformed files)
- Validation errors (missing required fields)
- Database errors (constraint violations)
- Duplicate invoice detection

## Scripts

### Generate Templates
```bash
node scripts/generate_invoice_templates.js
```
Generates fresh templates with sample data.

### Import Invoice (Legacy)
```bash
node scripts/import_xml_invoice.js <path_to_xml_file>
```
Imports a single XML invoice file.

## Examples

### XML Import
```bash
curl -X POST \
  http://localhost:3000/api/invoices/import \
  -F "file=@invoice.xml" \
  -F "format=xml"
```

### JSON Import
```bash
curl -X POST \
  http://localhost:3000/api/invoices/import \
  -F "file=@invoice.json" \
  -F "format=json"
```

### CSV Import
```bash
curl -X POST \
  http://localhost:3000/api/invoices/import \
  -F "file=@invoice.csv" \
  -F "format=csv"
```

## Troubleshooting

### Common Issues

1. **"Could not auto-detect invoice format"**
   - Specify format explicitly: `format=xml`
   - Check file encoding (should be UTF-8)

2. **"Validation failed"**
   - Check required fields are present
   - Verify data types and formats
   - See schema validation errors

3. **"Invoice already exists"**
   - This is normal for duplicate imports
   - Check invoice number uniqueness

4. **"Supplier not found"**
   - Supplier will be auto-created
   - Check supplier data in import file

### Debug Mode
Enable debug logging by setting environment variable:
```bash
DEBUG=invoice:* npm run dev
```

## Dependencies

- `fast-xml-parser`: XML parsing
- `ajv`: JSON schema validation
- `uuid`: Unique identifier generation
- `multer`: File upload handling

## Future Enhancements

- Support for additional formats (Excel, PDF)
- AI-powered data extraction from unstructured documents
- Batch import processing
- Import history and rollback functionality
- Advanced supplier matching algorithms