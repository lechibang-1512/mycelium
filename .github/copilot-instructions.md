# Mycelium ERP - AI Coding Assistant Instructions

## Project Overview
Mycelium is a full-stack Enterprise Resource Planning (ERP) system for inventory management, warehouse operations, RMA processing, and device repair workflows. Built with React frontend and Express.js backend using MariaDB databases.

## Architecture
- **Frontend**: React 19 + Vite + Bootstrap + React Query
- **Backend**: Express.js + MariaDB (master_db + security_db)
- **Auth**: Session-based with Casbin RBAC
- **Structure**: Service-oriented backend (27 services), consolidated routes, lazy-loaded React components

## Critical Workflows

### Development Setup
```bash
npm install
# Copy .env.example to .env and configure DB credentials
npm run dev  # Vite dev server on :5173
```

### Database Setup
- Requires two MariaDB databases: `master_db` (business data) and `security_db` (auth/RBAC)
- Import schemas from `sql/master_db_export.sql` and `sql/security_db_export.sql`
- Server auto-syncs RBAC permissions from code definitions on startup

### Build & Deploy
```bash
npm run build     # Clean + Vite build to /dist
npm start         # Production server from /dist
npm run build:only  # Build without cleaning
```

### Testing
```bash
npm test              # All tests (Mocha + Chai)
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests
npm run test:coverage # With coverage report
```

### Scheduled Jobs
```bash
npm run job:recommendations    # Generate reorder recommendations
npm run job:efficiency        # Generate efficiency reports
npm run job:check-exp-batches # Check expiring batches
npm run job:check-exp-warranties  # Check expiring warranties
```

## Key Patterns & Conventions

### Backend Service Classes
- All services extend base classes with `pool` injection
- Use `withConnection()` and `withTransaction()` from `queryHelper.js`
- Handle BigInt conversion with `convertBigIntToNumber` (from SanitizationService)
- Return standardized responses via `response.js` utilities

Example service method:
```javascript
async getInventory(filters) {
    return withConnection(this.pool, async (conn) => {
        // Query logic here
        return sendSuccess(result);
    });
}
```

### Route Consolidation
Routes are grouped by domain in `backend/routes/index.js`:
- `/inventory*` - Inventory operations
- `/warehouses` - Warehouse management
- `/service*` - Repairs/RMA/spare parts
- `/rbac/*` - Role/permission management

### Frontend Components
- Use lazy loading for all pages in `App.jsx`
- Implement `PrivateRoute` wrapper for auth
- Use React Query for API state management
- Follow Bootstrap component patterns

### Error Handling
- Custom error classes: `ValidationError`, `NotFoundError`, `CapacityError`, `InsufficientStockError`
- Wrap route handlers with `asyncHandler` from `utils/asyncHandler.js`
- Global error handler in `middleware/errorHandler.js`

### Database Transactions
- Use `withTransaction()` for multi-step operations
- Automatic deadlock retry in `database-transaction-helper.js`
- All inventory movements logged to `inventory_log` table

## Integration Points

### Authentication & RBAC
- Session-based auth with secure cookies
- Casbin policies stored in `security_db.casbin_rule`
- Permission checks via `RBACService.checkPermission()`
- Audit logging for all critical actions

### File Uploads
- Use `multer` for file handling
- Store in `/public/uploads/` directory
- Access via `/uploads/*` routes

### Email (Optional)
- Configured via SMTP settings in `.env`
- Used for notifications/password reset

## Common Pitfalls

### Cross-Boundary Imports
- **Issue**: Frontend importing backend utilities (e.g., `formatters.js`)
- **Solution**: Move shared utilities to `shared/` directory or duplicate in frontend

### BigInt Handling
- MariaDB returns BigInt, but JSON can't serialize
- Always use `convertBigIntToNumber` in route responses

### Database Connections
- Use connection pooling, never create direct connections
- Wrap queries with `withConnection()` or `withTransaction()`

### Route Mounting
- Consolidated routes mounted in `backend/routes/index.js`
- Receipts route mounted before auth middleware in `server.cjs`

## Key Files Reference

### Entry Points
- `backend/server.cjs` - Main server, middleware setup, RBAC sync
- `frontend/main.jsx` - React app entry
- `frontend/App.jsx` - Routing configuration

### Core Services
- `backend/services/InventoryService.js` - Core inventory operations
- `backend/services/InventoryTransactionService.js` - Stock movements
- `backend/services/RBACService.js` - Permission management
- `backend/services/CasbinService.js` - Authorization enforcement

### Configuration
- `backend/config/database.js` - DB connection pool
- `backend/config/vite.config.mjs` - Build configuration
- `.env.example` - Required environment variables

### Utilities
- `backend/utils/queryHelper.js` - DB connection management
- `backend/utils/response.js` - API response formatting
- `backend/utils/asyncHandler.js` - Error handling wrapper

## Development Best Practices

### Adding New Features
1. **Backend**: Create service class, add route, update RBAC if needed
2. **Frontend**: Create lazy-loaded page component, add route in `App.jsx`
3. **Database**: Add migrations, update schema docs
4. **Testing**: Add unit tests in `scripts/tests/unit/`, integration in `scripts/tests/integration/`

### Code Quality
- Run `npm run lint` and `npm run lint:fix`
- Use `npm run knip` to check for unused dependencies
- Follow ESLint rules (no console.log except warn/error, proper error handling)

### Debugging
- Check server logs in console/terminal
- Use `console.log` for debugging (allowed per ESLint)
- Attach debugger to Node process for backend
- React DevTools for frontend debugging

## Testing Strategy
- Unit tests for service methods
- Integration tests for API endpoints
- Use test database (configure `TEST_DB_NAME` in `.env`)
- Test helpers in `scripts/tests/helpers/`
- Run `npm run test:verify` to check test environment