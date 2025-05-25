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
  try {
    console.log("Creating token:", {
      token: token ? "present" : "missing",
      username,
      expiresAt: expiresAt.toISOString()
    });

    if (!token) {
      throw new Error("Token cannot be null or undefined");
    }

    // Ensure token is a string and not empty
    const tokenStr = String(token).trim();
    if (!tokenStr) {
      throw new Error("Token cannot be empty");
    }

    const result = db.query(
      "INSERT INTO tokens (token, username, expires_at) VALUES (?, ?, ?)",
      [tokenStr, username, expiresAt.getTime()]
    );

    console.log("Token created successfully");
    return result;
  } catch (error) {
    console.error("Error creating token:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
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

async function hasActiveToken(username: string) {
  const result = db.query<[number]>(
    "SELECT COUNT(*) FROM tokens WHERE username = ? AND expires_at > ?",
    [username, Date.now()]
  );
  return result[0][0] > 0;
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
  try {
    console.log("Attempting to delete token:", token ? "present" : "missing");
    
    if (!token) {
      throw new Error("Cannot delete null or undefined token");
    }

    // First check if token exists
    const existingToken = await getTokenInfo(token);
    if (!existingToken) {
      console.log("Token not found in database");
      return;
    }

    // Delete the token
    const result = db.query(
      "DELETE FROM tokens WHERE token = ?",
      [token]
    );

    console.log("Token deletion result:", result);
    return result;
  } catch (error) {
    console.error("Error deleting token:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
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
  hasActiveToken,
  getAllActiveTokens,
  deleteToken,
  cleanupExpiredTokens
}; 