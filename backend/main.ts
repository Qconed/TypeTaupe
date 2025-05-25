import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import { create, verify } from "https://deno.land/x/djwt/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt/mod.ts";

if (Deno.args.length < 1) {
  console.error("Usage: deno run --allow-net main.ts PORT");
  Deno.exit();
}

const port = Number(Deno.args[0]);

// In-memory user storage
interface User {
  id: number;
  username: string;
  password_hash: string; // This will store the hashed password
}

const users: User[] = [];
let nextUserId = 0;

const router = new Router();

const secretKey = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"]
);

interface TokenInfo {
  username: string;
  expiresAt: number;
}

const tokens: { [key: string]: TokenInfo } = {};

// Read configuration
const config = JSON.parse(await Deno.readTextFile('../config.json'));

const app = new Application();

app.use(
  oakCors({
    origin: [`${config.frontend.protocol}://${config.frontend.domain}:${config.frontend.port}`],
    credentials: true,
  }),
);

app.use(router.routes());
app.use(router.allowedMethods());

// Register endpoint
router.post("/register", async (ctx) => {
  try {
    const body = await ctx.request.body.json();
    const { username, password } = body;

    // Check for empty username or password
    if (!username || !password || username.trim() === "" || password.trim() === "") {
      ctx.response.status = 400;
      ctx.response.body = { error: "Username and password cannot be empty" };
      return;
    }

    // Check if username already exists
    if (users.some((u) => u.username === username)) {
      ctx.response.status = 409; // Conflict
      ctx.response.body = { error: "Username already exists" };
      return;
    }

    // Hash the password
    const password_hash = await bcrypt.hash(password);

    // Create new user
    const newUser: User = {
      id: nextUserId++,
      username,
      password_hash,
    };

    users.push(newUser);

    ctx.response.status = 201; // Created
    ctx.response.body = { message: "User registered successfully" };
  } catch (error) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid request data" };
  }
});

// Login endpoint
router.post("/login", async (ctx) => {
  try {
    const body = await ctx.request.body.json();
    const { username, password } = body;

    // Check for empty username or password
    if (!username || !password || username.trim() === "" || password.trim() === "") {
      ctx.response.status = 400;
      ctx.response.body = { error: "Username and password cannot be empty" };
      return;
    }

    // Find user
    const user = users.find((u) => u.username === username);
    if (!user) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Invalid username or password" };
      return;
    }

    // Check if user is already logged in
    const isAlreadyLoggedIn = Object.values(tokens).some(
      (tokenInfo) => tokenInfo.username === username && Date.now() <= tokenInfo.expiresAt
    );
    if (isAlreadyLoggedIn) {
      ctx.response.status = 409; // Conflict
      ctx.response.body = { error: "User is already logged in" };
      return;
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Invalid username or password" };
      return;
    }

    // Generate JWT token
    const token = await create(
      { alg: "HS512", typ: "JWT" },
      { username: user.username },
      secretKey
    );

    // Store token with expiration (1 hour from now)
    const expiresAt = Date.now() + 3600000; // 1 hour
    tokens[token] = {
      username: user.username,
      expiresAt: expiresAt
    };

    ctx.response.status = 200;
    ctx.response.body = { 
      message: "Login successful",
      auth_token: token 
    };
  } catch (error) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid request data" };
  }
});

const is_authorized = async (auth_token: string) => {
  if (!auth_token) {
    console.log("missing token");
    return false;
  }

  const tokenInfo = tokens[auth_token];
  if (!tokenInfo) {
    console.log("token not found");
    return false;
  }

  // Check if token has expired
  if (Date.now() > tokenInfo.expiresAt) {
    console.log("token expired");
    delete tokens[auth_token]; // Remove expired token
    return false;
  }

  try {
    const payload = await verify(auth_token, secretKey);
    if (payload.username === tokenInfo.username) {
      return true;
    }
  } catch {
    console.log("token invalid");
    delete tokens[auth_token]; // Remove invalid token
    return false;
  }

  console.log("incorrect token");
  return false;
};

// Add a cleanup function to remove expired tokens periodically
setInterval(() => {
  const now = Date.now();
  Object.entries(tokens).forEach(([token, info]) => {
    if (now > info.expiresAt) {
      delete tokens[token];
    }
  });
}, 1000); // Check every second

// Verify endpoint
router.post("/verify", async (ctx) => {
  try {
    const body = await ctx.request.body.json();
    const { auth_token } = body;

    const isAuthorized = await is_authorized(auth_token);
    
    if (!isAuthorized) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Unauthorized" };
      return;
    }

    ctx.response.status = 200;
    ctx.response.body = { message: "Token valid" };
  } catch (error) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid request data" };
  }
});

// Get connected users endpoint
router.get("/get/connected-users", async (ctx) => {
  try {
    const now = Date.now();
    // Filter out expired tokens and get unique usernames
    const activeUsers = new Set(
      Object.entries(tokens)
        .filter(([_, info]) => now <= info.expiresAt)
        .map(([_, info]) => info.username)
    );
    
    const usersList = Array.from(activeUsers).map(username => ({ name: username }));
    ctx.response.status = 200;
    ctx.response.body = { users: usersList };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Logout endpoint
router.post("/logout", async (ctx) => {
  try {
    const body = await ctx.request.body.json();
    const { auth_token } = body;

    if (!auth_token) {
      ctx.response.status = 400;
      ctx.response.body = { error: "No token provided" };
      return;
    }

    // Remove the token if it exists
    if (tokens[auth_token]) {
      delete tokens[auth_token];
      ctx.response.status = 200;
      ctx.response.body = { message: "Logout successful" };
    } else {
      ctx.response.status = 404;
      ctx.response.body = { error: "Token not found" };
    }
  } catch (error) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid request data" };
  }
});

console.log(`Server running on http://localhost:${port}`);
await app.listen({ port });