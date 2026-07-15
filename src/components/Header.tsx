// Header.jsx

import React from "react";

export default function Header({
  left,
  title,
  right,
}: {
  left?: React.ReactNode;
  title?: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "12px 16px 8px",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--bg-elevated)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          borderRadius: 99,
          border: "1px solid var(--border)",
          padding: "10px 16px",
          boxShadow: "var(--glass-shadow)",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          {left}
        </div>

        {title && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              fontSize: 15,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flex: 1,
            justifyContent: "flex-end",
          }}
        >
          {right}
        </div>
      </div>
    </div>
  );
}
