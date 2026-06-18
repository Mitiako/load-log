import { useState, useRef, useEffect } from "react";
import { getLocations } from "../data/store";

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
    onChange(val);
    if (val.trim().length >= 1) {
      const all = getLocations();
      const filtered = all.filter((l) =>
        l.toLowerCase().includes(val.toLowerCase()),
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
    <div ref={ref} className="relative">
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
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
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-gray-500"
      />
      {show && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-lg">
          {suggestions.slice(0, 5).map((loc, i) => (
            <button
              key={i}
              onClick={() => handleSelect(loc)}
              className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 border-b border-gray-700 last:border-0"
            >
              {loc}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
