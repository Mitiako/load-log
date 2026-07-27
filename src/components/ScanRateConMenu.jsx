// ScanRateConMenu.jsx
import { useState, useRef, useEffect } from "react";

// Іконка-тригер: анімований документ, що скенується (glow + рухома лінія).
// Одна компактна кнопка замість двох довгих — вибір джерела (камера/файл)
// ховається в dropdown, щоб заголовок ROUTE не був перевантажений.
export default function ScanRateConMenu({ onScan, scanning }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  function handleFileChange(e) {
    setOpen(false);
    onScan(e);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        onClick={() => !scanning && setOpen((o) => !o)}
        disabled={scanning}
        aria-label="Scan Rate Confirmation"
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: scanning ? "default" : "pointer",
          opacity: scanning ? 0.5 : 1,
          display: "flex",
          alignItems: "center",
          lineHeight: 0,
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 320 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <clipPath id="pageClipMenu">
              <path d="M64 65C64 47.3269 78.3269 33 96 33H196L256 93V255C256 272.673 241.673 287 224 287H96C78.3269 287 64 272.673 64 255V65Z" />
            </clipPath>
          </defs>
          <path
            d="M64 65C64 47.3269 78.3269 33 96 33H196L256 93V255C256 272.673 241.673 287 224 287H96C78.3269 287 64 272.673 64 255V65Z"
            fill="var(--bg-elevated)"
            stroke="var(--accent)"
            strokeWidth="9"
            strokeLinejoin="round"
            style={{
              animation: scanning
                ? "scanGlow 1.1s ease-in-out infinite"
                : "none",
            }}
          />
          <path
            d="M196 33V77C196 85.8366 203.163 93 212 93H256L196 33Z"
            fill="var(--bg-elevated)"
            stroke="var(--accent)"
            strokeWidth="9"
            strokeLinejoin="round"
          />
          <text
            x="160"
            y="172"
            textAnchor="middle"
            fontFamily="var(--font-sans)"
            fontSize="28"
            fontWeight="700"
            letterSpacing="2"
            fill="var(--accent)"
          >
            DOC INFO
          </text>
          <line
            x1="103"
            y1="200"
            x2="217"
            y2="200"
            stroke="var(--accent)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <line
            x1="103"
            y1="228"
            x2="217"
            y2="228"
            stroke="var(--accent)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <g clipPath="url(#pageClipMenu)">
            <rect
              x="60"
              y="160"
              width="200"
              height="18"
              fill="var(--accent)"
              opacity=".55"
              style={{
                animation: scanning
                  ? "scanMove 1.1s ease-in-out infinite, scanFade 1.1s ease-in-out infinite"
                  : "none",
              }}
            />
          </g>
        </svg>
      </button>

      <style>{`
        @keyframes scanMove { 0% { transform: translateY(-70px); } 100% { transform: translateY(70px); } }
        @keyframes scanFade { 0%, 100% { opacity: 0; } 15%, 85% { opacity: 1; } }
        @keyframes scanGlow { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.25); } }
      `}</style>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 50,
            minWidth: 180,
            padding: 8,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            background: "var(--bg-elevated)",
            backdropFilter: "var(--glass-blur)",
            WebkitBackdropFilter: "var(--glass-blur)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-btn)",
            boxShadow: "var(--glass-shadow)",
          }}
        >
          <MenuItem
            label="📷 Take Photo"
            onClick={() => cameraInputRef.current?.click()}
          />
          <MenuItem
            label="📁 Upload File"
            onClick={() => fileInputRef.current?.click()}
          />
        </div>
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
}

function MenuItem({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px",
        border: "1px dashed var(--accent)",
        borderRadius: "var(--radius-btn)",
        background: "rgba(255,138,61,0.08)",
        color: "var(--accent)",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}
