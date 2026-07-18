// LoadDetail.jsx
import { calcLoad, fmtDate, fmtMoney } from "../data/calc";
import Header from "./Header";

export default function LoadDetail({ load, onBack, onEdit }) {
  const c = calcLoad(load);

  return (
    <div
      style={{
        height: "100svh",
        background: "transparent",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Header
        left={
          <button
            onClick={onEdit}
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
              (e.currentTarget.style.color = "var(--accent)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-muted)")
            }
          >
            EDIT
          </button>
        }
        title={`${load.from} → ${load.to}`}
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

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0 32px" }}>
        <Section label="ROUTE" />
        <Row label="Date" value={fmtDate(load.date)} />
        <Row label="Loaded miles" value={`${load.miles.toLocaleString()} mi`} />
        {load.dh > 0 && <Row label="Deadhead" value={`${load.dh} mi`} />}
        {load.weight > 0 && (
          <Row label="Weight" value={`${load.weight.toLocaleString()} lbs`} />
        )}

        <Section label="PAY" />
        <Row label="Gross rate" value={fmtMoney(load.gross)} />
        <Row
          label="Your share"
          value={
            load.payMode === "pct"
              ? `${load.payVal}% of gross`
              : `${load.payVal}¢/mile`
          }
        />
        <Row label="Your gross" value={fmtMoney(c.myGross)} />
        <Row label="RPM" value={`$${c.ppm.toFixed(2)}/mi`} />
        <Row
          label="Total expenses"
          value={fmtMoney(c.fuelActual + c.otherExp)}
        />

        {(load.diesel?.length > 0 || load.expenses?.length > 0) && (
          <>
            <Section label="EXPENSES" />
            {load.diesel?.map((d, i) => (
              <div key={i}>
                <Row
                  label={`Fuel${d.location ? ` — ${d.location}` : ""} (${d.gallons} gal)`}
                  value={`$${d.amount} − $${d.discount} = $${d.amount - d.discount}`}
                />
                {d.date && <Row label="Fuel date" value={fmtDate(d.date)} />}
              </div>
            ))}
            {load.expenses?.map((e, i) => (
              <Row key={i} label={e.name} value={fmtMoney(e.amount)} />
            ))}
            {c.fuelActual > 0 && (
              <Row label="Total fuel (actual)" value={fmtMoney(c.fuelActual)} />
            )}
          </>
        )}

        <div style={{ margin: "20px 16px 0" }}>
          <div
            className="glass"
            style={{
              padding: "18px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                fontSize: 16,
                color: "var(--text-primary)",
              }}
            >
              Net profit
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 22,
                color: c.net >= 0 ? "var(--accent)" : "#f87171",
              }}
            >
              {fmtMoney(c.net)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 20px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          color: "var(--text-secondary)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          fontWeight: 500,
          color: "var(--text-primary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Section({ label }) {
  return (
    <div
      style={{
        padding: "20px 20px 8px",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.2em",
        color: "var(--text-muted)",
      }}
    >
      {label}
    </div>
  );
}
