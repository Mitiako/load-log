// Monthly.jsx
import { useState } from "react";
import { calcLoad, fmtMoney } from "../data/calc";
import { getSettings, saveSettings } from "../data/store";
import Header from "./Header";

export default function Monthly({ loads, onBack, onPrint }) {
  const settings = getSettings();
  const [ins, setIns] = useState(settings.ins || "");
  const [truck, setTruck] = useState(settings.truck || "");
  const [trailer, setTrailer] = useState(settings.trailer || "");
  const [eld, setEld] = useState(settings.eld || "");
  const [other, setOther] = useState(settings.fixedOther || "");

  const calcs = loads.map((l) => calcLoad(l));
  const totalMiles = loads.reduce((s, l) => s + l.miles + (l.dh || 0), 0);
  const totalGross = loads.reduce((s, l) => s + l.gross, 0);
  const totalMyGross = calcs.reduce((s, c) => s + c.myGross, 0);
  const totalFuel = calcs.reduce((s, c) => s + c.fuelActual, 0);
  const totalOther = calcs.reduce((s, c) => s + c.otherExp, 0);
  const netFromLoads = calcs.reduce((s, c) => s + c.net, 0);

  const fixed =
    (Number(ins) || 0) +
    (Number(truck) || 0) +
    (Number(trailer) || 0) +
    (Number(eld) || 0) +
    (Number(other) || 0);
  const finalNet = netFromLoads - fixed;

  function handleFixed(setter, key, val) {
    setter(val);
    saveSettings({ ...getSettings(), [key]: val });
  }

  return (
    <div
      style={{
        height: "100dvh",
        background: "transparent",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Header
        title="Trip Summary"
        left={
          <button
            onClick={onPrint}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.06em",
              color: "var(--text-muted)",
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-btn)",
              padding: "6px 12px",
              cursor: "pointer",
              transition: "all var(--transition)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.borderColor = "var(--border-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-muted)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            PRINT / PDF
          </button>
        }
        right={
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
        }
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "0 0 32px" }}>
        {/* Stat grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            padding: "16px 16px 8px",
          }}
        >
          <StatCard label="Loads" value={loads.length} />
          <StatCard label="Total miles" value={totalMiles.toLocaleString()} />
          <StatCard label="Total gross" value={fmtMoney(totalGross)} />
          <StatCard
            label="Net from loads"
            value={fmtMoney(netFromLoads)}
            highlight={netFromLoads >= 0 ? "green" : "red"}
          />
        </div>

        {/* Breakdown */}
        <div
          className="glass"
          style={{ margin: "8px 16px 16px", padding: "16px 20px" }}
        >
          <ResultRow
            label="Your gross (after company)"
            value={fmtMoney(totalMyGross)}
          />
          <ResultRow label="Fuel (actual paid)" value={fmtMoney(totalFuel)} />
          <ResultRow label="Other expenses" value={fmtMoney(totalOther)} />
          <div
            style={{ height: 1, background: "var(--border)", margin: "12px 0" }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                fontSize: 14,
                color: "var(--text-primary)",
              }}
            >
              Net from loads
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 16,
                color: netFromLoads >= 0 ? "var(--accent)" : "#f87171",
              }}
            >
              {fmtMoney(netFromLoads)}
            </span>
          </div>
        </div>

        {/* Fixed costs */}
        <div
          style={{
            padding: "4px 16px 8px",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.2em",
            color: "var(--text-muted)",
          }}
        >
          FIXED MONTHLY COSTS
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            padding: "0 16px 10px",
          }}
        >
          <Field
            label="Insurance $"
            value={ins}
            onChange={(v) => handleFixed(setIns, "ins", v)}
          />
          <Field
            label="Truck payment $"
            value={truck}
            onChange={(v) => handleFixed(setTruck, "truck", v)}
          />
          <Field
            label="Trailer rent $"
            value={trailer}
            onChange={(v) => handleFixed(setTrailer, "trailer", v)}
          />
          <Field
            label="ELD $"
            value={eld}
            onChange={(v) => handleFixed(setEld, "eld", v)}
          />
        </div>
        <div style={{ padding: "0 16px 16px" }}>
          <Field
            label="Other fixed $"
            value={other}
            onChange={(v) => handleFixed(setOther, "fixedOther", v)}
          />
        </div>

        {/* Final */}
        <div
          className="glass"
          style={{ margin: "0 16px", padding: "16px 20px" }}
        >
          <ResultRow label="Total fixed costs" value={`−${fmtMoney(fixed)}`} />
          <div
            style={{ height: 1, background: "var(--border)", margin: "12px 0" }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                fontSize: 15,
                color: "var(--text-primary)",
              }}
            >
              Final net profit
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 22,
                color: finalNet >= 0 ? "var(--accent)" : "#f87171",
              }}
            >
              {fmtMoney(finalNet)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }) {
  const color =
    highlight === "green"
      ? "var(--accent)"
      : highlight === "red"
        ? "#f87171"
        : "var(--text-primary)";
  return (
    <div className="glass" style={{ padding: "14px 16px" }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.16em",
          color: "var(--text-muted)",
          marginBottom: 8,
        }}
      >
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          fontSize: 22,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ResultRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "5px 0",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          color: "var(--text-secondary)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          color: "var(--text-primary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <input
        type="number"
        value={value}
        placeholder="0"
        onChange={(e) => onChange(e.target.value)}
        className="input"
        style={{ fontSize: 14, padding: "10px 12px" }}
      />
    </div>
  );
}
