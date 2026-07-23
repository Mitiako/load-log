// CityStateInput.jsx
// Розбиває поле "Місто, Штат" на два окремі інпути — текстове City
// (з автопідказками з історії, як LocationInput) і випадаючий список State.
// Назовні віддає комбіноване значення "City, ST" через onChange — так решта
// застосунку (LoadCard, PrintView, Analytics) й далі працює з одним рядком.
import { useState, useRef, useEffect } from "react";
import { getLocations } from "../data/store";
import { stripCyrillic } from "../utils/textFilters";
import { US_STATES } from "../data/usStates";

function splitValue(value) {
  const parts = (value || "").split(",");
  if (parts.length >= 2) {
    return {
      city: parts.slice(0, -1).join(",").trim(),
      state: parts[parts.length - 1].trim().toUpperCase(),
    };
  }
  return { city: (value || "").trim(), state: "" };
}

export default function CityStateInput({
  label,
  value,
  onChange,
  placeholder,
  zip,
  onZipChange,
}) {
  const initial = splitValue(value);
  const [city, setCity] = useState(initial.city);
  const [state, setState] = useState(initial.state);
  const [suggestions, setSuggestions] = useState([]);
  const [show, setShow] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setShow(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function emit(nextCity, nextState) {
    const combined =
      nextCity && nextState ? `${nextCity}, ${nextState}` : nextCity;
    onChange(combined);
  }

  function handleCityChange(val) {
    const clean = stripCyrillic(val);
    setCity(clean);
    emit(clean, state);
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

  function handleSelectSuggestion(loc) {
    const parsed = splitValue(loc);
    setCity(parsed.city);
    if (parsed.state) setState(parsed.state);
    emit(parsed.city, parsed.state || state);
    setShow(false);
  }

  function handleStateChange(val) {
    setState(val);
    emit(city, val);
  }

  return (
    <div>
      <div className="label" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: onZipChange ? "1.6fr 0.8fr 1fr" : "1fr 78px",
          gap: 8,
        }}
      >
        <div ref={ref} style={{ position: "relative" }}>
          <input
            type="text"
            value={city}
            onChange={(e) => handleCityChange(e.target.value)}
            placeholder={placeholder || "City"}
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
                  onClick={() => handleSelectSuggestion(loc)}
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
        <select
          value={state}
          onChange={(e) => handleStateChange(e.target.value)}
          className="input"
          style={{
            fontSize: 14,
            padding: "10px 6px",
            textAlign: "center",
            color: "var(--text-primary)",
          }}
        >
          <option value="" style={{ color: "#111218", background: "#fff" }}>
            St
          </option>
          {US_STATES.map((s) => (
            <option
              key={s}
              value={s}
              style={{ color: "#111218", background: "#fff" }}
            >
              {s}
            </option>
          ))}
        </select>
        {onZipChange && (
          <input
            type="text"
            inputMode="numeric"
            value={zip || ""}
            onChange={(e) => onZipChange(e.target.value)}
            placeholder="ZIP"
            className="input"
            style={{ fontSize: 14, padding: "10px 12px" }}
          />
        )}
      </div>
    </div>
  );
}
