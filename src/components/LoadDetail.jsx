// LoadDetail.jsx
import { calcLoad, fmtDate, fmtMoney } from "../data/calc";
import Header from "./Header";

export default function LoadDetail({ load, onBack, onEdit, theme }) {
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
        <RouteMap
          from={load.from}
          to={load.to}
          miles={load.miles}
          theme={theme}
        />
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

function RouteMap({ from, to, miles, theme }) {
  // hl=en примусово задає англійську (без цього мапа підлаштовується
  // під мову Google-акаунту/браузера користувача).
  const src = `https://www.google.com/maps?saddr=${encodeURIComponent(
    from,
  )}&daddr=${encodeURIComponent(to)}&output=embed&hl=en`;
  const openUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    from,
  )}&destination=${encodeURIComponent(to)}`;

  // Google Embed (без API-ключа) не має офіційного dark-mode параметра.
  // invert+hue-rotate — поширений CSS-хак, який імітує темну мапу:
  // інвертує яскравість (світлі дороги/вода стають темними), а
  // hue-rotate повертає кольори (щоб вода знову була синьою, а не
  // жовтогарячою після інверсії).
  const mapFilter =
    theme === "light"
      ? "none"
      : "invert(90%) hue-rotate(180deg) brightness(0.95) contrast(0.9)";

  return (
    <div style={{ margin: "0 16px 16px" }}>
      <div
        className="glass"
        style={{
          padding: 0,
          overflow: "hidden",
          borderRadius: "var(--radius-card)",
          background: theme === "light" ? "transparent" : "#1a1a1a",
        }}
      >
        <iframe
          title="Route map"
          src={src}
          width="100%"
          height="200"
          style={{ border: 0, display: "block", filter: mapFilter }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 4px 0",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--text-muted)",
          }}
        >
          Approximate route · Your entry: {miles.toLocaleString()} mi
        </span>
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--accent)",
            textDecoration: "none",
          }}
        >
          Open in Maps →
        </a>
      </div>
    </div>
  );
}
