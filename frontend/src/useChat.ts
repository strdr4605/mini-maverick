import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import db from "./db";

export type Message = {
  id?: number;
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
const MESSAGES_QUERY_KEY = ["messages"];

export function useChat() {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const isStreamingRef = useRef(false);

  const { data: messages = [] } = useQuery({
    queryKey: MESSAGES_QUERY_KEY,
    queryFn: () => db.messages.orderBy("createdAt").toArray(),
  });

  // Streaming assistant message (not yet persisted)
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);

  const allMessages: Message[] = streamingMessage
    ? [...messages, streamingMessage]
    : messages;

  useEffect(() => {
    let active = true;

    function connect() {
      if (!active) return;
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onmessage = async (e) => {
        const msg = JSON.parse(e.data) as BackendMessage;

        if (msg.type === "status") {
          setConnected(msg.connected);
          return;
        }

        if (msg.type === "delta") {
          if (isStreamingRef.current) {
            setStreamingMessage((prev) =>
              prev ? { ...prev, content: msg.content } : null
            );
          } else {
            isStreamingRef.current = true;
            setStreamingMessage({ role: "assistant", content: msg.content, streaming: true });
          }
          return;
        }

        if (msg.type === "done") {
          if (!isStreamingRef.current) return;
          const finalContent = streamingMessageRef.current?.content ?? "";
          isStreamingRef.current = false;
          setStreamingMessage(null);
          if (finalContent) {
            await db.messages.add({ role: "assistant", content: finalContent, createdAt: Date.now() });
            queryClient.invalidateQueries({ queryKey: MESSAGES_QUERY_KEY });
          }
          setStreaming(false);
          return;
        }

        if (msg.type === "error") {
          isStreamingRef.current = false;
          setStreamingMessage(null);
          await db.messages.add({ role: "assistant", content: `Error: ${msg.message}`, createdAt: Date.now() });
          queryClient.invalidateQueries({ queryKey: MESSAGES_QUERY_KEY });
          setStreaming(false);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (active) setTimeout(connect, 3000);
      };
    }

    connect();
    return () => {
      active = false;
      wsRef.current?.close();
    };
  }, [queryClient]);

  // Ref to read streamingMessage inside the ws callback closure
  const streamingMessageRef = useRef<Message | null>(null);
  useEffect(() => {
    streamingMessageRef.current = streamingMessage;
  }, [streamingMessage]);

  async function send(content: string) {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    isStreamingRef.current = false;
    await db.messages.add({ role: "user", content, createdAt: Date.now() });
    queryClient.invalidateQueries({ queryKey: MESSAGES_QUERY_KEY });
    setStreaming(true);
    wsRef.current.send(JSON.stringify({ type: "message", content }));
  }

  return { messages: allMessages, connected, streaming, send };
}
