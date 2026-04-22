import { Client, GatewayIntentBits } from "discord.js";
import { createServer } from "http";

const PORT = process.env.PORT ?? 3001;

// ---------------------------------------------------------------------------
// Discord client
// ---------------------------------------------------------------------------

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates, // required for Phase 2 audio capture
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // privileged — enable in Dev Portal
  ],
});

client.once("ready", (c) => {
  console.log(`[bot] Logged in as ${c.user.tag}`);
});

client.on("error", (err) => {
  console.error("[bot] Client error:", err);
});

// ---------------------------------------------------------------------------
// Health check HTTP server (Railway requires a bound port)
// ---------------------------------------------------------------------------

const server = createServer((req, res) => {
  if (req.url === "/health" && req.method === "GET") {
    const status = client.isReady() ? "ok" : "starting";
    res.writeHead(client.isReady() ? 200 : 503, {
      "Content-Type": "application/json",
    });
    res.end(JSON.stringify({ status }));
    return;
  }
  res.writeHead(404).end();
});

server.listen(PORT, () => {
  console.log(`[bot] Health check listening on port ${PORT}`);
});

// ---------------------------------------------------------------------------
// Startup & graceful shutdown
// ---------------------------------------------------------------------------

async function start() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.error("[bot] DISCORD_BOT_TOKEN is not set — exiting");
    process.exit(1);
  }
  await client.login(token);
}

function shutdown(signal: string) {
  console.log(`[bot] Received ${signal} — shutting down`);
  client.destroy();
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start().catch((err) => {
  console.error("[bot] Failed to start:", err);
  process.exit(1);
});
