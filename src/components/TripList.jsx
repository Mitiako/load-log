// TripList.jsx
import TripCard from "./TripCard";
import Header from "./Header";
import { SettingsIcon } from "./icons/ProfileIcons";

export default function TripList({
  trips,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  onLogout,
  theme,
  onToggleTheme,
  onOpenSettings,
}) {
  return (
    <div style={{ minHeight: "100dvh", background: "transparent" }}>
      <Header
        left={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg viewBox="0 0 100 100" width="28" height="28" fill="none">
              <path
                d="M31 23 V77 H59"
                stroke={theme === "light" ? "#1A1813" : "#F4F1EB"}
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M69 77 V23 H41"
                stroke="#FF8A3D"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: "-0.01em",
                color: "var(--text-primary)",
              }}
            >
              LOAD<span style={{ color: "var(--accent)" }}>LOG</span>
            </span>
          </div>
        }
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={onOpenSettings}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                color: "var(--text-muted)",
                display: "flex",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--accent)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-muted)")
              }
            >
              <SettingsIcon size={18} />
            </button>
            <button
              onClick={onToggleTheme}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
                padding: "4px",
                color: "var(--text-muted)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--accent)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-muted)")
              }
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button
              onClick={onLogout}
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
              SIGN OUT
            </button>
          </div>
        }
      />

      {/* List */}
      <div style={{ padding: "4px 16px 200px" }}>
        {trips.length === 0 ? (
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
            No trips yet.
            <br />
            <span style={{ color: "var(--text-secondary)" }}>
              Create your first trip below.
            </span>
          </div>
        ) : (
          trips.map((trip, i) => (
            <TripCard
              key={trip.id}
              trip={trip}
              index={i}
              onClick={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      {/* Floating кнопка */}
      <div
        style={{
          position: "fixed",
          bottom: 88,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 480,
          padding: "0 16px",
          zIndex: 99,
        }}
      >
        <button
          onClick={onCreate}
          className="btn-primary"
          style={{ width: "100%", fontSize: 15 }}
        >
          + New Trip
        </button>
      </div>
    </div>
  );
}
