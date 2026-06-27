// PrintView.jsx
import { calcLoad, fmtDate, fmtMoney } from "../data/calc";

export default function PrintView({ loads, onClose }) {
  const pages = [];
  for (let i = 0; i < loads.length; i += 4) {
    pages.push(loads.slice(i, i + 4));
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#ffffff" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page-break { page-break-before: always !important; break-before: page !important; }
        }
      `}</style>

      {/* Screen-only header */}
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          background: "var(--bg-base)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <button
          onClick={onClose}
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
          ← BACK
        </button>
        <button
          onClick={() => window.print()}
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            fontSize: 13,
            background: "var(--accent)",
            color: "#100F0C",
            border: "none",
            borderRadius: "var(--radius-btn)",
            padding: "10px 20px",
            cursor: "pointer",
          }}
        >
          Print / Save as PDF
        </button>
      </div>

      {/* Pages */}
      {pages.map((pageLoads, pageIdx) => (
        <div key={pageIdx} className={pageIdx > 0 ? "page-break" : ""}>
          <div
            style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px" }}
          >
            {/* Report header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
                paddingBottom: 16,
                borderBottom: "2px solid #100F0C",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg viewBox="0 0 100 100" width="32" height="32" fill="none">
                  <path
                    d="M31 23 V77 H59"
                    stroke="#100F0C"
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
                <div>
                  <div
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 700,
                      fontSize: 18,
                      color: "#100F0C",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    LOAD<span style={{ color: "#FF8A3D" }}>LOG</span>
                  </div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9,
                      letterSpacing: "0.2em",
                      color: "#8E8A82",
                    }}
                  >
                    DAILY FREIGHT JOURNAL
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 600,
                    fontSize: 14,
                    color: "#100F0C",
                  }}
                >
                  Monthly Report
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: "#8E8A82",
                    marginTop: 2,
                  }}
                >
                  {pageIdx > 0
                    ? `Page ${pageIdx + 1}`
                    : new Date().toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                </div>
              </div>
            </div>

            {/* Load cards grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              {pageLoads.map((load, i) => {
                const c = calcLoad(load);
                return (
                  <div
                    key={i}
                    style={{
                      border: "1px solid #E5E2DC",
                      borderRadius: 10,
                      padding: 14,
                      breakInside: "avoid",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontWeight: 700,
                        fontSize: 13,
                        color: "#100F0C",
                        marginBottom: 8,
                        paddingBottom: 8,
                        borderBottom: "1px solid #E5E2DC",
                      }}
                    >
                      {load.from} → {load.to}
                    </div>

                    <PrintRow label="Date" value={fmtDate(load.date)} />
                    <PrintRow
                      label="Loaded miles"
                      value={`${load.miles.toLocaleString()} mi`}
                    />
                    {load.dh > 0 && (
                      <PrintRow label="Deadhead" value={`${load.dh} mi`} />
                    )}
                    {load.weight > 0 && (
                      <PrintRow
                        label="Weight"
                        value={`${load.weight.toLocaleString()} lbs`}
                      />
                    )}

                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 9,
                        letterSpacing: "0.16em",
                        color: "#8E8A82",
                        margin: "8px 0 4px",
                        textTransform: "uppercase",
                      }}
                    >
                      Pay
                    </div>
                    <PrintRow label="Gross rate" value={fmtMoney(load.gross)} />
                    <PrintRow
                      label="Your share"
                      value={
                        load.payMode === "pct"
                          ? `${load.payVal}%`
                          : `${load.payVal}¢/mi`
                      }
                    />
                    <PrintRow label="Your gross" value={fmtMoney(c.myGross)} />

                    {(load.diesel?.length > 0 || load.expenses?.length > 0) && (
                      <div
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 9,
                          letterSpacing: "0.16em",
                          color: "#8E8A82",
                          margin: "8px 0 4px",
                          textTransform: "uppercase",
                        }}
                      >
                        Expenses
                      </div>
                    )}
                    {load.diesel?.map((d, j) => (
                      <PrintRow
                        key={j}
                        label={`Fuel #${j + 1}`}
                        value={`$${d.amount} − $${d.discount} = $${d.amount - d.discount}`}
                      />
                    ))}
                    {load.expenses?.map((e, j) => (
                      <PrintRow
                        key={j}
                        label={e.name}
                        value={fmtMoney(e.amount)}
                      />
                    ))}
                    <PrintRow
                      label="Total expenses"
                      value={fmtMoney(c.fuelActual + c.otherExp)}
                    />

                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: "1px solid #E5E2DC",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontWeight: 700,
                          fontSize: 12,
                          color: "#100F0C",
                        }}
                      >
                        Net profit
                      </span>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 700,
                          fontSize: 13,
                          color: c.net >= 0 ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {fmtMoney(c.net)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Page summary */}
            <PageSummary loads={pageLoads} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PageSummary({ loads }) {
  const calcs = loads.map((l) => calcLoad(l));
  const totalMiles = loads.reduce((s, l) => s + l.miles + (l.dh || 0), 0);
  const totalGross = loads.reduce((s, l) => s + l.gross, 0);
  const totalFuel = calcs.reduce((s, c) => s + c.fuelActual, 0);
  const totalGallons = loads.reduce(
    (s, l) =>
      s + (l.diesel || []).reduce((ds, d) => ds + (Number(d.gallons) || 0), 0),
    0,
  );
  const totalDiscount = loads.reduce(
    (s, l) =>
      s + (l.diesel || []).reduce((ds, d) => ds + (Number(d.discount) || 0), 0),
    0,
  );
  const totalNet = calcs.reduce((s, c) => s + c.net, 0);

  const cols = [
    "Loads",
    "Miles",
    "Gross",
    "Fuel",
    "Gallons",
    "Discount",
    "Net Profit",
  ];
  const vals = [
    loads.length,
    totalMiles.toLocaleString(),
    fmtMoney(totalGross),
    fmtMoney(totalFuel),
    totalGallons,
    fmtMoney(totalDiscount),
    fmtMoney(totalNet),
  ];

  return (
    <div
      style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #E5E2DC" }}
    >
      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 12,
          color: "#100F0C",
          marginBottom: 10,
          textAlign: "center",
          letterSpacing: "0.04em",
        }}
      >
        PAGE SUMMARY
      </div>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
      >
        <thead>
          <tr style={{ background: "#F4F1EB" }}>
            {cols.map((col) => (
              <th
                key={col}
                style={{
                  border: "1px solid #E5E2DC",
                  padding: "6px 10px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: "#5C594F",
                  textAlign: "center",
                  letterSpacing: "0.06em",
                }}
              >
                {col.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {vals.map((val, i) => (
              <td
                key={i}
                style={{
                  border: "1px solid #E5E2DC",
                  padding: "8px 10px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  textAlign: "center",
                  color:
                    i === vals.length - 1
                      ? totalNet >= 0
                        ? "#16a34a"
                        : "#dc2626"
                      : "#100F0C",
                  fontWeight: i === vals.length - 1 ? 700 : 400,
                }}
              >
                {val}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PrintRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "2px 0",
      }}
    >
      <span
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 11,
          color: "#8E8A82",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: "#100F0C",
          fontWeight: 500,
        }}
      >
        {value}
      </span>
    </div>
  );
}
