// TripForm.jsx
import { useState } from "react";
import { generateTripName } from "../data/store";

export default function TripForm({ trips, trip, onSave, onBack }) {
  const [name, setName] = useState(trip ? trip.name : generateTripName(trips));

  function handleSave() {
    if (!name.trim()) return;
    onSave(name.trim());
  }

  return (
    <div
      style={{
        height: "100dvh",
        background: "var(--bg-base)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            fontSize: 15,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          {trip ? "Edit Trip" : "New Trip"}
        </span>
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
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "24px 16px" }}>
        <div className="label" style={{ marginBottom: 8 }}>
          Trip name
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          className="input"
          style={{ fontSize: 15 }}
        />
        <p
          style={{
            marginTop: 8,
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-muted)",
            lineHeight: 1.5,
          }}
        >
          You can use any name — the default is auto-generated.
        </p>
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 16px 32px", flexShrink: 0 }}>
        <button
          onClick={handleSave}
          className="btn-primary"
          style={{
            width: "100%",
            fontSize: 15,
            opacity: !name.trim() ? 0.4 : 1,
          }}
        >
          {trip ? "Save Changes" : "Create Trip"}
        </button>
      </div>
    </div>
  );
}
