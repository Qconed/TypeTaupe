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

const tokens: { [key: string]: string } = {};


const app = new Application();

app.use(
  oakCors({
    origin: ["http://localhost:8080"],
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

    // Find user
    const user = users.find((u) => u.username === username);
    if (!user) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Invalid username or password" };
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

    ctx.response.status = 200;
    ctx.response.body = { 
      message: "Login successful",
      token: token 
    };
  } catch (error) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid request data" };
  }
});

console.log(`Server running on http://localhost:${port}`);
await app.listen({ port });