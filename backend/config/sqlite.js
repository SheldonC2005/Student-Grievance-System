const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file in the backend directory
const dbPath = path.join(__dirname, '..', 'grievance_system.db');
const db = new sqlite3.Database(dbPath);

// Initialize database with tables
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'student',
          wallet_address VARCHAR(42),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create complaints table
      db.run(`
        CREATE TABLE IF NOT EXISTS complaints (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          category VARCHAR(50) NOT NULL,
          priority VARCHAR(20) DEFAULT 'medium',
          status VARCHAR(20) DEFAULT 'pending',
          blockchain_hash VARCHAR(66),
          blockchain_id INTEGER,
          ipfs_hash VARCHAR(100),
          ai_sentiment REAL,
          similarity_score REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES users(student_id)
        )
      `);

      // Create sessions table for session-based authentication
      db.run(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          session_id VARCHAR(100) UNIQUE NOT NULL,
          token_hash VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL,
          is_active BOOLEAN DEFAULT 1,
          user_agent TEXT,
          ip_address VARCHAR(45),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Create admins table for admin authentication
      db.run(`
        CREATE TABLE IF NOT EXISTS admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          admin_id VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'admin',
          wallet_address VARCHAR(42),
          permissions TEXT DEFAULT 'block_create,block_view,complaint_manage',
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create complaint_blocks table to track which complaints are in which blocks
      db.run(`
        CREATE TABLE IF NOT EXISTS complaint_blocks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          block_id INTEGER NOT NULL,
          complaint_id INTEGER NOT NULL,
          complaint_hash VARCHAR(64) NOT NULL,
          inclusion_order INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (complaint_id) REFERENCES complaints(id),
          FOREIGN KEY (block_id) REFERENCES block_metadata(id),
          UNIQUE(block_id, complaint_id)
        )
      `);

      // Create block_metadata table to store blockchain block information
      db.run(`
        CREATE TABLE IF NOT EXISTS block_metadata (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          block_number INTEGER UNIQUE NOT NULL,
          merkle_root VARCHAR(64) NOT NULL,
          transaction_hash VARCHAR(66),
          block_hash VARCHAR(66),
          complaint_count INTEGER NOT NULL DEFAULT 0,
          total_priority_score REAL NOT NULL DEFAULT 0,
          top_category VARCHAR(50),
          category_stats TEXT, -- JSON string of category statistics
          sentiment_stats TEXT, -- JSON string of sentiment analysis
          gas_used INTEGER,
          created_by_admin_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          blockchain_timestamp DATETIME,
          ipfs_metadata_hash VARCHAR(100),
          FOREIGN KEY (created_by_admin_id) REFERENCES admins(id)
        )
      `);

      // Create block_creation_log table to track block creation history
      db.run(`
        CREATE TABLE IF NOT EXISTS block_creation_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          admin_id INTEGER NOT NULL,
          block_id INTEGER NOT NULL,
          complaints_processed INTEGER NOT NULL,
          processing_time_ms INTEGER,
          merkle_tree_depth INTEGER,
          classification_summary TEXT, -- JSON summary of AI classification
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (admin_id) REFERENCES admins(id),
          FOREIGN KEY (block_id) REFERENCES block_metadata(id)
        )
      `);

      // Add indexes for better performance
      db.run(`CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_complaint_blocks_block_id ON complaint_blocks(block_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_block_metadata_created_at ON block_metadata(created_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status)`);

      console.log('✅ SQLite database initialized successfully');
      resolve();
    });
  });
};

// Database query functions
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    } else {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ 
          insertId: this.lastID, 
          changes: this.changes,
          rows: [] 
        });
      });
    }
  });
};

// Close database connection gracefully
const closeDatabase = () => {
  return new Promise((resolve, reject) => {
    console.log('🔒 Closing SQLite database connection...');
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err);
        reject(err);
      } else {
        console.log('✅ Database connection closed successfully');
        resolve();
      }
    });
  });
};

module.exports = {
  db,
  initializeDatabase,
  query,
  closeDatabase
};
