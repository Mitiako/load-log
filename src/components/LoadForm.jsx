// LoadForm.jsx
import { useState, useEffect } from "react";
import { calcLoad, fmtMoney } from "../data/calc";
import { getSettings, saveSettings } from "../data/store";
import { fetchProfile } from "../data/firestore";
import CityStateInput from "./CityStateInput";
import LocationInput from "./LocationInput";
import Header from "./Header";

export default function LoadForm({ load, onSave, onBack, user }) {
  const settings = getSettings();

  const [from, setFrom] = useState(load?.from || "");
  const [to, setTo] = useState(load?.to || "");
  const [miles, setMiles] = useState(load?.miles || "");
  const [date, setDate] = useState(
    load?.date || new Date().toISOString().split("T")[0],
  );
  const [dh, setDh] = useState(load?.dh || "");
  const [showDh, setShowDh] = useState(load?.dh > 0 || false);
  const [gross, setGross] = useState(load?.gross || "");
  const [payMode, setPayMode] = useState(
    load?.payMode || settings.payMode || "pct",
  );
  const [payVal, setPayVal] = useState(load?.payVal || settings.payVal || "");

  // Для нового лоуда поля Pay Mode/Val підставляються з Profile.
  // Показуємо це драйверу явно — щоб не заповнював лоуд застарілими
  // даними мовчки, якщо забув оновити Profile.
  const [payAutofilled] = useState(!load);

  useEffect(() => {
    if (!load && user?.uid) {
      fetchProfile(user.uid).then((profile) => {
        if (profile?.payMode) setPayMode(profile.payMode);
        if (profile?.payVal) setPayVal(String(profile.payVal));
      });
    }
  }, [load, user]);
  const [weight, setWeight] = useState(load?.weight || "");
  const [locationError, setLocationError] = useState(false);
  const [diesel, setDiesel] = useState(load?.diesel?.length ? load.diesel : []);
  const [expenses, setExpenses] = useState(
    load?.expenses?.length ? load.expenses : [],
  );

  const currentLoad = {
    miles: Number(miles) || 0,
    dh: showDh ? Number(dh) || 0 : 0,
    gross: Number(gross) || 0,
    payMode,
    payVal: Number(payVal) || 0,
    diesel: diesel.map((d) => ({
      location: d.location || "",
      date: d.date || "",
      gallons: Number(d.gallons) || 0,
      amount: Number(d.amount) || 0,
      discount: Number(d.discount) || 0,
    })),
    expenses: expenses.map((e) => ({
      name: e.name,
      amount: Number(e.amount) || 0,
    })),
  };

  const c = currentLoad.gross ? calcLoad(currentLoad) : null;

  function handlePayMode(mode) {
    setPayMode(mode);
    saveSettings({ ...getSettings(), payMode: mode });
  }
  function handlePayVal(val) {
    setPayVal(val);
    saveSettings({ ...getSettings(), payVal: val });
  }
  function addDiesel() {
    setDiesel([
      ...diesel,
      { location: "", date: "", gallons: "", amount: "", discount: "" },
    ]);
  }
  function updateDiesel(i, field, val) {
    const u = [...diesel];
    u[i] = { ...u[i], [field]: val };
    setDiesel(u);
  }
  function removeDiesel(i) {
    setDiesel(diesel.filter((_, idx) => idx !== i));
  }
  function addExpense() {
    setExpenses([...expenses, { name: "", amount: "" }]);
  }
  function updateExpense(i, field, val) {
    const u = [...expenses];
    u[i] = { ...u[i], [field]: val };
    setExpenses(u);
  }
  function removeExpense(i) {
    setExpenses(expenses.filter((_, idx) => idx !== i));
  }

  function handleSave() {
    if (!gross) return;
    if (!from.includes(",") || !to.includes(",")) {
      setLocationError(true);
      return;
    }
    setLocationError(false);
    onSave({
      from: from || "Unknown",
      to: to || "Unknown",
      miles: Number(miles) || 0,
      dh: showDh ? Number(dh) || 0 : 0,
      gross: Number(gross),
      payMode,
      payVal: Number(payVal),
      weight: Number(weight) || 0,
      date,
      diesel: diesel.filter((d) => d.amount),
      expenses: expenses.filter((e) => e.amount),
    });
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
        title={load ? "Edit Load" : "New Load"}
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

      {/* Form */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 0 32px" }}>
        {/* Route */}
        <FormSection label="ROUTE" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            padding: "0 16px 12px",
          }}
        >
          <CityStateInput
            label="From"
            value={from}
            onChange={setFrom}
            placeholder="Chicago"
          />
          <CityStateInput
            label="To"
            value={to}
            onChange={setTo}
            placeholder="Dallas"
          />
        </div>
        {locationError && (
          <div
            style={{
              margin: "0 16px 12px",
              padding: "10px 12px",
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: "var(--radius-btn)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "#f87171",
              lineHeight: 1.4,
            }}
          >
            Please select a state for both From and To — this keeps your route
            accurate.
          </div>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            padding: "0 16px 12px",
          }}
        >
          <Field
            label="Loaded miles"
            value={miles}
            onChange={setMiles}
            type="number"
            placeholder="1100"
          />
          <Field label="Date" value={date} onChange={setDate} type="date" />
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 16px 16px",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--text-secondary)",
          }}
        >
          <input
            type="checkbox"
            checked={showDh}
            onChange={(e) => setShowDh(e.target.checked)}
            style={{ accentColor: "var(--accent)", width: 16, height: 16 }}
          />
          Add deadhead miles
        </label>
        {showDh && (
          <div style={{ padding: "0 16px 12px" }}>
            <Field
              label="Deadhead miles"
              value={dh}
              onChange={setDh}
              type="number"
              placeholder="50"
            />
          </div>
        )}

        {/* Pay */}
        <div
          style={{ height: 1, background: "var(--border)", margin: "4px 0" }}
        />
        <FormSection label="PAY" />

        {payAutofilled && (
          <div
            style={{
              background: "rgba(255,138,61,0.1)",
              border: "1px solid rgba(255,138,61,0.25)",
              borderRadius: "var(--radius-btn)",
              padding: "10px 12px",
              margin: "0 16px 12px",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--accent)",
              lineHeight: 1.4,
            }}
          >
            Auto-filled from your Profile — double-check it's still correct for
            this load.
          </div>
        )}

        {/* Toggle */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            margin: "0 16px 12px",
            background: "var(--bg-base)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-btn)",
            overflow: "hidden",
          }}
        >
          {["pct", "cpm"].map((mode) => (
            <button
              key={mode}
              onClick={() => handlePayMode(mode)}
              style={{
                padding: "10px",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 500,
                background: payMode === mode ? "var(--accent)" : "transparent",
                color: payMode === mode ? "#100F0C" : "var(--text-muted)",
                transition: "all var(--transition)",
              }}
            >
              {mode === "pct" ? "% of gross" : "Cents per mile"}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            padding: "0 16px 4px",
          }}
        >
          <Field
            label="Gross rate $"
            value={gross}
            onChange={setGross}
            type="number"
            placeholder="2800"
          />
          <Field
            label={payMode === "pct" ? "Your share %" : "Cents per mile"}
            value={payVal}
            onChange={handlePayVal}
            type="number"
            placeholder={payMode === "pct" ? "87" : "90"}
          />
        </div>
        <p
          style={{
            padding: "4px 16px 12px",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-muted)",
            lineHeight: 1.5,
          }}
        >
          {payMode === "pct"
            ? "Owner-operator: ~85–87%. Hired driver: ~28–32%."
            : "Enter cents per mile as a whole number (e.g. 90 = $0.90/mile)."}
        </p>
        <div style={{ padding: "0 16px 12px" }}>
          <Field
            label="Weight (lbs)"
            value={weight}
            onChange={setWeight}
            type="number"
            placeholder="15000"
          />
        </div>

        {/* Diesel */}
        <div
          style={{ height: 1, background: "var(--border)", margin: "4px 0" }}
        />
        <FormSection label="DIESEL" />
        {diesel.map((d, i) => (
          <div
            key={i}
            style={{
              padding: "0 16px 16px",
              borderBottom: "1px solid var(--border)",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <LocationInput
                label="Location"
                value={d.location || ""}
                onChange={(v) => updateDiesel(i, "location", v)}
                placeholder="Oklahoma City, OK"
              />
              <Field
                label="Date"
                value={d.date}
                onChange={(v) => updateDiesel(i, "date", v)}
                type="date"
                placeholder=""
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr auto",
                gap: 8,
                alignItems: "flex-end",
              }}
            >
              <Field
                label="Gallons"
                value={d.gallons}
                onChange={(v) => updateDiesel(i, "gallons", v)}
                placeholder="219"
              />
              <Field
                label="Amount $"
                value={d.amount}
                onChange={(v) => updateDiesel(i, "amount", v)}
                placeholder="840"
              />
              <Field
                label="Discount $"
                value={d.discount}
                onChange={(v) => updateDiesel(i, "discount", v)}
                placeholder="226"
              />
              <button
                onClick={() => removeDiesel(i)}
                style={{
                  height: 42,
                  width: 36,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-input)",
                  background: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-muted)")
                }
              >
                ×
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={addDiesel}
          style={{
            display: "block",
            margin: "0 16px 12px",
            width: "calc(100% - 32px)",
            padding: "10px",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius-btn)",
            background: "transparent",
            color: "var(--text-muted)",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            cursor: "pointer",
            transition:
              "border-color var(--transition), color var(--transition)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--accent)";
            e.currentTarget.style.color = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.color = "var(--text-muted)";
          }}
        >
          + Add fuel stop
        </button>

        {/* Other expenses */}
        <div
          style={{ height: 1, background: "var(--border)", margin: "4px 0" }}
        />
        <FormSection label="OTHER EXPENSES" />
        {expenses.map((e, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
              gap: 8,
              padding: "0 16px 8px",
              alignItems: "flex-end",
            }}
          >
            <Field
              label="Description"
              value={e.name}
              onChange={(v) => updateExpense(i, "name", v)}
              placeholder="Lumper, tolls..."
              type="text"
            />
            <Field
              label="Amount $"
              value={e.amount}
              onChange={(v) => updateExpense(i, "amount", v)}
              placeholder="0"
            />
            <button
              onClick={() => removeExpense(i)}
              style={{
                height: 42,
                width: 36,
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-input)",
                background: "transparent",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-muted)")
              }
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={addExpense}
          style={{
            display: "block",
            margin: "0 16px 12px",
            width: "calc(100% - 32px)",
            padding: "10px",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius-btn)",
            background: "transparent",
            color: "var(--text-muted)",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            cursor: "pointer",
            transition:
              "border-color var(--transition), color var(--transition)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--accent)";
            e.currentTarget.style.color = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.color = "var(--text-muted)";
          }}
        >
          + Add expense
        </button>

        {/* Live result */}
        {c && (
          <>
            <div
              style={{
                height: 1,
                background: "var(--border)",
                margin: "4px 0",
              }}
            />
            <FormSection label="RESULT" />
            <div
              className="glass"
              style={{
                margin: "0 16px 16px",
                padding: "16px 20px",
              }}
            >
              <ResultRow label="Gross" value={fmtMoney(currentLoad.gross)} />
              <ResultRow label="Company share" value={`−${fmtMoney(c.cut)}`} />
              <ResultRow label="Your gross" value={fmtMoney(c.myGross)} />
              {c.fuelActual > 0 && (
                <ResultRow
                  label="Fuel (actual)"
                  value={`−${fmtMoney(c.fuelActual)}`}
                />
              )}
              {c.otherExp > 0 && (
                <ResultRow
                  label="Other expenses"
                  value={`−${fmtMoney(c.otherExp)}`}
                />
              )}
              <div
                style={{
                  height: 1,
                  background: "var(--border)",
                  margin: "12px 0",
                }}
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
                  Net profit
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: 18,
                    color: c.net >= 0 ? "var(--accent)" : "#f87171",
                  }}
                >
                  {fmtMoney(c.net)}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Save */}
        <div style={{ padding: "0 16px" }}>
          <button
            onClick={handleSave}
            className="btn-primary"
            style={{ width: "100%", fontSize: 15, opacity: !gross ? 0.4 : 1 }}
          >
            {load ? "Save Changes" : "Save Load"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="input"
        style={{ fontSize: 14, padding: "10px 12px" }}
      />
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

function FormSection({ label }) {
  return (
    <div
      style={{
        padding: "16px 16px 8px",
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
