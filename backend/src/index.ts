import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { OpenClawClient } from "./openclaw/client.js";
import { handleFrontendConnection } from "./ws/handler.js";

const OPENCLAW_WS_URL =
  process.env.OPENCLAW_WS_URL ?? "ws://localhost:18789";
const OPENCLAW_AUTH_TOKEN =
  process.env.OPENCLAW_AUTH_TOKEN ?? "my-secret-gateway-token";
const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "0.0.0.0";

async function main() {
  const openclaw = new OpenClawClient({
    url: OPENCLAW_WS_URL,
    token: OPENCLAW_AUTH_TOKEN,
  });

  // Connect in background — don't block server start
  openclaw.connect().then(
    () => console.log("[backend] connected to OpenClaw gateway"),
    (err) =>
      console.warn(
        "[backend] OpenClaw not available, will retry:",
        (err as Error).message,
      ),
  );

  const app = Fastify({ logger: false });
  await app.register(websocket);

  app.get("/healthz", async () => ({ ok: true }));

  app.register(async (fastify) => {
    fastify.get("/ws", { websocket: true }, (socket) => {
      console.log("[backend] frontend client connected");
      handleFrontendConnection(socket, openclaw);

      socket.on("close", () => {
        console.log("[backend] frontend client disconnected");
      });
    });
  });

  await app.listen({ port: PORT, host: HOST });
  console.log(`[backend] listening on ${HOST}:${PORT}`);
}

main().catch((err) => {
  console.error("[backend] fatal:", err);
  process.exit(1);
});
