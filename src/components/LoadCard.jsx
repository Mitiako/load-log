// LoadCard.jsx
import { useState } from "react";
import { calcLoad, fmtDate, fmtMoney } from "../data/calc";

export default function LoadCard({ load, index, onClick, onDelete }) {
  const [confirm, setConfirm] = useState(false);
  const c = calcLoad(load);

  function handleDelete(e) {
    e.stopPropagation();
    setConfirm(true);
  }
  function handleConfirm(e) {
    e.stopPropagation();
    onDelete(index);
  }
  function handleCancel(e) {
    e.stopPropagation();
    setConfirm(false);
  }

  if (confirm) {
    return (
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: "var(--radius-card)",
          padding: "20px",
          marginBottom: 10,
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--text-primary)",
            marginBottom: 16,
          }}
        >
          Delete{" "}
          <strong>
            {load.from} → {load.to}
          </strong>
          ?
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleConfirm}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "var(--radius-btn)",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#f87171",
              fontFamily: "var(--font-sans)",
              fontWeight: 500,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Delete
          </button>
          <button
            onClick={handleCancel}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "var(--radius-btn)",
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onClick(index)}
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        padding: "16px 20px",
        marginBottom: 10,
        cursor: "pointer",
        transition: "border-color var(--transition)",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = "var(--border-hover)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = "var(--border)")
      }
    >
      {/* Рядок 1: маршрут + net profit */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 10,
        }}
      >
        {/* Маршрут з стрілкою по центру */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flex: 1,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              fontSize: 15,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flexShrink: 1,
              lineHeight: 1,
            }}
          >
            {load.from}
          </span>
          <span
            style={{
              color: "var(--accent)",
              fontSize: 14,
              flexShrink: 0,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
            }}
          >
            →
          </span>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              fontSize: 15,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flexShrink: 1,
              lineHeight: 1,
            }}
          >
            {load.to}
          </span>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              fontSize: 15,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flexShrink: 1,
            }}
          >
            {load.to}
          </span>
        </div>
        {/* Net profit */}
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 17,
            color: c.net >= 0 ? "#4ade80" : "#f87171",
            flexShrink: 0,
          }}
        >
          {fmtMoney(c.net)}
        </span>
      </div>

      {/* Рядок 2: miles · gross */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--text-secondary)",
          }}
        >
          {load.miles.toLocaleString()} mi
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--text-secondary)",
          }}
        >
          gross {fmtMoney(load.gross)}
        </span>
      </div>

      {/* Рядок 3: дата + delete */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          {fmtDate(load.date)}
        </span>
        <button
          onClick={handleDelete}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.06em",
            color: "var(--text-muted)",
            padding: 0,
            transition: "color var(--transition)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--text-muted)")
          }
        >
          DELETE
        </button>
      </div>
    </div>
  );
}
