# Mycelium — System Requirements & Specifications

> **Version:** 2.0  
> **Last Updated:** October 13, 2025  
> **Status:** Living Document

This document provides comprehensive requirements, use cases, and specifications for the Mycelium inventory management system. It serves as the authoritative reference for developers, testers, product owners, and system integrators.

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Actors & Roles](#actors--roles)
4. [Functional Requirements](#functional-requirements)
5. [Non-Functional Requirements](#non-functional-requirements)
6. [Use Cases by Actor](#use-cases-by-actor)
7. [Data Model](#data-model)
8. [Process Diagrams Reference](#process-diagrams-reference)
9. [Testing & Validation](#testing--validation)
10. [Appendices](#appendices)


---

## Overview

**Mycelium** is an enterprise-grade, web-based inventory management system designed for small-to-medium businesses managing complex warehouse operations. The system prioritizes security, auditability, and operational efficiency through:

- **Multi-warehouse & zone management** with precise bin-level tracking
- **Batch tracking & FIFO/FEFO** strategies for compliance and freshness
- **Serialized inventory tracking** with complete lifecycle history
- **Dynamic session security** with token invalidation and secret rotation
- **QR code integration** for rapid product/location identification
- **Real-time analytics & alerts** for proactive inventory management
- **Comprehensive audit logging** for security and compliance

### Key Capabilities

| Capability | Description |
|-----------|-------------|
| **Inventory Control** | Multi-level tracking (warehouse → zone → bin → batch → serial) |
| **Receipt Management** | Immutable purchase and sales receipts with full traceability |
| **Supplier Management** | Complete supplier lifecycle with performance tracking |
| **Access Control** | Role-based permissions (Admin, Staff) with session management |
| **Analytics** | Real-time dashboards for inventory, receipts, and warehouse KPIs |
| **Security** | CSRF protection, rate limiting, audit logging, password policies |

### Technology Stack

- **Backend:** Node.js with Express.js
- **Database:** MariaDB (3 logical databases: master_specs_db, suppliers_db, security_db)
- **Session Management:** Dynamic secrets with token invalidation
- **View Engine:** EJS templates
- **Authentication:** bcrypt password hashing, session-based auth
- **Services:** Modular service architecture (WarehouseService, AnalyticsService, etc.)

---

## System Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (Browser)                   │
│  EJS Templates │ Client-side JS │ CSS │ QR Scanner          │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────────────┐
│                   Application Layer (Node.js)                │
├─────────────────────────────────────────────────────────────┤
│  Routes:  auth │ users │ inventory │ warehouses │ suppliers  │
│           receipts │ analytics │ qrcode │ reports            │
├─────────────────────────────────────────────────────────────┤
│  Middleware: auth │ CSRF │ rateLimiting │ security │         │
│              inputValidation │ errorHandler                  │
├─────────────────────────────────────────────────────────────┤
│  Services: WarehouseService │ AnalyticsService │             │
│            QRCodeService │ SessionManagementService │        │
│            SecurityLogger │ ReceiptService                   │
└───────────────────────┬─────────────────────────────────────┘
                        │ MariaDB Protocol
┌───────────────────────▼─────────────────────────────────────┐
│                   Data Layer (MariaDB)                       │
├─────────────────────────────────────────────────────────────┤
│  master_specs_db:  specs_db │ warehouses │ zones │          │
│    inventory_batches │ serialized_inventory │ receipts      │
├─────────────────────────────────────────────────────────────┤
│  suppliers_db:  suppliers │ supplier_contacts                │
├─────────────────────────────────────────────────────────────┤
│  security_db:  users │ security_events │ session_secrets │  │
│    token_invalidation                                        │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow Example

1. **User Action:** Staff clicks "Receive Stock"
2. **Route Handler:** `/inventory/receive` (routes/inventory.js)
3. **Middleware:** `isStaffOrAdmin` validates session → `csrfProtection` validates token
4. **Service Layer:** `WarehouseService.getWarehouses()` retrieves data
5. **Database:** Query `master_specs_db.warehouses`
6. **Response:** Render `receive-stock.ejs` with data
7. **Client:** Display form with warehouse dropdown

---

## Actors & Roles

### Role Definitions

The system implements role-based access control (RBAC) with the following actors:

#### 1. **Warehouse Admin** (`role: 'admin'`)

**Full system access with administrative privileges**

- **User Management:** Create, edit, delete users; manage roles; reset passwords; bulk operations
- **Session Management:** View all active sessions; force logout users; manage session secrets
- **Inventory Control:** All staff capabilities PLUS delete products, delete receipts (bulk), delete suppliers
- **System Configuration:** Manage warehouses, zones, bins; configure alerts; system settings
- **Analytics Access:** Full access to all dashboards, reports, and exports

**Key Routes:** `/users/*`, `/admin/sessions/*`, all inventory/warehouse routes

#### 2. **Warehouse Staff** (`role: 'staff'`)

**Operational inventory and warehouse management**

- **Inventory Operations:** View, add, edit products; receive stock; sell stock; transfer inventory
- **Warehouse Management:** View warehouses/zones; manage bin locations; check availability
- **Supplier Management:** View, add, edit suppliers; toggle status
- **Receipt Operations:** Create, view receipts; generate QR codes; export data
- **QR Code Functions:** Generate QR codes for products/locations; scan QR codes
- **Reports:** View analytics dashboards (read-only); access reports

**Key Routes:** `/inventory/*`, `/warehouses/*`, `/suppliers/*`, `/receipts/*`, `/qrcode/*`

#### 3. **All Authenticated Users**

**Base read-only capabilities**

- View dashboard, reports, product details, supplier list, receipt history
- Update own profile; change own password
- Access QR code scanner; view stock alerts

#### 4. **System (Automated)**

**Background processes and scheduled jobs**

- Scheduled analytics updates; batch expiry checks; stock alert generation
- Session cleanup; token management; security event logging
- Audit trail maintenance; notification delivery

### Authorization Matrix

| Capability | Admin | Staff | Authenticated |
|-----------|:-----:|:-----:|:------------:|
| **User Management** |
| Create/Edit/Delete Users | ✓ | ✗ | ✗ |
| View User List | ✓ | ✗ | ✗ |
| Reset Passwords | ✓ | ✗ | ✗ |
| **Session Management** |
| View All Sessions | ✓ | ✗ | ✗ |
| Force Logout Users | ✓ | ✗ | ✗ |
| Manage Session Secrets | ✓ | ✗ | ✗ |
| **Inventory** |
| View Products | ✓ | ✓ | ✓ |
| Create/Edit Products | ✓ | ✓ | ✗ |
| Delete Products | ✓ | ✗ | ✗ |
| Receive Stock | ✓ | ✓ | ✗ |
| Sell Stock | ✓ | ✓ | ✗ |
| Transfer Inventory | ✓ | ✓ | ✗ |
| **Warehouses** |
| View Warehouses/Zones | ✓ | ✓ | ✓ |
| Create/Edit Warehouses | ✓ | ✓ | ✗ |
| Manage Zones/Bins | ✓ | ✓ | ✗ |
| **Suppliers** |
| View Suppliers | ✓ | ✓ | ✓ |
| Create/Edit Suppliers | ✓ | ✓ | ✗ |
| Delete Suppliers | ✓ | ✓ | ✗ |
| Toggle Supplier Status | ✓ | ✓ | ✗ |
| **Receipts** |
| View Receipts | ✓ | ✓ | ✓ |
| Create Receipts | ✓ | ✓ | ✗ |
| Delete Receipts | ✓ | ✗ | ✗ |
| Export Receipts | ✓ | ✓ | ✗ |
| **QR Codes** |
| Scan QR Codes | ✓ | ✓ | ✓ |
| Generate QR Codes | ✓ | ✓ | ✗ |
| **Analytics** |
| View Dashboards | ✓ | ✓ | ✓ |
| Export Reports | ✓ | ✓ | ✗ |
| **Profile** |
| Update Own Profile | ✓ | ✓ | ✓ |

### Middleware Implementation

```javascript
// Authentication check (all authenticated users)
isAuthenticated: (req, res, next) => {
  if (req.session && req.session.user) return next();
  return res.redirect('/login');
}

// Staff or Admin check
isStaffOrAdmin: (req, res, next) => {
  if (req.session.user && ['staff', 'admin'].includes(req.session.user.role)) {
    return next();
  }
  return res.status(403).render('error', { message: 'Forbidden' });
}

// Admin only check
isAdmin: (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(403).render('error', { message: 'Admin access required' });
}
```

---

## Functional Requirements

Requirements are organized by domain with unique identifiers (FR-###) for traceability.

### FR-1. Authentication & User Management
- **FR-1.1** Username/email + password authentication with bcrypt hashing and session management
- **FR-1.2** Password recovery flow with secure one-time tokens (1-hour expiry)
- **FR-1.3** Dynamic session secrets with rotation capability and token invalidation
- **FR-1.4** Admin session management: view/terminate user sessions, force logout
- **FR-1.5** Account lockout after failed login attempts (configurable, default: 5)
- **FR-1.6** CSRF protection on all state-changing operations
- **FR-1.7** Role-based access control (Admin, Staff) with pluggable middleware

### FR-2. Inventory Management
- **FR-2.1** Product catalog with SKU, name, description, pricing, and supplier references
- **FR-2.2** CRUD operations for inventory items with soft delete support
- **FR-2.3** Multi-level tracking: warehouse → zone → bin → batch → serial number
- **FR-2.4** Serialized inventory with unique serial numbers and complete lifecycle history
- **FR-2.5** Prevent negative stock levels with configurable overrides
- **FR-2.6** Batch tracking with FIFO and FEFO selection strategies

### FR-3. Warehouse & Location Management
- **FR-3.1** Multi-warehouse support with hierarchical zone structures
- **FR-3.2** Zone types: receiving, storage, picking, shipping, returns, quarantine
- **FR-3.3** Bin location management with aisle-shelf-bin addressing
- **FR-3.4** Capacity validation before stock placement and transfers
- **FR-3.5** Auto-create default zones when adding new warehouses
- **FR-3.6** Intra-warehouse and inter-warehouse transfers with status tracking

### FR-4. Supplier Management
- **FR-4.1** Supplier master data: contact info, lead times, payment terms
- **FR-4.2** Supplier performance tracking and status management
- **FR-4.3** Reference suppliers on receipts and purchase records

### FR-5. Receipts & Transactions
- **FR-5.1** Create immutable receipt records for incoming stock with unique identifiers
- **FR-5.2** Sales/outgoing receipts that decrement inventory
- **FR-5.3** Receipt line items with quantities, costs, and optional serial numbers
- **FR-5.4** Multi-format receipt export (PDF, CSV, Excel, JSON, print)
- **FR-5.5** Bulk receipt operations and document generation

### FR-6. QR Code Integration
- **FR-6.1** Generate QR codes for products, locations, batches, and serials
- **FR-6.2** In-browser QR scanner with camera access
- **FR-6.3** Context-aware actions based on QR type and user permissions
- **FR-6.4** Bulk QR generation for label printing
- **FR-6.5** QR metadata with version control and freshness validation

### FR-7. Auditing & Security
- **FR-7.1** Comprehensive audit log: actor, timestamp, IP, before/after snapshots
- **FR-7.2** Security event logging: failed logins, token invalidation, secret rotation
- **FR-7.3** Admin tools to query, filter, and export audit logs

### FR-8. Analytics & Reporting
- **FR-8.1** Real-time dashboards with KPIs (stock value, alerts, top SKUs, occupancy)
- **FR-8.2** Warehouse analytics: zone utilization, throughput, performance metrics
- **FR-8.3** Receipt analytics: volume trends, value trends, processing times
- **FR-8.4** Exportable reports with date range filters and multiple formats
- **FR-8.5** Drill-down analysis from summary charts to detailed data

### FR-9. Stock Alerts & Monitoring
- **FR-9.1** Automated alerts: low stock, out of stock, expiring items (30-day threshold)
- **FR-9.2** Identify overstock, slow-moving (90 days), and dead stock (180 days)
- **FR-9.3** Configurable alert thresholds per product and warehouse
- **FR-9.4** Multi-channel notifications (email, SMS, in-app)

### FR-10. Import/Export & Schema Tools
- **FR-10.1** CSV import/export for inventory and supplier data with validation
- **FR-10.2** Database schema extraction tool with JSON export
- **FR-10.3** Multi-database support (master_specs_db, suppliers_db, security_db)

---

## Non-Functional Requirements

### NFR-1. Security
- **NFR-1.1** HTTPS for all client-server communication with HTTP-to-HTTPS redirection
- **NFR-1.2** Bcrypt password hashing with appropriate cost factor
- **NFR-1.3** Secure, HttpOnly, SameSite cookies with environment-based configuration
- **NFR-1.4** CSRF protection on all state-changing requests
- **NFR-1.5** Rate limiting on authentication endpoints and sensitive APIs
- **NFR-1.6** Comprehensive audit logging for security-sensitive events
- **NFR-1.7** Encrypted sensitive configuration at rest with restricted access

### NFR-2. Performance & Scalability
- **NFR-2.1** UI page loads under 1 second for typical dashboards
- **NFR-2.2** Support tens of thousands of SKUs with caching and read replicas
- **NFR-2.3** Asynchronous execution for long-running analytics jobs

### NFR-3. Reliability & Availability
- **NFR-3.1** Transient database error tolerance with retry mechanisms
- **NFR-3.2** Scheduled database backups with restore capability
- **NFR-3.3** Graceful failure handling with meaningful error pages

### NFR-4. Maintainability
- **NFR-4.1** Modular architecture with clear separation of concerns (services, routes, views)
- **NFR-4.2** Developer tools for schema extraction, testing, and migrations
- **NFR-4.3** Code quality enforcement via linting and automated testing

### NFR-5. Privacy & Compliance
- **NFR-5.1** Minimal storage of personal data with appropriate protection
- **NFR-5.2** Support for data export and deletion requests (data subject rights)

### NFR-6. Internationalization
- **NFR-6.1** UI strings prepared for translation with locale-based date/number formatting

### NFR-7. Accessibility
- **NFR-7.1** WCAG 2.1 AA conformance with keyboard navigation, ARIA attributes, and color contrast

---

## Use Cases by Actor

This section provides condensed use case descriptions. For detailed visual workflows, see [Process Diagrams Reference](#process-diagrams-reference).

#### Warehouse Admin Use Cases

**UC-A1: User Management**
- **Description:** Create, edit, view, and delete user accounts
- **Preconditions:** Admin is authenticated
- **Main Flow:**
  1. Admin navigates to user management page (`/users`)
  2. Admin can: list all users, view user details, create new user, edit existing user, toggle user status, reset failed login attempts, delete user, perform bulk actions
  3. System validates input, stores hashed passwords (bcrypt), updates database, logs all changes
- **Implemented Routes:**
  - GET `/users` - List all users
  - GET `/users/new` - New user form
  - GET `/users/:id` - View user details
  - GET `/users/:id/edit` - Edit user form
  - POST `/users` - Create user
  - POST `/users/:id/update` - Update user
  - DELETE `/users/:id` - Delete user
  - POST `/users/:id/toggle-status` - Toggle active/inactive
  - POST `/users/:id/reset-failed-attempts` - Reset lockout
  - POST `/users/bulk-action` - Bulk operations
- **Postconditions:** User records updated, audit log created

**UC-A2: Session Management**
- **Description:** View and manage active user sessions, force logout users
- **Preconditions:** Admin is authenticated
- **Main Flow:**
  1. Admin accesses session management interface
  2. Admin views list of active sessions with details (user, IP, device, login time)
  3. Admin can force logout specific users or view user-specific sessions
  4. System invalidates session tokens and logs security events
- **Implemented Routes:**
  - GET `/admin/sessions` - View all active sessions
  - POST `/admin/sessions/logout-user/:userId` - Force user logout
  - GET `/admin/sessions/user/:userId` - View user sessions
- **Postconditions:** Sessions invalidated, users logged out, security logs updated

**UC-A3: Advanced Inventory Management**
- **Description:** All staff capabilities plus delete operations
- **Preconditions:** Admin is authenticated
- **Main Flow:**
  - Inherits all Warehouse Staff capabilities
  - Additional: Delete products, Delete receipts (single and bulk), Delete suppliers
- **Implemented Routes:**
  - All Staff routes plus:
  - POST `/phones/:id/delete` - Delete product
  - POST `/receipts/:receipt_id/delete` - Delete receipt
  - POST `/receipts/bulk-delete` - Bulk delete receipts
  - POST `/suppliers/:id/delete` - Delete supplier
- **Postconditions:** Records deleted (soft delete), audit trail maintained

---

#### Warehouse Staff Use Cases

**UC-S1: Product Management**
- **Description:** View, create, and edit product/phone inventory items
- **Preconditions:** Staff member is authenticated
- **Main Flow:**
  1. Staff accesses inventory management
  2. Staff can: view product details, add new products, edit existing products
  3. System validates input and updates master inventory database
- **Implemented Routes:**
  - GET `/phone/:id` - View product details (all users)
  - GET `/phones/add` - Add product form
  - GET `/phones/:id/edit` - Edit product form
  - POST `/phones` - Create product
  - POST `/phones/:id` - Update product
- **Postconditions:** Product catalog updated

**UC-S2: Receive Stock**
- **Description:** Process incoming inventory shipments
- **Preconditions:** Staff is authenticated, warehouse exists
- **Main Flow:**
  1. Staff navigates to receive stock page
  2. Staff selects supplier, warehouse, and zone
  3. Staff enters product details, quantities, and optionally serial numbers
  4. System validates data, updates inventory levels, creates receipt record
  5. System logs transaction in inventory_log table
- **Implemented Routes:**
  - GET `/inventory/receive` - Receive stock form
  - POST `/inventory/receive` - Process receipt
  - API: GET `/api/warehouse/:warehouseId/zones` - Get zones for warehouse
  - API: GET `/api/warehouse/:warehouseId/product/:productId` - Get product availability
- **Postconditions:** Inventory increased, receipt created, audit trail logged

**UC-S3: Sell Stock**
- **Description:** Process outgoing inventory (sales/issues)
- **Preconditions:** Staff is authenticated, items in stock
- **Main Flow:**
  1. Staff navigates to sell stock page
  2. Staff selects warehouse, zone, and products to sell
  3. Staff enters quantities (system checks availability)
  4. System decrements inventory, creates sale record
  5. System checks for low stock alerts
- **Implemented Routes:**
  - GET `/inventory/sell` - Sell stock form
  - POST `/inventory/sell` - Process sale
  - API: GET `/api/warehouse/:warehouseId/zone/:zoneId/product/:productId/stock` - Check stock
- **Postconditions:** Inventory decremented, sale recorded, alerts generated if needed

**UC-S4: Warehouse Operations**
- **Description:** Manage warehouses, zones, and inventory distribution
- **Preconditions:** Staff is authenticated
- **Main Flow:**
  1. Staff accesses warehouse management
  2. Staff can: view warehouses, view zones, create/edit warehouses, create/edit zones, manage bin locations, perform transfers, view analytics
  3. System validates operations and maintains data integrity
- **Implemented Routes:**
  - GET `/warehouses` - List warehouses
  - GET `/warehouses/:id` - Warehouse details
  - GET `/warehouses/:id/zones` - Zone list
  - GET `/warehouses/analytics` - Warehouse analytics
  - GET `/warehouses/batches/expiring` - Expiring batches
  - GET `/warehouses/serial/:serialNumber` - Serial lookup
  - POST `/warehouses/transfer` - Transfer inventory
  - POST `/warehouses/batches` - Create batch
  - POST `/warehouses/serial` - Create serial
  - POST `/warehouses` - Create warehouse
  - PUT `/warehouses/:id` - Update warehouse
  - POST `/warehouses/:id/zones` - Create zone
  - PUT `/warehouses/:warehouseId/zones/:zoneId` - Update zone
  - Multiple zone and bin management endpoints
- **Postconditions:** Warehouse configuration updated, operations logged

**UC-S5: Supplier Management**
- **Description:** Manage supplier master data
- **Preconditions:** Staff is authenticated
- **Main Flow:**
  1. Staff accesses supplier section
  2. Staff can: view suppliers, add new supplier, edit supplier, toggle supplier status
  3. System validates and stores supplier information
- **Implemented Routes:**
  - GET `/suppliers` - List suppliers (all users)
  - GET `/supplier/:id` - Supplier details (all users)
  - GET `/suppliers/add` - Add supplier form
  - POST `/suppliers` - Create supplier
  - GET `/suppliers/edit/:id` - Edit supplier form
  - POST `/suppliers/:id` - Update supplier
  - POST `/suppliers/:id/toggle-status` - Toggle active status
- **Postconditions:** Supplier database updated

**UC-S6: QR Code Operations**
- **Description:** Generate and scan QR codes for products and locations
- **Preconditions:** Staff is authenticated
- **Main Flow:**
  1. Staff accesses QR code generator/scanner
  2. For generation: Staff selects product or location, system generates QR code image
  3. For scanning: Staff uses camera to scan QR code, system resolves to object and displays actions
  4. System validates QR payload and provides context-aware options
- **Implemented Routes:**
  - GET `/qrcode/scan` - QR scanner interface (all users)
  - GET `/qrcode/generate` - QR generator form
  - POST `/api/qrcode/product/:id` - Generate product QR
  - POST `/api/qrcode/location/:id` - Generate location QR
  - POST `/api/qrcode/process` - Process scanned QR (all users)
- **Postconditions:** QR codes generated or processed, actions executed

---

#### All Authenticated Users Use Cases

**UC-U1: Authentication and Profile**
- **Description:** Login, logout, password recovery, profile management
- **Preconditions:** Valid user account exists
- **Main Flow:**
  1. User accesses login page, enters credentials
  2. System validates credentials with rate limiting
  3. System creates secure session with token
  4. User can access profile, update information, logout
- **Implemented Routes:**
  - GET `/login` - Login page
  - POST `/login` - Process login
  - GET `/logout` - Logout
  - GET `/forgot-password` - Password recovery page
  - POST `/forgot-password` - Process recovery
  - GET `/profile` - View profile
  - POST `/profile/update` - Update profile
- **Postconditions:** User authenticated, session active, profile updated

**UC-U2: View Dashboards and Analytics**
- **Description:** Access analytics and reporting dashboards
- **Preconditions:** User is authenticated
- **Main Flow:**
  1. User navigates to dashboard or analytics
  2. System displays relevant metrics, charts, and reports
  3. User can filter data by date range, warehouse, etc.
- **Implemented Routes:**
  - GET `/` or `/dashboard` - Main dashboard
  - GET `/analytics` - Analytics dashboard
  - GET `/reports` - Reports page
  - GET `/receipts/analytics` - Receipt analytics
  - GET `/warehouses/analytics` - Warehouse analytics
- **Postconditions:** User views insights and reports

**UC-U3: View Receipts and Transactions**
- **Description:** View receipt history and transaction details
- **Preconditions:** User is authenticated
- **Main Flow:**
  1. User accesses receipts list
  2. User can view receipt details, filter by date/type
  3. User can export receipts in various formats
- **Implemented Routes:**
  - GET `/receipts` - List receipts
  - GET `/receipt/:receipt_id` - Receipt details
  - POST `/receipts/bulk-export` - Bulk export
  - GET `/receipts/export/:format` - Export receipts
- **Postconditions:** User has access to transaction history

**UC-U4: View Stock Alerts**
- **Description:** Monitor inventory alerts and stock levels
- **Preconditions:** User is authenticated
- **Main Flow:**
  1. User accesses stock alerts page
  2. System displays low stock, out of stock, expiring items
  3. User can filter and act on alerts (staff/admin can take action)
- **Implemented Routes:**
  - GET `/stock-alerts` - View all stock alerts
  - GET `/warehouses/low-stock-alerts` - Low stock alerts
  - GET `/warehouses/batches/expiring` - Expiring batches
- **Postconditions:** User informed of inventory conditions

---

#### System Automated Use Cases

**UC-SYS1: Automated Monitoring and Alerts**
- **Description:** System automatically monitors inventory and generates alerts
- **Preconditions:** System scheduler running, thresholds configured
- **Main Flow:**
  1. System runs scheduled jobs (daily/hourly)
  2. System evaluates: low stock, out of stock, expiring items, overstock, slow-moving, dead stock
  3. System creates alert records and sends notifications
  4. System updates analytics and metrics
- **Implementation:** Background services, scheduled tasks
- **Postconditions:** Alerts generated, notifications sent, metrics updated

**UC-SYS2: Session and Security Management**
- **Description:** Automated session validation, token cleanup, security logging
- **Preconditions:** User sessions exist
- **Main Flow:**
  1. System validates session tokens on each request
  2. System checks for expired sessions, idle timeouts, security violations
  3. System logs security events, failed logins, suspicious activity
  4. System performs periodic cleanup of expired tokens and sessions
- **Implementation:** Middleware (auth.js), Security services
- **Postconditions:** Invalid sessions cleared, security maintained, events logged

---

## Data Model

The system uses three logical databases for separation of concerns:

### Database Architecture

| Database | Purpose | Key Tables |
|----------|---------|------------|
| **master_specs_db** | Inventory & warehouse operations | specs_db, warehouses, zones, bin_locations, inventory_batches, serialized_inventory, receipts, inventory_log, stock_alerts, transfers |
| **suppliers_db** | Supplier management | suppliers, supplier_contacts |
| **security_db** | Authentication & security | users, security_events, token_invalidation, session_secrets |

### Key Table Descriptions

**master_specs_db:**
- `specs_db`: Product catalog with SKU, pricing, and reorder levels
- `warehouses`: Warehouse master data with capacity and location info
- `zones`: Zone definitions (receiving, storage, picking, shipping, returns, quarantine)
- `bin_locations`: Aisle-shelf-bin structure for precise inventory placement
- `inventory_batches`: Batch tracking with expiry dates and quantities
- `serialized_inventory`: Individual serial number tracking with status and location
- `serial_history`: Complete movement and status change history
- `receipts`: Immutable transaction records (incoming/outgoing)
- `inventory_log`: Comprehensive audit trail of all inventory movements
- `stock_alerts`: Active alerts with type, severity, and status
- `transfers`: Inter-warehouse movement records with status tracking

**suppliers_db:**
- `suppliers`: Master data with contact info, lead times, payment terms
- `supplier_contacts`: Contact persons for each supplier

**security_db:**
- `users`: User accounts with roles, status, and authentication data
- `security_events`: Security event log (authentication, failures, violations)
- `token_invalidation`: Session token blacklist
- `session_secrets`: Dynamic secrets with rotation history

### Data Relationships

- Inventory tracked at **warehouse → zone → bin** granularity
- Serialized items linked to inventory batches via `batch_id`
- Receipts contain header records with line items referencing SKUs and serial numbers
- All movements logged in `inventory_log` with source/destination and performer tracking
- Stock alerts reference products and warehouses with configurable thresholds
- Transfers link source and destination warehouses with in-transit status

---

## Process Diagrams Reference

The system includes comprehensive PlantUML diagrams documenting business processes and activity flows. These diagrams provide visual representations of the workflows described in the use cases.

> **Note:** Diagrams are being consolidated to improve maintainability and clarity. See `DIAGRAM-CONSOLIDATION-PLAN.md` for details. Complex diagrams (>400 lines) are being simplified to focus on business logic rather than implementation details.

### Business Process Diagrams

Business process diagrams show high-level workflows from user initiation to completion, including decision points and system interactions.

| Diagram | Description | File | Related Use Cases |
|---------|-------------|------|-------------------|
| **Authentication Process** | Login flow, session creation, password recovery | `business-process-authentication.puml` | UC-U1 |
| **Receive Stock** | Incoming inventory workflow with batch/serial creation | `business-process-receive-stock.puml` | UC-S2 |
| **Sell Stock** | Outgoing inventory with FIFO/FEFO batch selection | `business-process-sell-stock.puml` | UC-S3 |
| **Warehouse Management** | Create warehouses, zones, bins; transfer inventory | `business-process-warehouse-management.puml` | UC-S4 |
| **QR Operations** | Generate and scan QR codes for products/locations | `business-process-qr-operations.puml` | UC-S6 |
| **Supplier Management** | CRUD operations for supplier master data | `business-process-supplier-management.puml` | UC-S5 |
| **Stock Alerts** | Automated monitoring and alert generation workflow | `business-process-stock-alerts.puml` | UC-U4, UC-SYS1 |
| **Password Recovery** | Secure password reset with token validation | `business-process-password-recovery.puml` | UC-U1 |
| **Bulk Operations** | Bulk user and inventory operations | `business-process-bulk-operations.puml` | UC-A3 |

### Activity Diagrams

Activity diagrams show detailed step-by-step flows for complex system activities, including parallel processing and conditional logic.

| Diagram | Description | File | Key Features |
|---------|-------------|------|--------------|
| **Session Management** | User sessions, token management, force logout | `activity-session-management.puml` | Dynamic secrets, token invalidation |
| **User Management** | Admin user CRUD with security logging | `activity-user-management.puml` | Role assignment, bulk operations |
| **Inventory Tracking** | Serialized inventory & batch tracking lifecycle | `activity-inventory-tracking.puml` | Serial creation, lookup, status changes |
| **Batch FIFO/FEFO** | Batch selection strategies for sales | `activity-batch-fifo-fefo.puml` | FIFO, FEFO, manual selection |
| **Zone Distribution** | Multi-zone inventory distribution & optimization | `activity-zone-distribution.puml` | Even, capacity-based, type-based strategies |
| **Receipt Generation** | Multi-format receipt export (PDF, CSV, Excel, JSON, email) | `activity-receipt-generation.puml` | Print, email, bulk export |
| **Analytics Reporting** | Analytics data aggregation and dashboard generation | `activity-analytics-reporting.puml` | KPI calculation, drill-down |

### Use Case Diagrams

Use case diagrams show actor-system interactions and capability boundaries for each role.

| Diagram | Description | File | Actors |
|---------|-------------|------|--------|
| **Warehouse Admin** | Admin-specific capabilities | `warehouse-admin-usecase.puml` | Admin |
| **Warehouse Staff** | Staff operational capabilities | `warehouse-staff-usecase.puml` | Staff |
| **Consolidated** | All actors and use cases | `consolidated-usecase.puml` | Admin, Staff, All Users, System |

### How to View Diagrams

1. **PlantUML Preview** (VS Code): Install "PlantUML" extension, then:
   ```
   Right-click .puml file → Preview Current Diagram
   ```

2. **PlantUML Online**: Visit [plantuml.com](http://www.plantuml.com/plantuml/uml/) and paste diagram code

3. **Generate Images**: Use PlantUML CLI:
   ```bash
   plantuml docs/diagrams/*.puml
   ```

4. **CI/CD Integration**: Diagrams can be automatically rendered in documentation pipelines

### Diagram Conventions

- **Blue boxes**: System actions
- **Green boxes**: User actions
- **Yellow boxes**: Decisions/validations
- **Red borders**: Critical operations
- **Notes**: Additional context or implementation details
- **Fork/Join**: Parallel operations
- **Swimlanes**: Actor responsibilities

---

---

## Testing & Validation

### Test Coverage Strategy

- **User Authentication**: Verify login flows, password hashing, rate limiting, and account lockout
- **Receipt Creation**: Integration tests for stock updates and immutable receipt persistence
- **Schema Extraction**: Automated smoke tests with database connectivity validation
- **Zone Management**: Test default zone creation and custom zone configuration
- **Serialized Inventory**: Verify unique serial enforcement and complete history tracking
- **Batch Tracking**: Test FIFO/FEFO selection logic and expiry alert generation
- **QR Operations**: Validate QR generation, payload structure, and scanning resolution
- **Stock Alerts**: Verify alert generation for all configured conditions
- **Inventory Transfers**: Test capacity validation, inventory updates, and audit logging
- **Analytics**: Verify KPI calculations, report generation, and drill-down functionality
- **Session Management**: Test session listing, force logout, and secret rotation

### Error Handling

- **Database Connectivity**: Graceful degradation with retry mechanisms and read-only fallback
- **Concurrent Updates**: Optimistic locking using version numbers or timestamps
- **CSV Import**: Row-level validation with dry-run mode
- **User Input**: Comprehensive validation and sanitization at all entry points

---

## Appendices
