import type { WebSocket } from "ws";
import type { OpenClawClient } from "../openclaw/client.js";
import type { ChatDelta, AgentEvent } from "../openclaw/protocol.js";
import type { FrontendMessage, BackendMessage } from "./types.js";

export function handleFrontendConnection(
  frontendWs: WebSocket,
  openclaw: OpenClawClient,
) {
  const send = (msg: BackendMessage) => {
    if (frontendWs.readyState === frontendWs.OPEN) {
      frontendWs.send(JSON.stringify(msg));
    }
  };

  let activeRunId: string | null = null;

  const onChat = (delta: ChatDelta) => {
    if (activeRunId && delta.runId !== activeRunId) return;

    if (!activeRunId && delta.state === "delta") {
      activeRunId = delta.runId;
    }

    switch (delta.state) {
      case "delta": {
        const text = delta.message?.content
          ?.filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("");
        if (text) {
          send({ type: "delta", content: text });
        }
        break;
      }
      case "final":
        send({ type: "done" });
        activeRunId = null;
        break;
      case "error":
        send({
          type: "error",
          message: delta.errorMessage ?? "unknown error",
        });
        activeRunId = null;
        break;
      case "aborted":
        send({ type: "done" });
        activeRunId = null;
        break;
    }
  };

  const onAgent = (event: AgentEvent) => {
    if (activeRunId && event.runId !== activeRunId) return;

    if (event.stream === "tool") {
      const data = event.data;
      if (data.type === "tool_use") {
        send({
          type: "tool_call",
          id: data.id as string,
          name: data.name as string,
          status: "running",
          input: data.input as Record<string, unknown>,
        });
      } else if (data.type === "tool_result") {
        send({
          type: "tool_call",
          id: data.id as string,
          name: "",
          status: "completed",
          output: data.content as string,
        });
      }
    }
  };

  openclaw.on("chat", onChat);
  openclaw.on("agent", onAgent);

  // Notify frontend of OpenClaw connection status changes
  const onConnected = () => send({ type: "status", connected: true });
  const onDisconnected = () => send({ type: "status", connected: false });
  openclaw.on("connected", onConnected);
  openclaw.on("disconnected", onDisconnected);

  // Send initial status
  send({ type: "status", connected: openclaw.isConnected });

  frontendWs.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as FrontendMessage;

      if (msg.type === "message") {
        if (!openclaw.isConnected) {
          send({
            type: "error",
            message: "OpenClaw is not available. Retrying connection...",
          });
          return;
        }
        activeRunId = null;
        openclaw.sendChat(msg.content, msg.attachments);
      }
    } catch {
      send({ type: "error", message: "invalid message format" });
    }
  });

  frontendWs.on("close", () => {
    openclaw.removeListener("chat", onChat);
    openclaw.removeListener("agent", onAgent);
    openclaw.removeListener("connected", onConnected);
    openclaw.removeListener("disconnected", onDisconnected);
  });
}
