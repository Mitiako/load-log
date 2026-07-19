// LoadDetail.jsx
import { useState, useRef } from "react";
import { calcLoad, fmtDate, fmtMoney } from "../data/calc";
import { compressImage } from "../utils/compressImage";
import { BolIcon, CloseIcon } from "./icons/ProfileIcons";
import Header from "./Header";

export default function LoadDetail({
  load,
  onBack,
  onEdit,
  theme,
  onUpdatePhoto,
}) {
  const c = calcLoad(load);
  const [scanningBol, setScanningBol] = useState(false);
  const [bolToast, setBolToast] = useState(null);
  const bolRef = useRef(null);

  function showBolToast(message) {
    setBolToast(message);
    setTimeout(() => setBolToast(null), 5000);
  }

  async function handleBolCapture(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanningBol(true);
    try {
      const compressed = await compressImage(file);

      const res = await fetch("/api/scan-bol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: compressed }),
      });
      const data = await res.json();

      if (data.error) {
        showBolToast("Couldn't check the document, but photo was saved.");
      } else if (data.notABol) {
        showBolToast(
          "This doesn't look like a shipping document — check the photo before relying on it.",
        );
      } else {
        const issues = [];
        if (!data.hasSignature) issues.push("no signature visible");
        if (!data.hasStamp) issues.push("no stamp visible");
        if (!data.isClear) issues.push("photo may be too blurry/dark");
        if (issues.length > 0) {
          showBolToast(
            `Heads up: ${issues.join(", ")}. Factoring may reject this — consider retaking.`,
          );
        } else {
          showBolToast("Looks good — signature and stamp are visible.");
        }
      }

      await onUpdatePhoto("bolPhoto", compressed);
    } catch (err) {
      console.error("BOL scan failed:", err);
      showBolToast("Couldn't check the document, please try again.");
    } finally {
      setScanningBol(false);
      e.target.value = "";
    }
  }

  async function handleBolRemove(e) {
    e.stopPropagation();
    await onUpdatePhoto("bolPhoto", null);
  }

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

        <Section label="BOL PHOTO" />
        <div style={{ margin: "0 16px" }}>
          <div
            className="glass"
            style={{
              height: 160,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
              cursor: "pointer",
            }}
            onClick={() => bolRef.current?.click()}
          >
            {scanningBol ? (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                Checking document...
              </div>
            ) : load.bolPhoto ? (
              <>
                <img
                  src={load.bolPhoto}
                  alt="Bill of Lading"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <button
                  onClick={handleBolRemove}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 28,
                    height: 28,
                    borderRadius: 99,
                    border: "none",
                    background: "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(4px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <CloseIcon size={14} style={{ color: "#fff" }} />
                </button>
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <BolIcon
                  size={24}
                  style={{
                    display: "block",
                    margin: "0 auto 6px",
                    color: "var(--text-muted)",
                  }}
                />
                <div className="label">Add BOL Photo</div>
              </div>
            )}
            <input
              ref={bolRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={handleBolCapture}
            />
          </div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: "var(--text-muted)",
              padding: "8px 4px 0",
            }}
          >
            AI checks for signature and stamp — for your own review before
            sending to factoring, not a guarantee of approval.
          </div>
        </div>

        {bolToast && (
          <div
            style={{
              position: "fixed",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              maxWidth: "calc(100% - 32px)",
              zIndex: 300,
              padding: "12px 18px",
              background: "var(--bg-elevated)",
              backdropFilter: "var(--glass-blur)",
              WebkitBackdropFilter: "var(--glass-blur)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-btn)",
              boxShadow: "var(--glass-shadow)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--text-primary)",
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            {bolToast}
          </div>
        )}
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
