// AssistantScreen.jsx
// Окремий екран для AI Chat Assistant з function calling (api/assistant.js) —
// свідомо НЕ той самий екран що ChatScreen.jsx. Розмови зберігаються в
// Firestore (users/{uid}/assistantChats) — водій може прогорнути список
// старих сесій вручну, і сервер сам підмішує короткий дайджест останніх
// розмов на початку нової сесії, без явного нагадування з боку водія.
import { useState, useRef, useEffect } from "react";
import { authFetch } from "../utils/authFetch";
import {
  fetchAssistantChats,
  fetchProfile,
  saveProfile,
} from "../data/firestore";
import Header from "./Header";

export default function AssistantScreen({ user, onBack }) {
  const [profile, setProfile] = useState(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (user?.uid) fetchProfile(user.uid).then(setProfile);
  }, [user]);

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
        body: JSON.stringify({
          messages: nextMessages,
          // Дата з ПРИСТРОЮ водія (локальний часовий пояс), не сервера.
          clientDate: new Date().toLocaleDateString("en-CA"),
          chatId,
        }),
      });
      const data = await res.json();

      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);
        if (data.chatId) setChatId(data.chatId);
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

  function handleNewChat() {
    setMessages([]);
    setChatId(null);
    setShowHistory(false);
  }

  async function handleOpenHistory() {
    setShowHistory(true);
    setHistoryLoading(true);
    try {
      const chats = await fetchAssistantChats(user.uid);
      setHistoryList(chats);
    } catch (err) {
      console.error("Failed to load chat history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }

  function handleOpenPastChat(chat) {
    setMessages(chat.messages || []);
    setChatId(chat.id);
    setShowHistory(false);
  }

  function formatChatDate(chat) {
    // updatedAt приходить з Firestore Admin SDK як Timestamp-подібний
    // об'єкт ({ _seconds, _nanoseconds }) через JSON — обробляємо обидва
    // можливі формати про всяк випадок.
    const raw = chat.updatedAt;
    let date = null;
    if (raw?._seconds) date = new Date(raw._seconds * 1000);
    else if (raw?.seconds) date = new Date(raw.seconds * 1000);
    if (!date) return "";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
        left={
          <button
            onClick={handleOpenHistory}
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
            HISTORY
          </button>
        }
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={handleNewChat}
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
              + NEW
            </button>
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
          </div>
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
        For your security and performance, I only have access to your last 90
        days of data.
      </div>

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

      {/* History overlay */}
      {showHistory && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          onClick={() => setShowHistory(false)}
        >
          <div
            className="glass"
            style={{
              width: "100%",
              maxWidth: 480,
              maxHeight: "70svh",
              overflowY: "auto",
              borderRadius: "20px 20px 0 0",
              padding: "16px 16px calc(16px + env(safe-area-inset-bottom))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                fontSize: 15,
                color: "var(--text-primary)",
                marginBottom: 12,
              }}
            >
              Past conversations
            </div>

            {historyLoading && (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  textAlign: "center",
                  padding: "20px 0",
                }}
              >
                Loading...
              </div>
            )}

            {!historyLoading && historyList.length === 0 && (
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  color: "var(--text-muted)",
                  textAlign: "center",
                  padding: "20px 0",
                }}
              >
                No past conversations yet.
              </div>
            )}

            {historyList.map((chat) => {
              const firstUserMsg = (chat.messages || []).find(
                (m) => m.role === "user",
              );
              return (
                <button
                  key={chat.id}
                  onClick={() => handleOpenPastChat(chat)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 4px",
                    borderBottom: "1px solid var(--border)",
                    background: "none",
                    border: "none",
                    borderBottomWidth: 1,
                    borderBottomStyle: "solid",
                    borderBottomColor: "var(--border)",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "0.06em",
                        color: "var(--text-muted)",
                      }}
                    >
                      {formatChatDate(chat)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {firstUserMsg?.content || "(empty conversation)"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
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
