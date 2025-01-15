---
trigger: always_on
---

# Mycelium ERP - AI Coding Assistant Instructions

## Project Overview
Mycelium is a full-stack Enterprise Resource Planning (ERP) system for inventory management, warehouse operations, RMA processing, and device repair workflows. Built with React frontend and Express.js backend using MariaDB databases.

## Architecture
- **Frontend**: React 19 + Vite + Bootstrap + React Query
- **Backend**: Express.js + MariaDB (`master_db` via raw pool) + Sequelize (`security_db` for auth)
- **Auth**: Session-based with cookie auth middleware (path-exclusion based)
- **Structure**: Service-oriented backend (22 services), 24 route files, Sequelize models (26 master + 4 security), lazy-loaded React components

## Critical Workflows

### Development Setup
```bash
npm install
# Copy .env.example to .env and configure DB credentials
npm run dev  # Vite dev server on :5173
```

### Database Setup
- Requires two MariaDB databases: `master_db` (business data) and `security_db` (auth/sessions/audit)
- `master_db` is accessed via a raw MariaDB connection pool (`/media/lechibang/Work and play/Work/mycelium/backend/config/database.js`)
- `security_db` is accessed via Sequelize ORM (`/media/lechibang/Work and play/Work/mycelium/backend/config/sequelize.js`)
- Import schemas from `/media/lechibang/Work and play/Work/mycelium/sql/master_db_export.sql` and `/media/lechibang/Work and play/Work/mycelium/sql/security_db_export.sql`

### Build & Deploy
```bash
npm run build       # Clean + Vite build to /dist + start server
npm run build:only  # Clean + Vite build without starting server
npm run build:quick # Vite build without cleaning
npm run build:full  # Same as build:only (legacy alias)
npm start           # Production server from /dist
```

### Testing
```bash
npm test              # All tests (Mocha + Chai)
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests
npm run test:coverage # With coverage report
npm run test:verify   # Check test environment
```

### Scheduled Jobs
```bash
npm run job:recommendations      # Generate reorder recommendations
npm run job:efficiency           # Generate efficiency reports
npm run job:check-exp-batches    # Check expiring batches
npm run job:check-exp-warranties # Check expiring warranties
npm run job:cleanup-phones       # Cleanup test phones
```

### Safety & Quality
```bash
npm run lint          # ESLint check
npm run lint:fix      # ESLint auto-fix
npm run knip          # Unused dependency check
npm run safety        # Full safety check (bash script)
npm run safety:quick  # Quick safety check (secrets, SQL, auth, errors)
npm run safety:audit  # npm audit
```

## Key Patterns & Conventions

### Backend Service Classes
- All services extend base classes with `pool` injection
- Use `withConnection()` and `withTransaction()` from `/media/lechibang/Work and play/Work/mycelium/backend/utils/queryHelper.js`
- Handle BigInt conversion with `convertBigIntToNumber` (from SanitizationService)
- Return standardized responses via `/media/lechibang/Work and play/Work/mycelium/backend/utils/response.js` utilities

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
Routes are grouped by domain in `/media/lechibang/Work and play/Work/mycelium/backend/routes/index.js`:
- `/auth` - Authentication
- `/users` - User management
- `/inventory`, `/receiving`, `/serialized-inventory` - Inventory operations
- `/warehouses` - Warehouse management
- `/invoices` - Invoice management
- `/stocktake` - Stocktake operations
- `/pc-components`, `/pc-inventory`, `/pc-builds` - PC component builds
- Service operations, location, catalog routes mounted at `/` (sub-routers)

Pre-auth routes mounted directly in `server.cjs`: `/api/audit`, `/api/reports`, `/api/receipts`

### Frontend Components
- Use lazy loading for all pages in `/media/lechibang/Work and play/Work/mycelium/frontend/App.jsx`
- Implement `PrivateRoute` wrapper for auth
- Use React Query for API state management
- Follow Bootstrap component patterns

### Error Handling
- Custom error classes: `ValidationError`, `NotFoundError`, `ConflictError`, `CapacityError`, `InsufficientStockError`
- Wrap route handlers with `asyncHandler` from `/media/lechibang/Work and play/Work/mycelium/backend/utils/asyncHandler.js`
- Global error handler in `/media/lechibang/Work and play/Work/mycelium/backend/middleware/errorHandler.js`

### Database Transactions
- Use `withTransaction()` from `/media/lechibang/Work and play/Work/mycelium/backend/utils/queryHelper.js` for multi-step operations
- All inventory movements logged to `inventory_log` table

## Integration Points

### Authentication
- Session-based auth with secure cookies (`session_id`)
- Auth middleware at `/media/lechibang/Work and play/Work/mycelium/backend/middleware/authMiddleware.js` uses `createAuthMiddleware({ excludePaths })` pattern
- `requireAuth` middleware for enforcing auth on specific routes
- Sessions and users stored in `security_db` via Sequelize models
- Audit logging for critical actions via `/media/lechibang/Work and play/Work/mycelium/backend/services/AuditService.js`

### File Uploads
- Use `multer` for file handling
- Store in `/media/lechibang/Work and play/Work/mycelium/public/uploads/` directory
- Access via `/uploads/*` routes

### Email (Optional)
- Configured via SMTP settings in `.env`
- Used for notifications/password reset

## Common Pitfalls

### Cross-Boundary Imports
- **Issue**: Frontend importing backend utilities (e.g., `formatters.js`)
- **Solution**: Duplicate shared utilities in frontend or create a shared module

### BigInt Handling
- MariaDB pool configured with `bigIntAsNumber: true` — handles this automatically
- Always use `convertBigIntToNumber` in route responses as an additional safety measure

### Database Connections
- Use connection pooling, never create direct connections
- Wrap queries with `withConnection()` or `withTransaction()`

### Route Mounting
- Consolidated routes mounted in `/media/lechibang/Work and play/Work/mycelium/backend/routes/index.js`
- Receipts, audit, and reports routes mounted before auth middleware in `/media/lechibang/Work and play/Work/mycelium/backend/server.cjs`

## Key Files Reference

### Entry Points
- `/media/lechibang/Work and play/Work/mycelium/backend/server.cjs` - Main server, middleware setup
- `/media/lechibang/Work and play/Work/mycelium/frontend/main.jsx` - React app entry
- `/media/lechibang/Work and play/Work/mycelium/frontend/App.jsx` - Routing configuration

### Services (22 total)
- `/media/lechibang/Work and play/Work/mycelium/backend/services/InventoryService.js` - Core inventory operations
- `/media/lechibang/Work and play/Work/mycelium/backend/services/InventoryTransactionService.js` - Stock movements
- `/media/lechibang/Work and play/Work/mycelium/backend/services/WarehouseService.js` - Warehouse/zone/bin management
- `/media/lechibang/Work and play/Work/mycelium/backend/services/AuthService.js` - Login, session, password hashing
- `/media/lechibang/Work and play/Work/mycelium/backend/services/AuditService.js` - Audit logging (uses security_db via Sequelize)
- `/media/lechibang/Work and play/Work/mycelium/backend/services/UsersService.js` - User management
- `/media/lechibang/Work and play/Work/mycelium/backend/services/RepairService.js` - Repair job management
- `/media/lechibang/Work and play/Work/mycelium/backend/services/RMAService.js` - Return merchandise authorization
- `/media/lechibang/Work and play/Work/mycelium/backend/services/SparePartsService.js` - Spare parts management
- `/media/lechibang/Work and play/Work/mycelium/backend/services/PhonesService.js` - Phone/device management
- `/media/lechibang/Work and play/Work/mycelium/backend/services/SerializedInventoryService.js` - Serialized inventory tracking
- `/media/lechibang/Work and play/Work/mycelium/backend/services/InvoiceService.js` - Invoice management
- `/media/lechibang/Work and play/Work/mycelium/backend/services/InvoiceReceivingService.js` - Invoice receiving
- `/media/lechibang/Work and play/Work/mycelium/backend/services/SupplierService.js` - Supplier management
- `/media/lechibang/Work and play/Work/mycelium/backend/services/StocktakeService.js` - Stocktake operations
- `/media/lechibang/Work and play/Work/mycelium/backend/services/ReportsService.js` - Report generation
- `/media/lechibang/Work and play/Work/mycelium/backend/services/ReceiptsService.js` - Receipt management
- `/media/lechibang/Work and play/Work/mycelium/backend/services/RepairJobTemplateService.js` - Repair job templates
- `/media/lechibang/Work and play/Work/mycelium/backend/services/PCBuildService.js` - PC build management
- `/media/lechibang/Work and play/Work/mycelium/backend/services/PCComponentService.js` - PC component management
- `/media/lechibang/Work and play/Work/mycelium/backend/services/PCInventoryService.js` - PC inventory tracking
- `/media/lechibang/Work and play/Work/mycelium/backend/services/SanitizationService.js` - Data sanitization, BigInt conversion

### Configuration
- `/media/lechibang/Work and play/Work/mycelium/backend/config/database.js` - MariaDB connection pool (master_db)
- `/media/lechibang/Work and play/Work/mycelium/backend/config/sequelize.js` - Sequelize ORM config (master_db + security_db)
- `/media/lechibang/Work and play/Work/mycelium/backend/config/vite.config.mjs` - Build configuration
- `/media/lechibang/Work and play/Work/mycelium/.env.example` - Required environment variables

### Models
- `/media/lechibang/Work and play/Work/mycelium/backend/models/master/` - 26 Sequelize models for business data
- `/media/lechibang/Work and play/Work/mycelium/backend/models/security/` - 4 Sequelize models (User, Session, AuditLog, index)

### Utilities
- `/media/lechibang/Work and play/Work/mycelium/backend/utils/queryHelper.js` - DB connection management (`withConnection`, `withTransaction`, `query`, `queryOne`, `queryValue`, `exists`, `insert`, `update`, `findById`, `findAll`, `isValidIdentifier`)
- `/media/lechibang/Work and play/Work/mycelium/backend/utils/response.js` - API response formatting
- `/media/lechibang/Work and play/Work/mycelium/backend/utils/asyncHandler.js` - Error handling wrapper
- `/media/lechibang/Work and play/Work/mycelium/backend/utils/errors.js` - Custom error classes
- `/media/lechibang/Work and play/Work/mycelium/backend/utils/generateId.js` - ID generation utilities
- `/media/lechibang/Work and play/Work/mycelium/backend/utils/singleInstance.js` - Single server instance enforcement

## Development Best Practices

### Adding New Features
1. **Backend**: Create service class, add route file, register in `/media/lechibang/Work and play/Work/mycelium/backend/routes/index.js`
2. **Frontend**: Create lazy-loaded page component, add route in `/media/lechibang/Work and play/Work/mycelium/frontend/App.jsx`
3. **Database**: Add migrations, update schema docs
4. **Testing**: Add unit tests in `/media/lechibang/Work and play/Work/mycelium/scripts/tests/unit/`, integration in `/media/lechibang/Work and play/Work/mycelium/scripts/tests/integration/`

### Code Quality
- Run `npm run lint` and `npm run lint:fix`
- Use `npm run knip` to check for unused dependencies
- Follow ESLint rules (no console.log except warn/error, proper error handling)

### Debugging
- Check server logs in console/terminal and `server.log`
- Attach debugger to Node process for backend
- React DevTools for frontend debugging

## Testing Strategy
- Unit tests for service methods
- Integration tests for API endpoints
- Use test database (configure `TEST_DB_NAME` in `.env`)
- Test helpers in `/media/lechibang/Work and play/Work/mycelium/scripts/tests/helpers/`
- Run `npm run test:verify` to check test environment
