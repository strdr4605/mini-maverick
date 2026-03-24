// Frontend <-> Backend WebSocket protocol (simple)

export type FrontendMessage =
  | {
      type: "message";
      content: string;
      attachments?: Array<{ name: string; mimeType: string; media: string }>;
    };

export type BackendMessage =
  | { type: "delta"; content: string }
  | {
      type: "tool_call";
      id: string;
      name: string;
      status: "running" | "completed" | "error";
      input?: Record<string, unknown>;
      output?: string;
    }
  | { type: "done" }
  | { type: "error"; message: string }
  | { type: "status"; connected: boolean };
