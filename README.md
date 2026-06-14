# SyncBooks Desktop - Offline Accounting Application

A full-featured offline desktop accounting application built with Electron, React, and SQLite. This is the desktop companion to the SyncBooks cloud accounting platform, designed to work completely offline with optional cloud sync.

## Architecture

```
┌─────────────────────────────────────────────┐
│           Electron Main Process              │
│  ┌───────────────┐  ┌───────────────────┐   │
│  │ Local Express  │  │   Sync Engine     │   │
│  │ API Server     │  │ (push/pull when   │   │
│  │ (port 45678)   │  │  online)          │   │
│  └───────┬───────┘  └───────────────────┘   │
│          │           ┌───────────────────┐   │
│          │           │  Job Scheduler    │   │
│          │           │ (overdue, stock)  │   │
│          │           └───────────────────┘   │
│          │                                    │
│  ┌───────▼───────────────────────────────┐   │
│  │         SQLite Database (WAL)          │   │
│  │         ~/AppData/syncbooks.db         │   │
│  └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
          ▲
          │ HTTP (localhost)
          ▼
┌─────────────────────────────────────────────┐
│         Electron Renderer Process            │
│  ┌───────────────────────────────────────┐   │
│  │  React 19 + React Router + Tailwind   │   │
│  │  ────────────────────────────────────  │   │
│  │  Dashboard │ Invoices │ Expenses      │   │
│  │  Bills │ Products │ Payroll │ POS     │   │
│  │  Banking │ Reports │ CRM │ Projects   │   │
│  │  Settings │ ...all modules            │   │
│  └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## Features

- **Full offline operation** - All data stored locally in SQLite
- **20 modules** - Dashboard, Sales, Expenses, Banking, Payroll, Inventory, POS, CRM, Projects, Budgets, Assets, Reports, and more
- **Cloud sync** - Pushes changes to cloud MongoDB when online, pulls updates
- **Conflict resolution** - Detects and flags sync conflicts for manual resolution
- **Auto-updates** - Electron auto-updater for seamless updates
- **Background jobs** - Overdue invoice detection, stock alerts, budget monitoring
- **System tray** - Minimize to tray, background sync

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
cd accounting-desktop
npm install
```

### Development

```bash
# Start both main process and renderer in dev mode
npm run dev
```

### Build for Production

```bash
# Build TypeScript and bundle renderer
npm run build

# Package as installable .exe
npm run make
```

## Data Storage

All data is stored in a single SQLite database file at:
- Windows: `%APPDATA%/syncbooks-desktop/syncbooks.db`
- macOS: `~/Library/Application Support/syncbooks-desktop/syncbooks.db`
- Linux: `~/.config/syncbooks-desktop/syncbooks.db`

## Sync Strategy

1. All local mutations are logged to a `_sync_log` table
2. When online, pending changes are pushed to the cloud backend via `POST /api/desktop-sync/push-batch`
3. Remote changes are pulled via `GET /api/desktop-sync/pull?table=X&since=timestamp`
4. Conflicts (same record modified locally and remotely) are flagged for user resolution
5. Auto-sync runs every 5 minutes when connected
6. Initial sync downloads all data via `GET /api/desktop-sync/pull-all`

### Cloud Sync Setup

1. Open **Settings** in the desktop app
2. Under "Cloud Sync Configuration", enter:
   - Cloud Server URL: `https://syncbooksapp.com` (or `http://localhost:5000` for dev)
   - Your cloud account email and password
3. Click "Connect & Sync"
4. The app authenticates, gets a 30-day sync token, and downloads all data
5. From then on, changes sync automatically every 5 minutes

### Backend Sync Endpoints (added to your Express backend)

```
POST /api/desktop-sync/auth       → Authenticate desktop user, get sync token
POST /api/desktop-sync/push       → Push single local change to cloud
POST /api/desktop-sync/push-batch → Push multiple changes in one request
GET  /api/desktop-sync/pull       → Pull changes since a timestamp
GET  /api/desktop-sync/pull-all   → Download all data (initial sync)
GET  /api/desktop-sync/status     → Health check / connection test
```

### Conflict Resolution

When the same record is modified both locally and in the cloud:
- The conflict is flagged in the sync log
- User can view conflicts in Settings → Sync Status
- Choose to keep the local version (pushes to cloud) or accept the remote version (overwrites local)

## API Compatibility

The local Express server mirrors the cloud backend's API structure, so frontend components use the same API patterns regardless of whether data comes from the cloud or local SQLite.

## Tech Stack

- **Main Process:** Electron + Express + better-sqlite3 + node-cron
- **Renderer:** React 19 + React Router + Tailwind CSS 4 + Zustand
- **Database:** SQLite (WAL mode, 64MB cache)
- **Packaging:** Electron Forge (Squirrel installer for Windows)
