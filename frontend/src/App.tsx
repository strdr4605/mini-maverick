import { useEffect, useRef, useState } from "react";
import { Button, Form, TextArea } from "react-aria-components";
import { useChat } from "./useChat";

export default function App() {
  const { messages, connected, streaming, send } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    send(text);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="flex flex-col h-dvh max-w-2xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gb-bg2">
        <span className="font-semibold text-sm text-gb-fg">mini-maverick</span>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${connected
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800"
          }`}>
          {connected ? "connected" : "disconnected"}
        </span>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-sm text-center m-auto text-gb-fg-muted">
            Send a message to start chatting.
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <span className={`max-w-[75%] px-4 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap break-words ${msg.role === "user"
              ? "bg-gb-blue text-white rounded-br-sm"
              : "bg-gb-bg1 text-gb-fg rounded-bl-sm"
              }`}>
              {msg.content}
              {msg.streaming && (
                <span className="inline-block w-0.5 h-4 ml-0.5 align-text-bottom animate-pulse bg-gb-fg-muted" />
              )}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </main>

      {/* Input */}
      <Form onSubmit={handleSubmit} className="flex gap-2 px-4 py-3 border-t border-gb-bg2">
        <TextArea
          aria-label="Message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Mini-Maverick… (Enter to send, Shift+Enter for newline)"
          rows={1}
          disabled={streaming}
          className="flex-1 bg-gb-bg1 text-gb-fg border border-gb-bg2 rounded-lg px-3 py-2 text-sm resize-none outline-none focus:border-gb-blue disabled:opacity-50 placeholder:text-gb-fg-muted"
        />
        <Button
          type="submit"
          isDisabled={!input.trim() || streaming}
          className="bg-gb-blue text-white rounded-lg px-4 text-sm cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Send
        </Button>
      </Form>
    </div>
  );
}
