# Mycelium ERP - Agent Guide

## Project Overview

**Mycelium** is a full-stack warehouse and inventory management ERP system for phone repair businesses. It manages inventory, warehouses, suppliers, RMA workflows, repair jobs, and spare parts.

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 + Vite, React Bootstrap, React Query |
| **Backend** | Express 5, Node.js |
| **Database** | MongoDB (Mongoose 9) |
| **Authorization** | Casbin with MongoDB adapter |
| **Testing** | Mocha, Chai, Supertest |

---

## Directory Structure

```
mycelium/
├── backend/
│   ├── config/          # MongoDB, Vite, Mocha configs
│   ├── middleware/      # Auth, error handling, rate limiting
│   ├── models/          # Mongoose schemas (15 models)
│   ├── routes/          # Express route handlers (27 routes)
│   ├── services/        # Business logic services (29 services)
│   ├── utils/           # Utility functions
│   └── server.cjs       # Main server entry point
├── frontend/
│   ├── components/      # Reusable React components
│   ├── pages/           # Page-level components
│   ├── services/        # API service layer
│   ├── contexts/        # React contexts (Auth, Theme)
│   └── App.jsx          # Root component with routing
├── scripts/
│   ├── tests/           # Test suites
│   ├── jobs/            # Scheduled job scripts
│   ├── tools/           # Utility scripts
│   └── db/              # Database migration scripts
└── public/              # Static assets, mobile app
```

---

## Key Services

| Service | Purpose |
|---------|---------|
| `CasbinService` | RBAC policy enforcement with MongoDB |
| `InventoryService` | Core inventory CRUD and tracking |
| `WarehouseService` | Warehouse and zone/bin management |
| `SupplierService` | Supplier management |
| `RMAService` | Return Merchandise Authorization workflow |
| `RepairService` | Repair job tracking |
| `SparePartsService` | Spare parts inventory |
| `AuthService` | Authentication and session management |

---

## Key Models

| Model | Description |
|-------|-------------|
| `User` | User accounts with role references |
| `Role` | Roles with permission arrays |
| `Inventory` | Inventory items with warehouse/zone/bin refs |
| `Warehouse` | Warehouses containing zones and bins |
| `Supplier` | Supplier information |
| `RMA` | Return requests with status workflow |
| `RepairJob` | Repair job tracking |
| `Transaction` | Inventory transaction log |

---

## Common Commands

```bash
# Development
npm run dev              # Start Vite dev server

# Production
npm run build            # Clean, build, and start server

# Testing
npm test                 # Run all tests
npm run test:unit        # Run unit tests only
npm run test:integration # Run integration tests

# Utilities
npm run lint             # ESLint check
npm run lint:fix         # Fix auto-fixable issues
npm run knip             # Find dead code
```

---

## IMPORTANT RULES

> [!CAUTION]
> **Database Access**: For database operations, always verify against MongoDB. The MariaDB references in older files are legacy - the system has been fully migrated to MongoDB.

> [!WARNING]
> **Build Command**: Always use `npm run build` for production builds. This ensures clean, build, and server start.

> [!IMPORTANT]
> **Casbin RBAC**: The authorization system uses Casbin with `casbin-mongoose-adapter`. Policies sync from the `Role` model on server startup. Changes to permissions require `CasbinService.syncFromMongoDB()`.

---

## API Patterns

### Authentication
- JWT-based with session cookies
- Auth middleware excludes: `/api/auth/*`, `/api/health`, `/api/ua-test`
- Receipts route is intentionally unauthenticated

### Response Format
All API responses follow consistent structure:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

### Error Handling
- `notFoundHandler` for 404s
- `errorHandler` for all other errors
- BigInt values auto-converted to Number

---

## Testing Notes

- Test files are in `scripts/tests/`
- Uses Mocha + Chai + Supertest
- MongoDB fixtures for integration tests
- Coverage reports via c8

---

## Related Knowledge Items

For detailed implementation context, check these Knowledge Items:
- **RBAC and Permissions System Implementation** - Casbin setup and policy management
- **Database Evolution: MariaDB to MongoDB** - Migration patterns and Mongoose models
- **Frontend CRUD Alignment** - UI patterns and component standards
- **System Testing Framework** - Test structure and execution
