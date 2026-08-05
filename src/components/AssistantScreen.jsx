// AssistantScreen.jsx
// Окремий екран для AI Chat Assistant з function calling (api/assistant.js) —
// свідомо НЕ той самий екран що ChatScreen.jsx (там вузько сфокусований,
// ефемерний асистент з готовим 3-місячним зрізом даних). Тут асистент сам
// вирішує які дані йому потрібні через getLoads/getFuelPurchases tools.
import { useState, useRef, useEffect } from "react";
import { authFetch } from "../utils/authFetch";
import Header from "./Header";

export default function AssistantScreen({ onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, sending]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const res = await authFetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();

      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Something went wrong on my end — try asking again.",
          },
        ]);
      }
    } catch (err) {
      console.error("Assistant request failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Couldn't reach the assistant — check your connection and try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      style={{
        height: "100svh",
        background: "transparent",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header
        title="AI Assistant"
        right={
          <button
            onClick={onBack}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.06em",
              color: "var(--text-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--text-secondary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-muted)")
            }
          >
            BACK →
          </button>
        }
      />

      {/* Messages */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 16px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              margin: "auto",
              textAlign: "center",
              padding: "0 24px",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            Ask me anything about your loads, expenses, or fuel stops — "How
            much did I make in July?", "What are my best-paying routes?", "Show
            me loads through Chicago last month."
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              className={m.role === "assistant" ? "glass" : undefined}
              style={{
                maxWidth: "82%",
                padding: "10px 14px",
                borderRadius: "var(--radius-btn)",
                background: m.role === "user" ? "var(--accent)" : undefined,
                color: m.role === "user" ? "#100F0C" : "var(--text-primary)",
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}

        {sending && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              className="glass"
              style={{
                padding: "10px 14px",
                borderRadius: "var(--radius-btn)",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--text-muted)",
              }}
            >
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "10px 16px calc(16px + env(safe-area-inset-bottom))",
          borderTop: "1px solid var(--border)",
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your loads, expenses, fuel..."
          rows={1}
          className="input"
          style={{
            flex: 1,
            resize: "none",
            fontSize: 14,
            padding: "10px 12px",
            fontFamily: "var(--font-sans)",
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="btn-primary"
          style={{
            opacity: sending || !input.trim() ? 0.4 : 1,
            flexShrink: 0,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
