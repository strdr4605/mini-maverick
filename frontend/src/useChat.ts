import { useEffect, useRef, useState } from "react";

export type Message = {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

type BackendMessage =
  | { type: "status"; connected: boolean }
  | { type: "delta"; content: string }
  | { type: "done" }
  | { type: "error"; message: string };

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3001/ws";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data) as BackendMessage;

        if (msg.type === "status") {
          setConnected(msg.connected);
          return;
        }

        if (msg.type === "delta") {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.streaming) {
              return [...prev.slice(0, -1), { ...last, content: last.content + msg.content }];
            }
            return [...prev, { role: "assistant", content: msg.content, streaming: true }];
          });
          return;
        }

        if (msg.type === "done") {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.streaming) {
              return [...prev.slice(0, -1), { ...last, streaming: false }];
            }
            return prev;
          });
          setStreaming(false);
          return;
        }

        if (msg.type === "error") {
          setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${msg.message}` }]);
          setStreaming(false);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setTimeout(connect, 3000);
      };
    }

    connect();
    return () => wsRef.current?.close();
  }, []);

  function send(content: string) {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    setMessages((prev) => [...prev, { role: "user", content }]);
    setStreaming(true);
    wsRef.current.send(JSON.stringify({ type: "message", content }));
  }

  return { messages, connected, streaming, send };
}
