# Graceful Shutdown System

This document explains how the graceful shutdown system works in the Student Grievance System.

## 🔧 How It Works

### **Frontend Detection**

- **Browser Events**: Listens for `beforeunload`, `unload`, and `pagehide` events
- **Page Refresh Detection**: Distinguishes between refresh and actual closing
- **Confirmation Dialog**: Shows confirmation before initiating shutdown
- **Reliable Shutdown**: Uses `navigator.sendBeacon()` for guaranteed delivery
- **Data Persistence**: Saves any pending form data before shutdown
- **Session Cleanup**: Automatically logs out user on browser close

### **Backend Shutdown Process**

1. **Immediate Response**: Confirms shutdown initiation to frontend
2. **Database Sync**: Commits all pending SQLite transactions using WAL checkpoint
3. **Backup Creation**: Creates timestamped database backup
4. **Resource Cleanup**: Closes connections and cleans up resources
5. **Process Termination**: Gracefully exits with proper cleanup

## 🚀 Usage

### **Automatic Shutdown**

- Simply close your browser tab or window
- System will show confirmation dialog
- On confirmation, both servers shutdown gracefully

### **Manual Testing**

```bash
# Test system status
curl http://localhost:5000/api/system/status

# Manually trigger shutdown
curl -X POST http://localhost:5000/api/system/shutdown
```

## 🛡️ Safety Features

### **Timeout Protection**

- 10-second timeout for graceful shutdown
- Force shutdown if graceful shutdown fails
- Prevents hanging processes

### **Data Protection**

- Database backups created before shutdown
- Pending form data saved to localStorage
- WAL checkpoint ensures data integrity

### **Error Handling**

- Uncaught exceptions trigger graceful shutdown
- Network failures handled with timeouts
- Fallback to force shutdown if needed

## 📁 Files Modified

### **Backend**

- `routes/system.js` - Shutdown endpoints
- `config/sqlite.js` - Database closure function
- `server.js` - Process signal handlers

### **Frontend**

- `services/shutdownService.js` - Browser event handlers
- `App.js` - Shutdown system initialization

## 🔍 Logs

### **Normal Shutdown**

```
🔄 Graceful shutdown initiated...
💾 Saving pending transactions...
🔒 Closing database connections...
📊 Creating backup...
🧹 Cleaning up resources...
✅ Graceful shutdown completed successfully
```

### **Force Shutdown**

```
⚠️ Graceful shutdown timeout, forcing exit...
🔴 Force shutdown due to error
```

## 🎯 Browser Behavior

### **Triggers Shutdown**

- Closing browser window
- Closing browser tab
- Alt+F4 (Windows)
- Cmd+Q (Mac)

### **Does NOT Trigger Shutdown**

- Page refresh (F5 or Ctrl+R)
- Opening new tabs
- Navigating within the app
- Developer tools opening

## 🛠️ Development

The shutdown system is optimized for development environments:

- Works with `npm run dev` (concurrently)
- Properly terminates both frontend and backend
- Preserves data integrity during development

## 🚨 Production Considerations

For production deployment, consider:

- Process managers (PM2, systemd)
- Load balancer integration
- Database clustering shutdown coordination
- Graceful connection draining

## 📊 Backup Management

Backups are stored in `backend/backups/` with format:

- `database_{timestamp}.db`
- Automatic cleanup of backups older than 7 days
- Manual restoration instructions in backups/README.md

## 🔧 Troubleshooting

### **Shutdown Not Working**

1. **Check browser console for errors**

   - Look for "🔄 Initiating synchronous shutdown sequence..." message
   - Verify sendBeacon support: `console.log(!!navigator.sendBeacon)`

2. **Verify system status endpoint**: `GET /api/system/status`

3. **Check server logs for shutdown messages**

   - Should see "🔄 Graceful shutdown initiated..." in backend logs

4. **Browser Compatibility Issues**:

   - Modern browsers: Uses `navigator.sendBeacon()` (recommended)
   - Older browsers: Falls back to synchronous XHR
   - Some browsers may block shutdown during rapid tab switching

5. **User Confirmation Required**:
   - Shutdown only occurs after user confirms the browser dialog
   - If you close without confirming, shutdown won't trigger
   - Multiple close attempts may be needed if browser blocks events

### **Data Loss**

1. Check backups directory for recent backups
2. Verify localStorage for pending data (key: `pendingShutdownData`)
3. Check database WAL files for uncommitted transactions

### **Process Hanging**

- Force shutdown timeout is 10 seconds
- Kill process manually if needed: `Ctrl+C` in terminal
- Check for locked database files
