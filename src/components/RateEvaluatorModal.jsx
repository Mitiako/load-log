// RateEvaluatorModal.jsx
// Фото/скан RateCon → AI витягує рейт/маршрут/вагу → порівнює
// імпліцитний RPM (з урахуванням твоєї частки з Profile) з
// Break-Even Rate → чіткий вердикт: вигідно чи ні.
import { useState, useRef } from "react";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { compressImage } from "../utils/compressImage";

export default function RateEvaluatorModal({ profile, breakEvenRpm, onClose }) {
  useLockBodyScroll();
  const [scanning, setScanning] = useState(false);
  const [notARateCon, setNotARateCon] = useState(false);
  const [scanError, setScanError] = useState(false);
  const [rate, setRate] = useState("");
  const [miles, setMiles] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const fileRef = useRef(null);

  async function handleScan(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setNotARateCon(false);
    setScanError(false);
    try {
      const compressed = await compressImage(file, 1600, 0.75);
      const res = await fetch("/api/scan-ratecon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: compressed }),
      });
      const data = await res.json();

      if (data.error) {
        setScanError(true);
      } else if (data.notARateCon) {
        setNotARateCon(true);
      } else {
        setRate(data.rate ?? "");
        setMiles(data.miles ?? "");
        setOrigin(data.origin || "");
        setDestination(data.destination || "");
      }
    } catch (err) {
      console.error("RateCon scan failed:", err);
      setScanError(true);
    } finally {
      setScanning(false);
      e.target.value = "";
    }
  }

  const payMode = profile?.payMode || "pct";
  const payVal = Number(profile?.payVal) || 0;
  const r = Number(rate) || 0;
  const m = Number(miles) || 0;

  const myGross = payMode === "pct" ? (r * payVal) / 100 : (m * payVal) / 100;
  const impliedRpm = m > 0 ? myGross / m : null;

  const hasResult = r > 0 && m > 0 && breakEvenRpm !== null;
  const margin =
    hasResult && impliedRpm !== null ? impliedRpm - breakEvenRpm : null;
  const isProfitable = margin !== null && margin >= 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          maxHeight: "90dvh",
          overflowY: "auto",
          background: "var(--bg-elevated)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          borderRadius: "20px 20px 0 0",
          border: "1px solid var(--border)",
          padding: "24px 20px 40px",
          boxShadow: "var(--glass-shadow)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            fontSize: 17,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          Rate Evaluator
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-muted)",
            marginBottom: 16,
          }}
        >
          Scan a RateCon before accepting — see if it clears your break-even.
        </div>

        <button
          onClick={() => fileRef.current?.click()}
          disabled={scanning}
          style={{
            width: "100%",
            padding: "12px",
            border: "1px dashed var(--accent)",
            borderRadius: "var(--radius-btn)",
            background: "rgba(255,138,61,0.08)",
            color: "var(--accent)",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            cursor: scanning ? "default" : "pointer",
            opacity: scanning ? 0.6 : 1,
            marginBottom: 12,
          }}
        >
          {scanning ? "Scanning..." : "📷 Scan RateCon"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleScan}
        />

        {notARateCon && (
          <div
            style={{
              padding: "10px 12px",
              marginBottom: 12,
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: "var(--radius-btn)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "#f87171",
            }}
          >
            This doesn't look like a rate confirmation document.
          </div>
        )}
        {scanError && (
          <div
            style={{
              padding: "10px 12px",
              marginBottom: 12,
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: "var(--radius-btn)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "#f87171",
            }}
          >
            Couldn't read the document — enter details manually below.
          </div>
        )}

        {(origin || destination) && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--text-secondary)",
              marginBottom: 12,
            }}
          >
            {origin || "?"} → {destination || "?"}
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <div className="label" style={{ marginBottom: 6 }}>
            Rate ($)
          </div>
          <input
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="2800"
            className="input"
            style={{ fontSize: 14, padding: "10px 12px" }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div className="label" style={{ marginBottom: 6 }}>
            Miles
          </div>
          <input
            type="number"
            value={miles}
            onChange={(e) => setMiles(e.target.value)}
            placeholder="Often not printed — enter from map/dispatch"
            className="input"
            style={{ fontSize: 14, padding: "10px 12px" }}
          />
        </div>

        {breakEvenRpm === null ? (
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--text-muted)",
              textAlign: "center",
            }}
          >
            Set up your Break-Even Calculator first to get a verdict.
          </div>
        ) : hasResult ? (
          <div className="glass" style={{ padding: 20, textAlign: "center" }}>
            <div className="label" style={{ marginBottom: 6 }}>
              Your Net Rate
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 28,
                color: isProfitable ? "var(--accent)" : "#f87171",
                marginBottom: 8,
              }}
            >
              ${impliedRpm.toFixed(2)}/mi
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                fontSize: 14,
                color: isProfitable ? "var(--accent)" : "#f87171",
                marginBottom: 4,
              }}
            >
              {isProfitable ? "Profitable ✓" : "Below break-even ✗"}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              {margin >= 0 ? "+" : ""}
              {margin.toFixed(2)}/mi vs your ${breakEvenRpm.toFixed(2)}/mi
              break-even
            </div>
          </div>
        ) : (
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--text-muted)",
              textAlign: "center",
            }}
          >
            Enter both Rate and Miles to see your verdict.
          </div>
        )}
      </div>
    </div>
  );
}
