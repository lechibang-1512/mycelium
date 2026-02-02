---
trigger: always_on
---

# API Response Format

All API responses MUST follow this consistent format:

## Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

## Error Response
```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error message"
}
```

## Status Codes

| Code | Usage |
|------|-------|
| 200 | Success (GET, PUT, DELETE) |
| 201 | Created (POST) |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (not logged in) |
| 403 | Forbidden (no permission) |
| 404 | Not found |
| 500 | Internal server error |

## Example Route Implementation

```javascript
router.get('/:id', async (req, res, next) => {
  try {
    const item = await Service.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: 'Item not found' 
      });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});
```
