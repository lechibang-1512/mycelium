---
trigger: always_on
---

# Error Handling Rules

## Backend

### Route Handlers
```javascript
router.post('/', async (req, res, next) => {
  try {
    const result = await Service.create(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);  // Let error middleware handle it
  }
});
```

### Service Methods.
```javascript
// Let errors propagate - don't catch and re-throw with less info
static async create(data) {
  const doc = new Model(data);
  return doc.save();  // Mongoose validation errors propagate
}
```

### Validation Errors
```javascript
// Return 400 for client errors
if (!req.body.name) {
  return res.status(400).json({
    success: false,
    message: 'Name is required'
  });
}
```

### Not Found Errors
```javascript
const item = await Service.getById(id);
if (!item) {
  return res.status(404).json({
    success: false,
    message: 'Item not found'
  });
}
```

## Frontend

### API Service Calls
```javascript
// Let errors propagate to React Query
const InventoryService = {
  async getAll() {
    const { data } = await axios.get('/api/inventory');
    if (!data.success) throw new Error(data.message);
    return data.data;
  }
};
```

### React Query Error Handling
```javascript
const mutation = useMutation({
  mutationFn: Service.create,
  onError: (error) => {
    toast.error(error.message || 'Operation failed');
  }
});
```

### Component Error States
```jsx
const { data, isLoading, error } = useQuery({...});

if (error) {
  return <Alert variant="danger">{error.message}</Alert>;
}
```

## Never Do

❌ Swallow errors silently
```javascript
try { ... } catch (e) { /* ignore */ }
```

❌ Return 200 for errors
```javascript
res.json({ success: false, error: 'Failed' }); // Should be 4xx/5xx
```

❌ Expose internal errors to client
```javascript
res.status(500).json({ error: error.stack }); // Security risk
```
