# Student Grievance System - Development Setup

## Auto-Shutdown Development Mode

This project now includes an auto-shutdown feature for development that automatically stops both frontend and backend services when you close the browser tab or window.

## Quick Start

### Single Command Startup

```bash
npm run dev
```

This single command will:

- Start the backend server (port 5000)
- Start the frontend React app (port 3000)
- Enable auto-shutdown monitoring
- Open browser automatically (if configured)

### Alternative Commands

```bash
# Start with auto-shutdown (same as npm run dev)
npm run dev:auto

# Start both services without auto-shutdown
npm run dev:manual

# Start only frontend
npm run dev:frontend

# Start only backend
npm run dev:backend
```

## How Auto-Shutdown Works

### 🔄 **Heartbeat Monitoring**

- Frontend sends heartbeat signals every 5 seconds via WebSocket
- Backend monitors connection status
- Development manager tracks frontend status

### 🛑 **Shutdown Triggers**

- **Tab/Browser Close**: Immediate shutdown when browser tab is closed
- **Page Navigation**: Shutdown when navigating completely away from app
- **Connection Loss**: Automatic shutdown if heartbeat stops for 30 seconds

### ✅ **What DOESN'T Trigger Shutdown**

- Minimizing browser window
- Switching to another tab
- Page refresh/reload
- Temporary network interruptions

### 🎯 **Shutdown Process**

1. Frontend detects browser close event
2. Sends shutdown signal via WebSocket
3. Development manager initiates graceful shutdown
4. Backend saves pending transactions
5. Both services terminate cleanly

## Development Features

### 📊 **Status Monitoring**

- Check development status: `GET /api/dev/status`
- Health check: `GET /api/dev/health`
- Manual shutdown: `POST /api/dev/shutdown`

### 🔧 **Configuration**

- Auto-shutdown only works in development mode
- WebSocket server runs on port 8080
- Heartbeat frequency: 5 seconds
- Connection timeout: 30 seconds

### 🐛 **Troubleshooting**

**Frontend won't connect to heartbeat service:**

- Check if WebSocket server is running (port 8080)
- Verify browser console for connection errors
- Try refreshing the page

**Services don't shut down automatically:**

- Check browser console for heartbeat status
- Verify WebSocket connection in Network tab
- Try manual shutdown: `POST /api/dev/shutdown`

**Port conflicts:**

- Frontend: 3000 (React dev server)
- Backend: 5000 (Express server)
- WebSocket: 8080 (Development manager)

## Development Workflow

1. **Start Development**:

   ```bash
   npm run dev
   ```

2. **Code and Test**:

   - Both services auto-restart on file changes
   - Frontend hot-reloads automatically
   - Backend restarts via nodemon

3. **Stop Development**:
   - Simply close the browser tab/window
   - Or press `Ctrl+C` in terminal
   - Services shut down automatically

## Production Mode

In production, the auto-shutdown feature is completely disabled:

- No WebSocket heartbeat monitoring
- No browser event listeners
- Services run independently
- Manual shutdown required

## File Structure

```
├── scripts/
│   └── dev-manager.js          # Development orchestrator
├── backend/
│   ├── routes/dev.js           # Development API endpoints
│   └── ...
├── frontend/
│   ├── src/
│   │   ├── services/
│   │   │   └── heartbeatService.js  # Frontend heartbeat client
│   │   ├── hooks/
│   │   │   └── useHeartbeat.js      # React hook for heartbeat
│   │   └── ...
│   └── ...
└── package.json                # Root orchestration scripts
```

## Logs and Debugging

The development manager provides detailed logging:

- `🚀` Service startup
- `💓` Heartbeat status
- `🔗` WebSocket connections
- `🛑` Shutdown signals
- `✅` Success operations
- `❌` Error conditions

Monitor the terminal output for real-time status updates.

---

**Note**: This auto-shutdown feature is designed specifically for development convenience and does not affect production deployments.
