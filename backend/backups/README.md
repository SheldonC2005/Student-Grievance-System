# Backups Directory

This directory stores database backups created during graceful shutdowns.

Backup files are named with the format: `database_{timestamp}.db`

## Automatic Cleanup

Backups older than 7 days are automatically cleaned up during shutdown to prevent disk space issues.

## Manual Restoration

To restore from a backup:

1. Stop the application
2. Replace `../grievance_system.db` with your chosen backup file
3. Restart the application
