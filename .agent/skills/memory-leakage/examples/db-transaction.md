# Memory Leakage Examples

## Database Transactions

```javascript
// ✅ Correct: Transaction is automatically released via the t wrapper
async function exampleCorrectTransaction(asnData) {
    return await sequelizeMaster.transaction(async (t) => {
        const [po] = await sequelizeMaster.query(
            `SELECT id FROM purchase_orders WHERE po_number = ?`,
            { replacements: [asnData.po_number], type: QueryTypes.SELECT, transaction: t }
        );
        // ... insert logic
        return { success: true };
    });
}

// ❌ Incorrect: Connection acquired but never explicitly released, leaving it dangling
async function exampleIncorrectTransaction() {
    const conn = await pool.getConnection();
    const [result] = await conn.query('SELECT * FROM users');
    // Missing conn.release(); leak occurs here!
    return result;
}
```

## React Frontend Cleanup

```jsx
import { useEffect } from 'react';

// ✅ Correct: Frontend React interval cleanup
function PollingComponent() {
    useEffect(() => {
        let isMounted = true;
        const interval = setInterval(() => {
            if (isMounted) console.log('Polling data...');
        }, 5000);
        
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    return <div>Polling...</div>;
}
```
