# Pointer & Reference Management Examples

## Immutability and Reference Isolation

```javascript
// ✅ Correct: Mapping a DB row array to new Objects ensures no cyclic references 
// and drops hidden Sequelize metadata properties that could crash JSON serialization.
async function getAsns(sql, params) {
    const rows = await sequelizeMaster.query(sql, { replacements: params, type: QueryTypes.SELECT });
    return rows.map(r => ({
        id: r.id,
        asn_number: r.asn_number,
        item_count: Number(r.item_count || 0)
    }));
}
```

## React State Management

```jsx
// ✅ Correct (React): Spreading existing array guarantees a new reference
// and forces a component re-render correctly.
function App() {
    const [items, setItems] = useState([]);
    
    function addItem(newItem) {
        setItems(prev => [...prev, newItem]);
    }
}

// ❌ Incorrect (React): Mutating the existing array in place
function BadApp() {
    const [state, setState] = useState({ items: [] });
    
    function addItem(newItem) {
        state.items.push(newItem); // BAD
    }
}
```

## WeakMap Cache

```javascript
// ✅ Correct (DOM Reference Management): Caching elements using a WeakMap allows 
// the browser garbage collector to remove elements no longer attached to the document
const domCache = new WeakMap();
domCache.set(document.getElementById('dialog'), { isOpen: true });
```
