# Security Hardening Examples

## SQL Injection Prevention

```javascript
// ✅ Correct: Values are parameterized, shielding us from SQL Injection
async function correctQueryBinding(asnId, asnData, po, t) {
    await sequelizeMaster.query(`
        INSERT INTO advance_shipping_notices (
            id, asn_number, po_id, status
        ) VALUES (?, ?, ?, 'pending')
    `, {
        replacements: [asnId, asnData.asn_number, po.id],
        type: QueryTypes.INSERT,
        transaction: t
    });
}

// ❌ Incorrect: Never string literal user input directly into SQL queries
async function vulnerableQueryBinding(req) {
    await sequelizeMaster.query(`
        SELECT * FROM advance_shipping_notices WHERE asn_number = '${req.body.asn}'
    `); // Vulnerable to SQLi
}

// ✅ Correct: Escaping values for arbitrary user input
async function safeArbitraryInput(req) {
    const { isValidIdentifier } = require('../utils/queryHelper');
    if (!isValidIdentifier(req.body.sortColumn)) throw new ValidationError('Invalid sort column');
    await sequelizeMaster.query(`SELECT * FROM test ORDER BY ${req.body.sortColumn} DESC`);
}
```
