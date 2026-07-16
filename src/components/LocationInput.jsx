import { useState, useRef, useEffect } from "react";
import { getLocations } from "../data/store";
import { stripCyrillic } from "../utils/textFilters";

export default function LocationInput({ label, value, onChange, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [show, setShow] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setShow(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleChange(val) {
    const clean = stripCyrillic(val);
    onChange(clean);
    if (clean.trim().length >= 1) {
      const all = getLocations();
      const filtered = all.filter((l) =>
        l.toLowerCase().includes(clean.toLowerCase()),
      );
      setSuggestions(filtered);
      setShow(filtered.length > 0);
    } else {
      setShow(false);
    }
  }

  function handleSelect(loc) {
    onChange(loc);
    setShow(false);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div className="label" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => {
          if (value.trim().length >= 1) {
            const all = getLocations();
            const filtered = all.filter((l) =>
              l.toLowerCase().includes(value.toLowerCase()),
            );
            setSuggestions(filtered);
            setShow(filtered.length > 0);
          }
        }}
        placeholder={placeholder}
        className="input"
        style={{ fontSize: 14, padding: "10px 12px" }}
      />
      {show && (
        <div
          style={{
            position: "absolute",
            zIndex: 50,
            width: "100%",
            marginTop: 4,
            background: "var(--bg-elevated)",
            backdropFilter: "var(--glass-blur)",
            WebkitBackdropFilter: "var(--glass-blur)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-btn)",
            overflow: "hidden",
            boxShadow: "var(--glass-shadow)",
          }}
        >
          {suggestions.slice(0, 5).map((loc, i) => (
            <button
              key={i}
              onClick={() => handleSelect(loc)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--text-secondary)",
                background: "transparent",
                border: "none",
                borderBottom:
                  i < suggestions.slice(0, 5).length - 1
                    ? "1px solid var(--border)"
                    : "none",
                cursor: "pointer",
                transition: "background var(--transition)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--accent-subtle)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {loc}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
