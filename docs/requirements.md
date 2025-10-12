# Mycelium — System Requirements & Specifications

> **Version:** 2.0  
> **Last Updated:** October 13, 2025  
> **Status:** Living Document

This document provides comprehensive requirements, use cases, and specifications for the Mycelium inventory management system. It serves as the authoritative reference for developers, testers, product owners, and system integrators.

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Actors & Roles](#actors--roles)
4. [Core Functional Requirements](#core-functional-requirements)
5. [Use Cases by Actor](#use-cases-by-actor)
6. [Non-Functional Requirements](#non-functional-requirements)
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

## Core Functional Requirements

### Functional Requirements Summary

Requirements are organized by domain and assigned unique identifiers (FR-###) for traceability.

#### Authentication & User Management (FR-001 to FR-007)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-001 | Username/email + password authentication with session management | Critical | ✓ Implemented |
| FR-002 | Passwords stored using bcrypt (cost factor 12) | Critical | ✓ Implemented |
| FR-003 | "Forgot password" flow with secure one-time tokens (1-hour expiry) | High | ✓ Implemented |
| FR-004 | Dynamic session secrets with rotation capability | High | ✓ Implemented |
| FR-005 | Admin ability to view/terminate user sessions across devices | High | ✓ Implemented |
| FR-006 | Account lockout after configurable failed login attempts (default: 5) | High | ✓ Implemented |
| FR-007 | CSRF protection on all state-changing operations | Critical | ✓ Implemented |

**Implementation:** `routes/auth.js`, `middleware/auth.js`, `services/SessionManagementService.js`

#### Inventory Management (FR-010 to FR-014)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-010 | Inventory data model: SKU, name, description, unit, serializable flag, price, supplier ref, metadata | Critical | ✓ Implemented |
| FR-011 | CRUD operations for inventory items (soft delete preferred) | Critical | ✓ Implemented |
| FR-012 | Track inventory quantity at warehouse-zone-bin granularity | Critical | ✓ Implemented |
| FR-013 | Serialized inventory with individual serial number tracking and history | High | ✓ Implemented |
| FR-014 | Prevent negative stock levels unless explicitly allowed | High | ✓ Implemented |

**Implementation:** `routes/inventory.js`, `routes/phones.js`, Table: `specs_db`, `serialized_inventory`

#### Warehouse & Location Management (FR-020 to FR-026)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-020 | Support multiple warehouses with logical zones | Critical | ✓ Implemented |
| FR-021 | Configurable warehouse/zone attributes: name, code, capacity, allowed SKUs | High | ✓ Implemented |
| FR-022 | Move stock between locations with audit logging | High | ✓ Implemented |
| FR-023 | Zone types: receiving, storage, picking, shipping, returns, quarantine | High | ✓ Implemented |
| FR-024 | Bin location management with aisle-shelf-bin structure | Medium | ✓ Implemented |
| FR-025 | Auto-create default zone structure for new warehouses | Medium | ✓ Implemented |
| FR-026 | Validate zone capacity before stock placement/transfers | High | ✓ Implemented |

**Implementation:** `routes/warehouses.js`, `services/WarehouseService.js`, Tables: `warehouses`, `zones`, `bin_locations`

#### Supplier Management (FR-030 to FR-031)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-030 | Add supplier records with contact info, lead times, SKU mappings | High | ✓ Implemented |
| FR-031 | Reference supplier details on receipts and purchase records | High | ✓ Implemented |

**Implementation:** `routes/suppliers.js`, Database: `suppliers_db`

#### Receipts & Sales (FR-040 to FR-047)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-040 | Create receipts for incoming stock: supplier, items, quantities, serials, costs, destination | Critical | ✓ Implemented |
| FR-041 | Generate immutable receipt records with unique receipt numbers | Critical | ✓ Implemented |
| FR-042 | Create sales/outgoing receipts that decrement stock | Critical | ✓ Implemented |
| FR-043 | Attach documents (PDF/images) to receipts | Medium | ○ Planned |
| FR-044 | Support provisional receipts from external partners (require staff confirmation) | Low | ○ Future |
| FR-045 | Batch tracking with FIFO and FEFO strategies | High | ✓ Implemented |
| FR-046 | Backorder creation when quantity exceeds available stock | Medium | ○ Partial |
| FR-047 | Generate receipt documents in multiple formats (print, PDF, email) | High | ✓ Implemented |

**Implementation:** `routes/receipts.js`, `services/ReceiptService.js`, Table: `receipts`

#### QR Code Integration (FR-050 to FR-055)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-050 | Generate QR codes for items/locations with version/nonce | High | ✓ Implemented |
| FR-051 | UI QR scanner with camera access for product/location mapping | High | ✓ Implemented |
| FR-052 | QR scan triggers context-aware action menu based on permissions | Medium | ✓ Implemented |
| FR-053 | Support multiple QR types: product, location, batch, transaction, serial | High | ✓ Implemented |
| FR-054 | Bulk QR code generation for label printing | Medium | ✓ Implemented |
| FR-055 | QR codes include metadata for version control and freshness validation | Medium | ✓ Implemented |

**Implementation:** `routes/qrcode.js`, `services/QRCodeService.js`

#### Auditing & Security (FR-060 to FR-062)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-060 | Audit log for all state-changing operations: actor, timestamp, IP, before/after snapshots | Critical | ✓ Implemented |
| FR-061 | Security events table: failed logins, suspicious activity, token invalidation, secret rotation | Critical | ✓ Implemented |
| FR-062 | Admin ability to query/filter/export audit logs as CSV | High | ✓ Implemented |

**Implementation:** `services/SecurityLogger.js`, Tables: `security_events`, `inventory_log`

#### Administration & Session Management (FR-070 to FR-072)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-070 | Admin management of session secrets with rotation logging | High | ✓ Implemented |
| FR-071 | Token invalidation per-user or globally with user notification | High | ✓ Implemented |
| FR-072 | Role-based permissions (Admin, Staff, System, External Partners) with pluggable middleware | Critical | ✓ Implemented |

**Implementation:** `middleware/auth.js`, `services/DynamicSessionSecretService.js`, `services/TokenInvalidationService.js`

#### Analytics & Reporting (FR-080 to FR-087)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-080 | Generate reports for receipts, sales, inventory levels, warehouse distribution | High | ✓ Implemented |
| FR-081 | Dashboard with KPIs: stock value, low-stock alerts, recent receipts, top SKUs, occupancy | High | ✓ Implemented |
| FR-082 | Exportable reports in CSV/PDF/Excel/JSON with date range filters | High | ✓ Implemented |
| FR-083 | Warehouse-specific analytics: zone utilization, throughput, performance metrics | Medium | ✓ Implemented |
| FR-084 | Receipt analytics: volume trends, value trends, processing times | Medium | ✓ Implemented |
| FR-085 | Custom report builder with configurable parameters | Low | ○ Planned |
| FR-086 | Scheduled reports with automated email delivery | Low | ○ Planned |
| FR-087 | Drill-down analysis from summary charts to detailed data | Medium | ✓ Implemented |

**Implementation:** `routes/analytics.js`, `routes/reports.js`, `services/AnalyticsService.js`, `services/WarehouseAnalyticsService.js`

#### Import/Export & Schema Tools (FR-090 to FR-093)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-090 | Export/import inventory and supplier data via CSV with validation | Medium | ✓ Implemented |
| FR-091 | Developer tool to extract database schema and export JSON representation | Low | ✓ Implemented |
| FR-092 | Schema extraction sanitizes AUTO_INCREMENT for version control | Low | ✓ Implemented |
| FR-093 | Multi-database extraction support (master_specs_db, suppliers_db, security_db) | Low | ✓ Implemented |

**Implementation:** `scripts/utils-extract-schema.js`

#### Stock Alerts & Monitoring (FR-100 to FR-108)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-100 | Monitor and generate alerts for low stock (quantity <= reorder level) | High | ✓ Implemented |
| FR-101 | Monitor and generate alerts for out of stock (quantity = 0) | High | ✓ Implemented |
| FR-102 | Monitor and generate alerts for expiring items (default 30 days) | High | ✓ Implemented |
| FR-103 | Identify and alert on overstocked items (quantity > max level) | Medium | ✓ Implemented |
| FR-104 | Identify slow-moving stock (no activity for 90 days) | Medium | ✓ Implemented |
| FR-105 | Identify dead stock (no activity for 180 days) | Medium | ✓ Implemented |
| FR-106 | Configurable alert thresholds per product and warehouse | Medium | ○ Partial |
| FR-107 | Automated alert generation via scheduled jobs | High | ✓ Implemented |
| FR-108 | Multiple notification channels (email, SMS, in-app) | Low | ○ Partial |

**Implementation:** `routes/inventory.js` (`/stock-alerts`), Table: `stock_alerts`

#### Inventory Transfers (FR-110 to FR-115)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-110 | Support intra-warehouse transfers (zone-to-zone, bin-to-bin) | High | ✓ Implemented |
| FR-111 | Support inter-warehouse transfers with tracking | High | ✓ Implemented |
| FR-112 | Validate source availability before allowing transfers | High | ✓ Implemented |
| FR-113 | Validate destination capacity before completing transfers | Medium | ✓ Implemented |
| FR-114 | Log all transfers in inventory_log for audit trail | Critical | ✓ Implemented |
| FR-115 | Transfer status tracking (initiated, in-transit, completed, cancelled) | Medium | ✓ Implemented |

**Implementation:** `services/WarehouseService.js` (`transferInventory`), Table: `transfers`

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


## Non-Functional Requirements

### Security

- NFR-001: Use HTTPS for all client-server communication. Redirect HTTP to HTTPS.
- NFR-002: Store passwords hashed with bcrypt and a sufficiently strong cost factor.
- NFR-003: Use secure, HttpOnly, SameSite cookies for session cookies. Support cookie attributes configurable by environment.
- NFR-004: CSRF protection must be enabled for all state-changing requests.
- NFR-005: Implement rate-limiting for authentication endpoints and sensitive APIs.
- NFR-006: Provide audit logging for security-sensitive events.
- NFR-007: Encrypt sensitive configuration like session secrets at rest where feasible and restrict access.

### Performance and Scalability

- NFR-010: The system should respond to UI page loads under 1 second for typical dashboards (subject to data size).
- NFR-011: The system should support tens of thousands of SKUs and scale read-heavy analytics via caching or separate read replicas.
- NFR-012: Long-running analytics jobs should run asynchronously and not block UI requests.

### Reliability and Availability

- NFR-020: The system should tolerate transient DB connection errors and retry critical operations.
- NFR-021: Scheduled backups for databases should be available and restorable.
- NFR-022: The system should fail gracefully, providing meaningful error pages rather than stack traces.

### Maintainability

- NFR-030: Keep code modular with clear separation between services, routes, and views.
- NFR-031: Provide developer tools (schema extraction, tests) to ease upgrades and migrations.
- NFR-032: Use linting and unit tests to maintain code quality.

### Privacy and Compliance

- NFR-040: Personal data (user emails, contact info) must be stored minimally and protected.
- NFR-041: Support data export and deletion requests to comply with data subject rights.

### Internationalization and Localization

- NFR-050: Prepare UI strings for translation. Support date and number formats based on locale.

### Accessibility

- NFR-060: UI should conform to WCAG 2.1 AA where feasible (keyboard navigation, ARIA attributes, color contrast).


## Data Model Notes

- The system uses three databases (logical separation): `master_specs_db` for inventory and warehouses, `suppliers_db` for supplier master data, and `security_db` for users, sessions, and security events.

### master_specs_db Tables:
- **specs_db**: Product catalog with SKU, name, description, price, serializable flag, reorder levels.
- **warehouses**: Warehouse master data with name, code, capacity, address.
- **zones**: Zone definitions within warehouses (receiving, storage, picking, shipping, returns, quarantine).
- **bin_locations**: Bin location structure with aisle-shelf-bin format for precise inventory placement.
- **inventory_batches**: Batch tracking with batch number, lot number, expiry date, quantity, status.
- **serialized_inventory**: Individual serial number tracking with status, location, batch association.
- **serial_history**: Complete history of serial number movements and status changes.
- **receipts**: Immutable receipt records for all incoming and outgoing transactions.
- **inventory_log**: Comprehensive audit log of all inventory movements and changes.
- **stock_alerts**: Active stock alerts with type, severity, and status tracking.
- **transfers**: Transfer records for inter-warehouse movements with status tracking.

### suppliers_db Tables:
- **suppliers**: Supplier master data with contact info, lead times, payment terms.
- **supplier_contacts**: Contact persons for each supplier.

### security_db Tables:
- **users**: User accounts with username, email, hashed password, role, status.
- **security_events**: Security event log for authentication, failed logins, suspicious activity.
- **token_invalidation**: Token blacklist for session management and security.
- **session_secrets**: Dynamic session secrets with rotation history.

### Key Relationships:
- Inventory tables store per-location quantities at warehouse-zone-bin granularity.
- Serialized item rows are linked to inventory batches via batch_id foreign key.
- Receipts have header records with line items that reference SKUs and may contain serial numbers.
- All movements are logged in inventory_log with source/destination details and performer tracking.
- Stock alerts reference products and warehouses with configurable thresholds.
- Transfers link source and destination warehouses with in-transit status tracking.

---

## Process Diagrams Reference

The system includes comprehensive PlantUML diagrams documenting business processes and activity flows. These diagrams provide visual representations of the workflows described in the use cases.

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

## Error Handling and Edge Cases

- When connectivity to a DB fails, the system should log the error, surface a graceful message to the operator, and allow retrying or working in read-only mode where possible.
- For concurrent updates, the system should use optimistic locking (version numbers or timestamps) on stock-modifying operations to prevent lost updates.
- When importing CSV data, validate rows and provide a dry-run validation mode.


## Appendix: Acceptance Criteria and Test Ideas

- User Authentication
  - AC: Users can log in and their session is created; failed logins are rate-limited.
  - Tests: Unit tests for password hashing; integration tests for login flows and lockout.

- Receipt Creation
  - AC: Creating a receipt updates stock and stores an immutable receipt.
  - Tests: Integration test that posts a receipt and asserts stock levels and receipt persistence.

- Schema Extraction
  - AC: Running `npm run schema-extract` successfully writes `*-schema.sql` files for configured DBs.
  - Tests: Manual run with sane `.env` values and automated smoke test in CI that mocks DB connectivity.

- Zone Management
  - AC: Creating a warehouse automatically creates default zones; zones can be customized.
  - Tests: Integration test that creates warehouse and verifies default zones; test custom zone creation.

- Serialized Inventory Tracking
  - AC: Serial numbers are unique across all warehouses; each serial has complete history.
  - Tests: Test duplicate serial rejection; verify serial history logging on status changes and movements.

- Batch Tracking
  - AC: FIFO and FEFO strategies correctly select batches for sales; expiry dates are tracked.
  - Tests: Create multiple batches with different dates; verify FIFO/FEFO selection logic; test expiry alerts.

- QR Code Generation and Scanning
  - AC: QR codes are generated with valid payloads; scanning resolves to correct objects.
  - Tests: Generate QR for each type; verify payload structure; test scanning and resolution.

- Stock Alerts
  - AC: Alerts are generated for all configured conditions; notifications are sent.
  - Tests: Create conditions that trigger each alert type; verify alert creation; test notification delivery.

- Inventory Transfers
  - AC: Transfers update both source and destination; movements are logged; capacity is validated.
  - Tests: Test intra-warehouse and inter-warehouse transfers; verify inventory updates; test capacity validation.

- Analytics and Reports
  - AC: Dashboards display accurate KPIs; reports export in multiple formats; drill-down works.
  - Tests: Verify KPI calculations against database; test report generation in each format; test drill-down navigation.

- Session Management
  - AC: Admins can view active sessions; force logout terminates sessions; secret rotation works.
  - Tests: Test session listing; verify force logout clears sessions; test secret rotation with and without invalidation.

- Custom Report Builder
  - AC: Users can create custom reports with filters; reports execute without errors.
  - Tests: Create reports with various filter combinations; verify query execution and result accuracy.
