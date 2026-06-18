import { useState } from "react";
import { calcLoad, fmtMoney } from "../data/calc";
import { getSettings, saveSettings } from "../data/store";

export default function LoadForm({ load, onSave, onBack }) {
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
  const [weight, setWeight] = useState(load?.weight || "");
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
    const updated = [...diesel];
    updated[i] = { ...updated[i], [field]: val };
    setDiesel(updated);
  }

  function removeDiesel(i) {
    setDiesel(diesel.filter((_, idx) => idx !== i));
  }

  function addExpense() {
    setExpenses([...expenses, { name: "", amount: "" }]);
  }

  function updateExpense(i, field, val) {
    const updated = [...expenses];
    updated[i] = { ...updated[i], [field]: val };
    setExpenses(updated);
  }

  function removeExpense(i) {
    setExpenses(expenses.filter((_, idx) => idx !== i));
  }

  function handleSave() {
    if (!gross) return;
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
    <div className="flex flex-col h-screen bg-gray-950">
      <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 text-sm">
          ← Back
        </button>
        <h1 className="text-white text-base font-medium">
          {load ? "Edit load" : "New load"}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-safe">
        <SectionLabel>Route</SectionLabel>
        <div className="grid grid-cols-2 gap-3 px-4 pb-3">
          <Field
            label="From"
            value={from}
            onChange={setFrom}
            placeholder="Chicago, IL"
          />
          <Field
            label="To"
            value={to}
            onChange={setTo}
            placeholder="Dallas, TX"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 px-4 pb-3">
          <Field
            label="Loaded miles"
            value={miles}
            onChange={setMiles}
            type="number"
            placeholder="1100"
          />
          <Field label="Date" value={date} onChange={setDate} type="date" />
        </div>
        <label className="flex items-center gap-2 px-4 pb-3 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showDh}
            onChange={(e) => setShowDh(e.target.checked)}
            className="w-auto"
          />
          Add deadhead miles
        </label>
        {showDh && (
          <div className="px-4 pb-3">
            <Field
              label="Deadhead miles"
              value={dh}
              onChange={setDh}
              type="number"
              placeholder="50"
            />
          </div>
        )}

        <div className="h-px bg-gray-800 my-1" />
        <SectionLabel>Pay</SectionLabel>
        <div className="grid grid-cols-2 mx-4 mb-3 border border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => handlePayMode("pct")}
            className={`py-2 text-sm ${payMode === "pct" ? "bg-blue-900 text-blue-300 font-medium" : "text-gray-500"}`}
          >
            % of gross
          </button>
          <button
            onClick={() => handlePayMode("cpm")}
            className={`py-2 text-sm ${payMode === "cpm" ? "bg-blue-900 text-blue-300 font-medium" : "text-gray-500"}`}
          >
            Cents per mile
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 px-4 pb-1">
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
        <p className="px-4 pb-3 text-xs text-gray-500">
          {payMode === "pct"
            ? "Owner-operator: ~85–87%. Hired driver: ~28–32%."
            : "Enter cents per mile as a whole number (e.g. 90 = $0.90/mile)."}
        </p>
        <div className="px-4 pb-3">
          <Field
            label="Weight (lbs)"
            value={weight}
            onChange={setWeight}
            type="number"
            placeholder="15000"
          />
        </div>

        <div className="h-px bg-gray-800 my-1" />
        <SectionLabel>Diesel</SectionLabel>
        {diesel.map((d, i) => (
          <div key={i} className="px-4 pb-3 border-b border-gray-800 mb-2">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <SmallField
                label="Location"
                value={d.location}
                onChange={(v) => updateDiesel(i, "location", v)}
                placeholder="Oklahoma City, OK"
                type="text"
              />
              <SmallField
                label="Date"
                value={d.date}
                onChange={(v) => updateDiesel(i, "date", v)}
                placeholder=""
                type="date"
              />
            </div>
            <div className="grid grid-cols-3 gap-2 items-end">
              <SmallField
                label="Gallons"
                value={d.gallons}
                onChange={(v) => updateDiesel(i, "gallons", v)}
                placeholder="219"
              />
              <SmallField
                label="Amount $"
                value={d.amount}
                onChange={(v) => updateDiesel(i, "amount", v)}
                placeholder="840"
              />
              <div className="flex gap-1 items-end">
                <div className="flex-1">
                  <SmallField
                    label="Discount $"
                    value={d.discount}
                    onChange={(v) => updateDiesel(i, "discount", v)}
                    placeholder="226"
                  />
                </div>
                <button
                  onClick={() => removeDiesel(i)}
                  className="h-9 w-8 border border-gray-700 rounded-lg text-gray-500 text-xs mb-0"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
        <button
          onClick={addDiesel}
          className="mx-4 mb-3 w-[calc(100%-32px)] py-2 border border-dashed border-gray-700 rounded-xl text-gray-500 text-sm"
        >
          + Add fuel stop
        </button>

        <div className="h-px bg-gray-800 my-1" />
        <SectionLabel>Other expenses</SectionLabel>
        {expenses.map((e, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 px-4 pb-2 items-end">
            <SmallField
              label="Description"
              value={e.name}
              onChange={(v) => updateExpense(i, "name", v)}
              placeholder="Lumper, tolls..."
              type="text"
            />
            <div className="flex gap-1 items-end">
              <div className="flex-1">
                <SmallField
                  label="Amount $"
                  value={e.amount}
                  onChange={(v) => updateExpense(i, "amount", v)}
                  placeholder="0"
                />
              </div>
              <button
                onClick={() => removeExpense(i)}
                className="h-9 w-8 border border-gray-700 rounded-lg text-gray-500 text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={addExpense}
          className="mx-4 mb-3 w-[calc(100%-32px)] py-2 border border-dashed border-gray-700 rounded-xl text-gray-500 text-sm"
        >
          + Add expense
        </button>

        {c && (
          <>
            <div className="h-px bg-gray-800 my-1" />
            <SectionLabel>Result</SectionLabel>
            <div className="mx-4 my-3 bg-gray-900 rounded-2xl p-4 space-y-2">
              <ResultRow label="Gross" value={fmtMoney(currentLoad.gross)} />
              <ResultRow label="Company share" value={`-${fmtMoney(c.cut)}`} />
              <ResultRow label="Your gross" value={fmtMoney(c.myGross)} />
              {c.fuelActual > 0 && (
                <ResultRow
                  label="Fuel (actual)"
                  value={`-${fmtMoney(c.fuelActual)}`}
                />
              )}
              {c.otherExp > 0 && (
                <ResultRow
                  label="Other expenses"
                  value={`-${fmtMoney(c.otherExp)}`}
                />
              )}
              <div className="border-t border-gray-700 pt-2 flex justify-between text-base font-medium">
                <span className="text-white">Net profit</span>
                <span
                  className={c.net >= 0 ? "text-green-400" : "text-red-400"}
                >
                  {fmtMoney(c.net)}
                </span>
              </div>
            </div>
          </>
        )}

        <button
          onClick={handleSave}
          className="mx-4 mb-4 w-[calc(100%-32px)] py-3 bg-gray-900 border border-gray-700 rounded-2xl text-white font-medium"
        >
          Save load
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-gray-500"
      />
    </div>
  );
}

function SmallField({ label, value, onChange, type = "number", placeholder }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-white text-sm outline-none focus:border-gray-500"
      />
    </div>
  );
}

function ResultRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="px-4 pt-3 pb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
      {children}
    </div>
  );
}
