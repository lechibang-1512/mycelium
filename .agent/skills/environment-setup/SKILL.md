---
name: Environment Setup
description: How to set up and configure the Mycelium development environment
---

# Environment Setup

## Prerequisites

- **Node.js** 18+ (recommended: 20.x)
- **MongoDB** 6.0+
- **npm** 9+

## Initial Setup

### 1. Clone and install dependencies

```bash
git clone <repository>
cd mycelium
npm install
```

### 2. Configure environment

Copy example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/mycelium

# Server
PORT=3000
NODE_ENV=development

# Session
SESSION_SECRET=your-secret-key-here
SESSION_COOKIE_MAX_AGE=86400000

# Optional
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Set up MongoDB

Install MongoDB (Debian/Ubuntu):
```bash
./scripts/install-mongodb.sh
```

Or manually:
```bash
# Start MongoDB
sudo systemctl start mongod

# Create database
mongosh
> use mycelium
```

### 4. Seed initial data (if needed)

```bash
node scripts/setup/seed-data.js
```

## Running the Application

### Development mode (with hot reload)

```bash
npm run dev
```
Opens Vite dev server at http://localhost:5173 with proxy to backend.

### Production mode

```bash
npm run build
```
This runs: clean → build → start server at http://localhost:3000

### Start server only (without rebuild)

```bash
npm start
```

## Common Setup Issues

### "MONGODB_URI is required"

Ensure `.env` file exists and contains `MONGODB_URI`:
```bash
echo "MONGODB_URI=mongodb://localhost:27017/mycelium" >> .env
```

### "Port 3000 already in use"

Kill existing process:
```bash
npm run util:kill-server
```

### MongoDB connection refused

1. Check MongoDB is running: `sudo systemctl status mongod`
2. Start if needed: `sudo systemctl start mongod`
3. Check connection string matches your setup

### Permission denied errors

Ensure proper file permissions:
```bash
chmod +x scripts/*.sh
```

## Development Workflow

### 1. Frontend development

Run Vite dev server for hot reload:
```bash
npm run dev
```

### 2. Backend development

Run with nodemon for auto-restart (if installed) or:
```bash
# Terminal 1: Watch mode
npm run test:watch

# Terminal 2: Start server
npm start
```

### 3. Full stack testing

```bash
npm run build  # Build and start
npm test       # Run tests
```

## Project Structure

```
.env              # Environment variables (DO NOT COMMIT)
.env.example      # Template for environment variables
package.json      # Dependencies and scripts
backend/
  config/         # Configuration files
  middleware/     # Express middleware
  models/         # Mongoose models
  routes/         # API routes
  services/       # Business logic
  server.cjs      # Main entry point
frontend/
  App.jsx         # Root component
  components/     # Reusable components
  pages/          # Page components
  services/       # API services
  contexts/       # React contexts
```

## Useful Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Clean, build, and start production |
| `npm start` | Start server only |
| `npm test` | Run all tests |
| `npm run lint` | Check code style |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run knip` | Find dead code |
| `npm run util:verify-env` | Verify environment setup |
| `npm run util:kill-server` | Kill running server |

## IDE Setup

### VS Code Extensions (recommended)

- ESLint
- Prettier
- MongoDB for VS Code
- ES7+ React/Redux/React-Native snippets

### VS Code settings

`.vscode/settings.json` should exist with project settings. If not:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```
