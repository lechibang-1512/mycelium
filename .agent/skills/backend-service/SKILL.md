---
name: Backend Service Development
description: How to create and modify backend services in Mycelium
---

# Backend Service Development

## Overview

Backend services in Mycelium handle business logic and database operations. They are located in `backend/services/` and follow consistent patterns.

## Service Structure

```javascript
// backend/services/ExampleService.js

const Model = require('../models/Model');

class ExampleService {
  /**
   * Get all items with optional filters
   * @param {Object} filters - Query filters
   * @returns {Promise<Array>}
   */
  static async getAll(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    return Model.find(query).lean();
  }

  /**
   * Get single item by ID
   * @param {string} id - MongoDB ObjectId
   * @returns {Promise<Object|null>}
   */
  static async getById(id) {
    return Model.findById(id).lean();
  }

  /**
   * Create new item
   * @param {Object} data - Item data
   * @returns {Promise<Object>}
   */
  static async create(data) {
    const item = new Model(data);
    return item.save();
  }

  /**
   * Update item
   * @param {string} id - MongoDB ObjectId
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>}
   */
  static async update(id, updates) {
    return Model.findByIdAndUpdate(id, updates, { new: true }).lean();
  }

  /**
   * Delete item
   * @param {string} id - MongoDB ObjectId
   * @returns {Promise<boolean>}
   */
  static async delete(id) {
    const result = await Model.findByIdAndDelete(id);
    return !!result;
  }
}

module.exports = ExampleService;
```

## Steps to Create a New Service

1. **Create service file** in `backend/services/`
2. **Import required models** from `backend/models/`
3. **Implement CRUD methods** using static async methods
4. **Use `.lean()`** for read operations (returns plain objects)
5. **Handle errors** - let them propagate to route error handler
6. **Create corresponding route** in `backend/routes/`

## Common Patterns

### Pagination
```javascript
static async getPaginated(page = 1, limit = 20, filters = {}) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Model.find(filters).skip(skip).limit(limit).lean(),
    Model.countDocuments(filters)
  ]);
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}
```

### Population (Joins)
```javascript
static async getWithRelations(id) {
  return Model.findById(id)
    .populate('warehouse', 'name code')
    .populate('supplier', 'name')
    .lean();
}
```

### Transactions
```javascript
const mongoose = require('mongoose');

static async complexOperation(data) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Multiple operations...
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

## Existing Services Reference

| Service | Models Used | Key Methods |
|---------|-------------|-------------|
| `InventoryService` | Inventory, Product, Warehouse | `getAll`, `transfer`, `adjustQuantity` |
| `WarehouseService` | Warehouse | `getAll`, `createZone`, `createBin` |
| `SupplierService` | Supplier | `getAll`, `create`, `update` |
| `RMAService` | RMA, Inventory | `create`, `updateStatus`, `process` |
| `CasbinService` | CasbinRule, Role, User | `enforce`, `syncFromMongoDB` |

## Testing

Create tests in `scripts/tests/` following naming convention `ServiceName.test.js`.

```javascript
const { expect } = require('chai');
const ExampleService = require('../../backend/services/ExampleService');

describe('ExampleService', () => {
  describe('getAll', () => {
    it('should return all items', async () => {
      const items = await ExampleService.getAll();
      expect(items).to.be.an('array');
    });
  });
});
```
