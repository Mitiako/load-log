// ChatScreen.jsx
import { useState, useEffect, useRef } from "react";
import Header from "./Header";
import { buildChatContext } from "../data/chatContext";
import { fetchProfile, saveProfile } from "../data/firestore";

export default function ChatScreen({ user, trips, onBack }) {
  const [profile, setProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (user?.uid) fetchProfile(user.uid).then(setProfile);
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const context = buildChatContext(trips, profile);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, context }),
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
            content: "Sorry, I couldn't respond — try again.",
          },
        ]);
      }
    } catch (err) {
      console.error("Chat send failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't respond — try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      style={{
        height: "100svh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header
        title="Assistant"
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
          >
            BACK →
          </button>
        }
      />

      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          color: "var(--text-muted)",
          textAlign: "center",
          padding: "8px 16px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        For your security and performance, I only have access to your last 3
        months of data.
      </div>
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--text-muted)",
              paddingTop: 40,
              lineHeight: 1.6,
            }}
          >
            Ask me about your numbers, or set a goal for this week.
            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => setShowGoalForm(true)}
                style={{
                  background: "none",
                  border: "1px dashed var(--accent)",
                  borderRadius: "var(--radius-btn)",
                  padding: "8px 16px",
                  color: "var(--accent)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                🎯 Set a Goal
              </button>
            </div>
          </div>
        )}

        {showGoalForm && (
          <AssistantGoalForm
            profile={profile}
            onSave={async (goal) => {
              const updated = { ...profile, assistantGoal: goal };
              setProfile(updated);
              await saveProfile(user.uid, updated);
              setShowGoalForm(false);
            }}
            onClose={() => setShowGoalForm(false)}
          />
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "80%",
              padding: "10px 14px",
              borderRadius: "var(--radius-btn)",
              background:
                m.role === "user" ? "var(--accent)" : "var(--bg-elevated)",
              color: m.role === "user" ? "#100F0C" : "var(--text-primary)",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              lineHeight: 1.4,
              whiteSpace: "pre-wrap",
            }}
          >
            {m.content}
          </div>
        ))}
        {sending && (
          <div
            style={{
              alignSelf: "flex-start",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            Thinking...
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 16px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask about your numbers..."
          className="input"
          style={{ flex: 1, fontSize: 14, padding: "10px 14px" }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="btn-primary"
          style={{
            padding: "10px 18px",
            fontSize: 14,
            opacity: sending || !input.trim() ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

function AssistantGoalForm({ profile, onSave, onClose }) {
  const [amount, setAmount] = useState(profile?.assistantGoal?.amount || "");
  const [durationDays, setDurationDays] = useState(
    profile?.assistantGoal?.durationDays || 7,
  );

  function handleSubmit() {
    if (!amount) return;
    onSave({
      amount: Number(amount),
      durationDays: Number(durationDays),
      startDate: new Date().toISOString().split("T")[0],
    });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--bg-elevated)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          borderRadius: "20px 20px 0 0",
          border: "1px solid var(--border)",
          padding: "24px 20px 40px",
          boxShadow: "var(--glass-shadow)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            fontSize: 17,
            color: "var(--text-primary)",
            marginBottom: 16,
          }}
        >
          Set a Goal
        </div>

        <div style={{ marginBottom: 12 }}>
          <div className="label" style={{ marginBottom: 6 }}>
            Target Net Profit ($)
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="7000"
            className="input"
            style={{ fontSize: 14, padding: "10px 12px" }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="label" style={{ marginBottom: 6 }}>
            Duration
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-btn)",
              overflow: "hidden",
            }}
          >
            {[
              { label: "1 Week", days: 7 },
              { label: "3 Weeks", days: 21 },
              { label: "1 Month", days: 30 },
            ].map((opt) => (
              <button
                key={opt.days}
                onClick={() => setDurationDays(opt.days)}
                style={{
                  padding: "10px",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  fontWeight: 500,
                  background:
                    durationDays === opt.days ? "var(--accent)" : "transparent",
                  color:
                    durationDays === opt.days ? "#100F0C" : "var(--text-muted)",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className="btn-primary"
          style={{ width: "100%", fontSize: 15 }}
        >
          Save Goal
        </button>
      </div>
    </div>
  );
}
