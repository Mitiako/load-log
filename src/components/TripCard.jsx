// TripCard.jsx
import { useState } from "react";
import { calcLoad, fmtMoney } from "../data/calc";

export default function TripCard({ trip, index, onClick, onEdit, onDelete }) {
  const [confirm, setConfirm] = useState(false);

  const totalNet = (trip.loads || []).reduce((s, l) => s + calcLoad(l).net, 0);
  const totalMiles = (trip.loads || []).reduce(
    (s, l) => s + l.miles + (l.dh || 0),
    0,
  );
  const loadCount = (trip.loads || []).length;

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
  function handleEdit(e) {
    e.stopPropagation();
    onEdit(index);
  }

  if (confirm) {
    return (
      <div
        className="glass"
        style={{
          border: "1px solid rgba(239,68,68,0.2)",
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
          Delete <strong>{trip.name}</strong> and all its loads?
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
      className="glass"
      style={{
        padding: "18px 20px",
        marginBottom: 10,
        cursor: "pointer",
      }}
    >
      {/* Рядок 1: назва + profit */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            fontSize: 16,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          {trip.name}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 16,
            color: totalNet >= 0 ? "#4ade80" : "#f87171",
            flexShrink: 0,
            marginLeft: 12,
          }}
        >
          {fmtMoney(totalNet)}
        </span>
      </div>

      {/* Рядок 2: дата */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--text-muted)",
          marginBottom: 14,
          letterSpacing: "0.04em",
        }}
      >
        {trip.createdAt}
      </div>

      {/* Divider */}
      <div
        style={{ height: 1, background: "var(--border)", marginBottom: 14 }}
      />

      {/* Рядок 3: статистика + actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--text-secondary)",
            }}
          >
            {loadCount} {loadCount === 1 ? "load" : "loads"}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            {totalMiles.toLocaleString()} mi
          </span>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <button
            onClick={handleEdit}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.06em",
              color: "var(--text-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              transition: "color var(--transition)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--accent)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-muted)")
            }
          >
            EDIT
          </button>
          <button
            onClick={handleDelete}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.06em",
              color: "var(--text-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
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
    </div>
  );
}
