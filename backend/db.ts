import { DB } from "https://deno.land/x/sqlite@v3.8/mod.ts";

// Create database connection
const db = new DB("dino_game.db");

// Initialize database tables
async function initializeDatabase() {
  try {
    // Create users table
    db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        victories INTEGER DEFAULT 0
      );
    `);

    // Create tokens table
    db.execute(`
      CREATE TABLE IF NOT EXISTS tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
      );
    `);

    console.log("✅ Database tables initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

// User operations
async function createUser(username: string, passwordHash: string) {
  try {
    const result = db.query<[number]>(
      "INSERT INTO users (username, password_hash) VALUES (?, ?) RETURNING id",
      [username, passwordHash]
    );
    return { id: result[0][0] };
  } catch (error) {
    if (error.message.includes("UNIQUE constraint failed")) {
      throw new Error("Username already exists");
    }
    throw error;
  }
}

async function getUserByUsername(username: string) {
  const result = db.query<[number, string, string, number]>(
    "SELECT * FROM users WHERE username = ?",
    [username]
  );
  if (result.length === 0) return null;
  return {
    id: result[0][0],
    username: result[0][1],
    password_hash: result[0][2],
    victories: result[0][3]
  };
}

async function incrementVictories(username: string) {
  db.execute(
    "UPDATE users SET victories = victories + 1 WHERE username = ?",
    [username]
  );
}

// Token operations
async function createToken(token: string, username: string, expiresAt: Date) {
  db.execute(
    "INSERT INTO tokens (token, username, expires_at) VALUES (?, ?, ?)",
    [token, username, expiresAt.getTime()]
  );
}

async function getTokenInfo(token: string) {
  const result = db.query<[number, string, string, number]>(
    "SELECT * FROM tokens WHERE token = ? AND expires_at > ?",
    [token, Date.now()]
  );
  if (result.length === 0) return null;
  return {
    id: result[0][0],
    token: result[0][1],
    username: result[0][2],
    expires_at: result[0][3]
  };
}

async function getAllActiveTokens() {
  const result = db.query<[number, string, string, number]>(
    "SELECT * FROM tokens WHERE expires_at > ?",
    [Date.now()]
  );
  return result.map(row => ({
    id: row[0],
    token: row[1],
    username: row[2],
    expires_at: row[3]
  }));
}

async function deleteToken(token: string) {
  db.execute("DELETE FROM tokens WHERE token = ?", [token]);
}

async function cleanupExpiredTokens() {
  db.execute("DELETE FROM tokens WHERE expires_at <= ?", [Date.now()]);
}

// Export functions and db
export {
  db,
  initializeDatabase,
  createUser,
  getUserByUsername,
  incrementVictories,
  createToken,
  getTokenInfo,
  getAllActiveTokens,
  deleteToken,
  cleanupExpiredTokens
}; 