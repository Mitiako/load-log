// LoadList.jsx
import LoadCard from "./LoadCard";
import { calcLoad, fmtMoney } from "../data/calc";

export default function LoadList({
  trip,
  loads,
  onSelect,
  onAdd,
  onMonthly,
  onDelete,
  onBack,
}) {
  const totalNet = (loads || []).reduce((s, l) => s + calcLoad(l).net, 0);
  const totalMiles = (loads || []).reduce(
    (s, l) => s + l.miles + (l.dh || 0),
    0,
  );
  const loadCount = (loads || []).length;

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
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {trip.name}
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
            flexShrink: 0,
            marginLeft: 12,
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

      {/* Summary strip */}
      {loadCount > 0 && (
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            {loadCount} {loadCount === 1 ? "load" : "loads"} ·{" "}
            {totalMiles.toLocaleString()} mi
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 15,
              color: totalNet >= 0 ? "#4ade80" : "#f87171",
            }}
          >
            {fmtMoney(totalNet)}
          </span>
        </div>
      )}

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {loadCount === 0 ? (
          <div
            style={{
              paddingTop: 80,
              textAlign: "center",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            No loads yet.
            <br />
            <span style={{ color: "var(--text-secondary)" }}>
              Add your first load below.
            </span>
          </div>
        ) : (
          (loads || []).map((load, i) => (
            <LoadCard
              key={i}
              load={load}
              index={i}
              onClick={onSelect}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "12px 16px 32px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <button
          onClick={onAdd}
          className="btn-primary"
          style={{ width: "100%", fontSize: 15 }}
        >
          + Add Load
        </button>
        <button
          onClick={onMonthly}
          className="btn-ghost"
          style={{ width: "100%", fontSize: 14 }}
        >
          Trip Summary
        </button>
      </div>
    </div>
  );
}
