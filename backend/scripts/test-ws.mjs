#!/usr/bin/env node
/**
 * Test the backend WebSocket proxy end-to-end.
 *
 * Usage:
 *   node scripts/test-ws.mjs [message] [ws-url]
 *
 * Defaults:
 *   message: "say hi in one word"
 *   ws-url:  ws://localhost:3001/ws
 *
 * Example:
 *   node scripts/test-ws.mjs "what is 2+2?"
 *
 * Prerequisites:
 *   docker compose up -d
 *
 *   On first run, approve the backend device:
 *     docker exec mini-maverick-openclaw-1 node openclaw.mjs devices list
 *     docker exec mini-maverick-openclaw-1 node openclaw.mjs devices approve <deviceId>
 */

import { WebSocket } from "ws";

const message = process.argv[2] ?? "say hi in one word";
const url = process.argv[3] ?? "ws://localhost:3001/ws";

console.log(`Connecting to ${url}...`);
const ws = new WebSocket(url);

ws.on("open", () => {
  console.log(`Connected. Sending: "${message}"\n`);
  ws.send(JSON.stringify({ type: "message", content: message }));
});

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());

  switch (msg.type) {
    case "status":
      console.log(`[status] OpenClaw connected: ${msg.connected}`);
      break;
    case "delta":
      process.stdout.write(msg.content);
      break;
    case "tool_call":
      console.log(
        `\n[tool_call] ${msg.status}: ${msg.name}`,
        msg.input ? JSON.stringify(msg.input) : msg.output ?? "",
      );
      break;
    case "done":
      console.log("\n[done]");
      ws.close();
      process.exit(0);
      break;
    case "error":
      console.error(`\n[error] ${msg.message}`);
      ws.close();
      process.exit(1);
      break;
  }
});

ws.on("error", (err) => {
  console.error("WebSocket error:", err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error("\n[timeout] no response within 30s");
  process.exit(1);
}, 30000);
