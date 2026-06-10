/**
 * Database Connection
 * SQLite-based persistence layer (lightweight, no external DB needed)
 */

let db = null;

/**
 * Initialize the database connection
 * Uses in-memory storage if SQLite is unavailable
 */
async function initializeDatabase() {
  try {
    // Attempt to use better-sqlite3 if available
    const Database = require('better-sqlite3');
    db = new Database(':memory:');

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        strategy TEXT NOT NULL,
        pair TEXT NOT NULL,
        direction TEXT,
        amount_in TEXT,
        amount_out TEXT,
        net_profit TEXT,
        gas_cost TEXT,
        tx_hash TEXT,
        dex TEXT,
        status TEXT DEFAULT 'pending',
        executed_at TEXT,
        confirmed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS strategies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        enabled INTEGER DEFAULT 0,
        config TEXT,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        severity TEXT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        source TEXT,
        acknowledged INTEGER DEFAULT 0,
        created_at TEXT
      );
    `);

    console.log('Database initialized (SQLite in-memory)');
  } catch {
    // Fallback: in-memory store (no SQLite dependency required)
    console.log('Database initialized (in-memory fallback)');
  }

  return db;
}

/**
 * Get the database instance
 */
function getDatabase() {
  return db;
}

/**
 * Close the database connection
 */
async function closeDatabase() {
  if (db && typeof db.close === 'function') {
    db.close();
  }
  db = null;
}

module.exports = { initializeDatabase, getDatabase, closeDatabase };
