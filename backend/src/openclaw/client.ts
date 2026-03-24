import WebSocket from "ws";
import { v4 as uuid } from "uuid";
import { EventEmitter } from "node:events";
import {
  type GatewayFrame,
  type ChatDelta,
  type AgentEvent,
  parseFrame,
} from "./protocol.js";
import { performHandshake } from "./handshake.js";

type OpenClawClientOptions = {
  url: string;
  token: string;
};

export class OpenClawClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private sessionKey = "";
  isConnected = false;
  private reconnecting = false;
  private url: string;
  private token: string;

  constructor(opts: OpenClawClientOptions) {
    super();
    this.url = opts.url;
    this.token = opts.token;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.on("open", async () => {
        try {
          const result = await performHandshake(this.ws!, this.token);
          this.sessionKey = result.sessionDefaults.mainSessionKey;
          this.isConnected = true;
          console.log(
            `[openclaw] connected, connId=${result.connId}, session=${this.sessionKey}`,
          );
          this.emit("connected", result);
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      this.ws.on("message", (data) => {
        if (!this.isConnected) return;
        this.handleFrame(data.toString());
      });

      this.ws.on("close", () => {
        this.isConnected = false;
        console.log("[openclaw] disconnected");
        this.emit("disconnected");
        this.scheduleReconnect();
      });

      this.ws.on("error", (err) => {
        console.error("[openclaw] ws error:", err.message);
        if (!this.isConnected) reject(err);
      });
    });
  }

  private handleFrame(raw: string) {
    const frame = parseFrame(raw);
    if (!frame) return;

    if (frame.type !== "event" || frame.event !== "tick") {
      console.log("[openclaw] frame:", raw.slice(0, 300));
    }

    if (frame.type === "res" && !frame.ok) {
      this.emit("chat", {
        runId: "",
        sessionKey: this.sessionKey,
        seq: 0,
        state: "error",
        errorMessage: (frame as any).error?.message ?? "request failed",
      } as ChatDelta);
      return;
    }

    if (frame.type === "event" && frame.event === "chat") {
      const delta = frame.payload as unknown as ChatDelta;
      this.emit("chat", delta);
    }

    if (frame.type === "event" && frame.event === "agent") {
      const event = frame.payload as unknown as AgentEvent;
      this.emit("agent", event);
    }

    if (frame.type === "event" && frame.event === "tick") {
      // keepalive, ignore
    }
  }

  sendChat(
    message: string,
    attachments?: Array<{ name: string; mimeType: string; media: string }>,
  ): string {
    if (!this.ws || !this.isConnected) {
      throw new Error("not connected to OpenClaw");
    }

    const reqId = uuid();
    const idempotencyKey = uuid();

    const req = {
      type: "req",
      id: reqId,
      method: "chat.send",
      params: {
        sessionKey: this.sessionKey,
        message,
        thinking: "normal",
        deliver: true,
        attachments: attachments ?? [],
        timeoutMs: 120000,
        idempotencyKey,
      },
    };

    this.ws.send(JSON.stringify(req));
    return reqId;
  }

  private scheduleReconnect() {
    if (this.reconnecting) return;
    this.reconnecting = true;
    console.log("[openclaw] reconnecting in 3s...");

    setTimeout(async () => {
      this.reconnecting = false;
      try {
        await this.connect();
      } catch (err) {
        console.error("[openclaw] reconnect failed:", (err as Error).message);
        this.scheduleReconnect();
      }
    }, 3000);
  }

  disconnect() {
    this.isConnected = false;
    this.ws?.close();
  }
}
