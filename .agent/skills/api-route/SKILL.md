---
name: API Route Development
description: How to create and modify Express API routes in Mycelium
---

# API Route Development

## Overview

API routes in Mycelium handle HTTP requests and delegate to services. Located in `backend/routes/`.

## Route Structure

```javascript
// backend/routes/example.js

const express = require('express');
const ExampleService = require('../services/ExampleService');
const { checkPermission } = require('../middleware/authMiddleware');

module.exports = function() {
  const router = express.Router();

  /**
   * GET /api/example
   * List all items
   */
  router.get('/', checkPermission('example', 'read'), async (req, res, next) => {
    try {
      const items = await ExampleService.getAll(req.query);
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/example/:id
   * Get single item
   */
  router.get('/:id', checkPermission('example', 'read'), async (req, res, next) => {
    try {
      const item = await ExampleService.getById(req.params.id);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }
      res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/example
   * Create new item
   */
  router.post('/', checkPermission('example', 'create'), async (req, res, next) => {
    try {
      const item = await ExampleService.create(req.body);
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  });

  /**
   * PUT /api/example/:id
   * Update item
   */
  router.put('/:id', checkPermission('example', 'update'), async (req, res, next) => {
    try {
      const item = await ExampleService.update(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }
      res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  });

  /**
   * DELETE /api/example/:id
   * Delete item
   */
  router.delete('/:id', checkPermission('example', 'delete'), async (req, res, next) => {
    try {
      const deleted = await ExampleService.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }
      res.json({ success: true, message: 'Item deleted' });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
```

## Steps to Create a New Route

1. **Create route file** in `backend/routes/`
2. **Export a factory function** that returns the router
3. **Import service** for business logic
4. **Add permission checks** using `checkPermission(resource, action)`
5. **Register route** in `backend/routes/index.js`

## Registering Routes

Edit `backend/routes/index.js`:

```javascript
// Add import
const exampleRoutes = require('./example');

// In the module.exports function, add:
router.use('/example', exampleRoutes());
```

## Response Patterns

### Success
```javascript
res.json({ success: true, data: result });
res.status(201).json({ success: true, data: created, message: 'Created successfully' });
```

### Error (let middleware handle)
```javascript
// Throw and let errorHandler middleware format response
throw new Error('Validation failed');

// Or return specific status
return res.status(400).json({ success: false, message: 'Invalid input' });
return res.status(404).json({ success: false, message: 'Not found' });
```

## Permission System

Routes use Casbin for authorization:

```javascript
const { checkPermission } = require('../middleware/authMiddleware');

// Single permission
router.get('/', checkPermission('inventory', 'read'), handler);

// The permission format is (resource, action)
// Actions: read, create, update, delete
```

### Adding New Permissions

1. Add permission to `backend/config/permissionsRegistry.js`
2. Assign to roles in database
3. Run `CasbinService.syncFromMongoDB()` or restart server

## Existing Routes Reference

| Route File | Prefix | Service Used |
|------------|--------|--------------|
| `inventory.js` | `/api/inventory` | InventoryService |
| `warehouses.js` | `/api/warehouses` | WarehouseService |
| `suppliers.js` | `/api/suppliers` | SupplierService |
| `users.js` | `/api/users` | UsersService |
| `rbac.js` | `/api/rbac` | CasbinService |
| `auth.js` | `/api/auth` | AuthService |

## Testing Routes

```javascript
const request = require('supertest');
const app = require('../../backend/server.cjs');

describe('GET /api/example', () => {
  it('should return items', async () => {
    const res = await request(app)
      .get('/api/example')
      .set('Cookie', `session=${validSessionToken}`)
      .expect(200);
    
    expect(res.body.success).to.be.true;
    expect(res.body.data).to.be.an('array');
  });
});
```
