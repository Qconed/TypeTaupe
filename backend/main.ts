import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import { create, verify } from "https://deno.land/x/djwt/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt/mod.ts";
import {
  initializeDatabase,
  createUser,
  getUserByUsername,
  incrementVictories,
  createToken,
  getTokenInfo,
  getAllActiveTokens,
  deleteToken,
  cleanupExpiredTokens
} from "./db.ts";

if (Deno.args.length < 1) {
  console.error("Usage: deno run --allow-net main.ts PORT");
  Deno.exit();
}

const port = Number(Deno.args[0]);

// Initialize database
await initializeDatabase();

const router = new Router();

const secretKey = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"]
);

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
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      ctx.response.status = 409; // Conflict
      ctx.response.body = { error: "Username already exists" };
      return;
    }

    // Hash the password
    const password_hash = await bcrypt.hash(password);

    // Create new user
    await createUser(username, password_hash);

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
    const user = await getUserByUsername(username);
    if (!user) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Invalid username or password" };
      return;
    }

    // Check if user is already logged in
    const existingToken = await getTokenInfo(username);
    if (existingToken) {
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
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour
    await createToken(token, username, expiresAt);

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

  const tokenInfo = await getTokenInfo(auth_token);
  if (!tokenInfo) {
    console.log("token not found");
    return false;
  }

  try {
    const payload = await verify(auth_token, secretKey);
    if (payload.username === tokenInfo.username) {
      return true;
    }
  } catch {
    console.log("token invalid");
    await deleteToken(auth_token);
    return false;
  }

  console.log("incorrect token");
  return false;
};

// Add a cleanup function to remove expired tokens periodically
setInterval(async () => {
  await cleanupExpiredTokens();
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
    const activeTokens = await getAllActiveTokens();
    const usersList = activeTokens.map(token => ({ name: token.username }));
    
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
    const tokenInfo = await getTokenInfo(auth_token);
    if (tokenInfo) {
      await deleteToken(auth_token);
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

// Get text line endpoint
router.get("/get/textline/:lineNumber", async (ctx) => {
    try {
        const lineNumber = parseInt(ctx.params.lineNumber);
        if (isNaN(lineNumber) || lineNumber < 0) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Invalid line number" };
            return;
        }

        const lines = (await Deno.readTextFile('./lines.txt')).split('\n').filter(line => line.trim());
        
        if (lineNumber >= lines.length) {
            ctx.response.status = 404;
            ctx.response.body = { error: "Line number out of range" };
            return;
        }

        ctx.response.status = 200;
        ctx.response.body = { text: lines[lineNumber] };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
    }
});

// WebSocket challenge rooms
interface ChallengeRoom {
    players: Map<string, WebSocket>;
    text: string;
    isGameStarted: boolean;
}

const challengeRooms = new Map<string, ChallengeRoom>();

// Function to get a random text line
async function getRandomTextLine(): Promise<string> {
    const lines = await Deno.readTextFile("./lines.txt");
    const textLines = lines.split("\n").filter(line => line.trim());
    const randomIndex = Math.floor(Math.random() * textLines.length);
    return textLines[randomIndex];
}

// WebSocket handler for challenges
app.use(async (ctx) => {
    if (ctx.request.url.pathname === "/ws/challenge") {
        const ws = await ctx.upgrade();
        const auth_token = ctx.request.url.searchParams.get("auth_token");
        
        if (!auth_token) {
            ws.close(1008, "No auth token provided");
            return;
        }

        const isAuthorized = await is_authorized(auth_token);
        if (!isAuthorized) {
            ws.close(1008, "Unauthorized");
            return;
        }

        const tokenInfo = await getTokenInfo(auth_token);
        const username = tokenInfo.username;
        let currentRoom: ChallengeRoom | null = null;

        // Find an available room or create a new one
        for (const [roomId, room] of challengeRooms.entries()) {
            if (room.players.size < 2 && !room.isGameStarted) {
                currentRoom = room;
                room.players.set(username, ws);
                break;
            }
        }

        if (!currentRoom) {
            // Create a new room
            const roomId = crypto.randomUUID();
            currentRoom = {
                players: new Map([[username, ws]]),
                text: await getRandomTextLine(),
                isGameStarted: false
            };
            challengeRooms.set(roomId, currentRoom);
        }

        // Handle WebSocket messages
        ws.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                
                switch (data.type) {
                    case "join":
                        // Notify other player that someone joined
                        for (const [playerName, playerWs] of currentRoom!.players.entries()) {
                            if (playerName !== username) {
                                playerWs.send(JSON.stringify({
                                    type: "opponent_joined"
                                }));
                            }
                        }

                        // If we have 2 players, start the game
                        if (currentRoom!.players.size === 2) {
                            for (const [_, playerWs] of currentRoom!.players.entries()) {
                                playerWs.send(JSON.stringify({
                                    type: "game_start",
                                    text: currentRoom!.text
                                }));
                            }
                            currentRoom!.isGameStarted = true;
                        }
                        break;

                    case "progress":
                        // Forward progress to opponent
                        for (const [playerName, playerWs] of currentRoom!.players.entries()) {
                            if (playerName !== username) {
                                playerWs.send(JSON.stringify({
                                    type: "opponent_progress",
                                    progress: data.progress
                                }));
                            }
                        }
                        break;

                    case "complete":
                        // Increment victories for the winner
                        await incrementVictories(username);
                        
                        // Notify all players that the game is over
                        for (const [playerName, playerWs] of currentRoom!.players.entries()) {
                            playerWs.send(JSON.stringify({
                                type: "game_over",
                                winner: username,
                                wpm: data.wpm,
                                errors: data.errors
                            }));
                        }
                        break;
                }
            } catch (error) {
                console.error("Error handling WebSocket message:", error);
            }
        };

        // Handle WebSocket close
        ws.onclose = () => {
            if (currentRoom) {
                currentRoom.players.delete(username);
                
                // If room is empty, remove it
                if (currentRoom.players.size === 0) {
                    for (const [roomId, room] of challengeRooms.entries()) {
                        if (room === currentRoom) {
                            challengeRooms.delete(roomId);
                            break;
                        }
                    }
                } else {
                    // Notify remaining player that opponent left
                    for (const [_, playerWs] of currentRoom.players.entries()) {
                        playerWs.send(JSON.stringify({
                            type: "opponent_left"
                        }));
                    }
                }
            }
        };
    }
});

console.log(`Server running on http://localhost:${port}`);
await app.listen({ port });