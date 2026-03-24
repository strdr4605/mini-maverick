// OpenClaw gateway protocol v3 frame types

export type ReqFrame = {
  type: "req";
  id: string;
  method: string;
  params: Record<string, unknown>;
};

export type ResFrame = {
  type: "res";
  id: string;
  ok: boolean;
  payload?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
    retryAfterMs?: number;
  };
};

export type EventFrame = {
  type: "event";
  event: string;
  payload: Record<string, unknown>;
  seq?: number;
};

export type GatewayFrame = ReqFrame | ResFrame | EventFrame;

export type ChatDelta = {
  runId: string;
  sessionKey: string;
  seq: number;
  state: "delta" | "final" | "aborted" | "error";
  message?: {
    role: string;
    content: Array<{ type: string; text: string }>;
  };
  errorMessage?: string;
  usage?: { inputTokens: number; outputTokens: number };
};

export type AgentEvent = {
  runId: string;
  seq: number;
  stream: "lifecycle" | "tool" | "assistant" | "error";
  ts: number;
  data: Record<string, unknown>;
};

export function isReqFrame(frame: GatewayFrame): frame is ReqFrame {
  return frame.type === "req";
}

export function isResFrame(frame: GatewayFrame): frame is ResFrame {
  return frame.type === "res";
}

export function isEventFrame(frame: GatewayFrame): frame is EventFrame {
  return frame.type === "event";
}

export function parseFrame(data: string): GatewayFrame | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed.type === "string") {
      return parsed as GatewayFrame;
    }
    return null;
  } catch {
    return null;
  }
}
