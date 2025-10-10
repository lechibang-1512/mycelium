# Mycelium Inventory Management System

A secure, multi-database inventory management system built with Node.js, Express, and MySQL. Features advanced session security, user management, supplier tracking, comprehensive analytics, and QR code integration for modern inventory operations.

## 🚀 Features

### Core Functionality
- **Inventory Management**: Track stock levels, products, and movements with real-time updates
- **Supplier Management**: Maintain supplier information and relationships with performance tracking
- **User Management**: Role-based access control with secure authentication
- **Analytics & Reports**: Comprehensive business intelligence and reporting with visual insights
- **Session Security**: Advanced session management with token-based authentication
- **Receipt Management**: Complete receipt tracking for purchases and sales with detailed analytics

### QR Code Integration
- **QR Code Generation**: Generate QR codes for products, locations, batches, and transactions
- **QR Code Scanning**: Camera-based scanning with automatic processing and routing
- **Product QR Codes**: Link products to their detailed information and inventory status
- **Location QR Codes**: Track storage locations and bin management
- **Batch QR Codes**: Track inventory batches and lot numbers
- **Transaction QR Codes**: Link to specific inventory movements and receipts
- **Bulk QR Generation**: Generate multiple QR codes at once for efficient operations
```markdown
# Mycelium Inventory Management System

A secure, multi-database inventory management system built with Node.js, Express, and MySQL. Includes advanced session security, user management, supplier tracking, analytics, and QR code integration.

## Features (high level)

- Inventory management with stock tracking and movement history
- Supplier and purchase management
- Role-based user management and session security
- QR code generation and scanning for products and locations
- Analytics dashboard, receipts management, and export capabilities

## Prerequisites

- Node.js (v14+)
- npm (v6+)
- MySQL or MariaDB (v8+)
- Git

## Quickstart — Try it locally

1) Clone this repository and install dependencies:

```bash
git clone https://github.com/lechibang-1512/mycelium.git
cd mycelium
npm install
```

2) Create the databases (example names used by the project):

```sql
CREATE DATABASE master_specs_db;
CREATE DATABASE suppliers_db;
CREATE DATABASE security_db;
```

4) Copy and edit environment variables:

```bash
cp .env.example .env
# Edit .env and set DB credentials, SESSION_SECRET, PORT, etc.
```

Note: `npm run verify-env` checks for a few keys like `DB_SSL`, `SUPPLIERS_DB_SSL`, and `AUTH_DB_SSL`. If your DB does not use TLS, set these to `false` (or an empty value) in `.env`. Also replace the placeholder `SESSION_SECRET` with a strong random value.

Generate a session secret if you need one:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

4) Verify environment and DB connectivity:

```bash
npm run verify-env
```

5) Start the app in development mode:

```bash
npm run dev
```

Open http://localhost:3000 (or the port set in `.env`).

## Scripts

Key npm scripts (see `package.json` for the complete list):

- `npm start` — Start production server
- `npm run dev` — Development server (nodemon)
- `npm run verify-env` — Validate environment variables and DB connections
- `npm run setup` — Initialize databases (scripts/setup-databases.js)
- `npm run create-admin` — Create an admin user interactively
- `npm test` — Run tests

There are several targeted test and maintenance scripts under `package.json` (security tests, schema fixes, utilities).

## Project layout (short)

Important folders and files:

- `server.js` — Application entry
- `config/` — Database and service configuration
- `routes/` — Express route handlers
- `services/` — Business logic and helpers
- `middleware/` — Express middlewares (auth, CSRF, rate-limiting)
- `views/` — EJS templates
- `public/` — Static assets (CSS, client JS, generated qrcodes)
- `scripts/` — Utility and test scripts
- `sql/` — Database schema SQL files

## Usage notes

- First user registration typically becomes the initial admin account (see admin creation script).
- The app expects multiple databases (inventory, suppliers, auth) configurable via `.env`.

## Troubleshooting

- Database connection errors: check `.env` credentials and ensure server is running
- Sessions: ensure `SESSION_SECRET` is set and unique for each deployment
- If in doubt, run `npm run verify-env` to surface common configuration issues

## Contributing

Contributions are welcome. Typical flow:

1. Fork and branch from `main`
2. Implement your change with tests
3. Open a pull request describing the change

Please avoid committing secrets. If you'd like help getting started, open an issue with a short description.

## License

ISC

---

**Version**: 3.0.0  
**Last Updated**: October 2025

```
- All required environment variables are set
