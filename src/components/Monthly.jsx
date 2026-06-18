import { useState } from "react";
import { calcLoad, fmtMoney } from "../data/calc";
import { getSettings, saveSettings } from "../data/store";

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
    <div className="flex flex-col h-screen bg-gray-950">
      <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 text-sm">
          ← Back
        </button>
        <h1 className="text-white text-base font-medium flex-1">
          Monthly summary
        </h1>
        <button
          onClick={onPrint}
          className="px-3 py-1 bg-gray-700 text-white text-sm rounded-lg"
        >
          Print / PDF
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 p-4">
          <StatCard label="Loads" value={loads.length} />
          <StatCard label="Total miles" value={totalMiles.toLocaleString()} />
          <StatCard label="Total gross" value={fmtMoney(totalGross)} />
          <StatCard
            label="Net from loads"
            value={fmtMoney(netFromLoads)}
            positive={netFromLoads >= 0}
          />
        </div>

        <div className="mx-4 mb-4 bg-gray-900 rounded-2xl p-4 space-y-2">
          <ResultRow
            label="Your gross (after company)"
            value={fmtMoney(totalMyGross)}
          />
          <ResultRow label="Fuel (actual paid)" value={fmtMoney(totalFuel)} />
          <ResultRow label="Other expenses" value={fmtMoney(totalOther)} />
          <div className="border-t border-gray-700 pt-2 flex justify-between text-sm font-medium">
            <span className="text-white">Net from loads</span>
            <span
              className={netFromLoads >= 0 ? "text-green-400" : "text-red-400"}
            >
              {fmtMoney(netFromLoads)}
            </span>
          </div>
        </div>

        <SectionLabel>Fixed monthly costs</SectionLabel>
        <div className="grid grid-cols-2 gap-3 px-4 pb-3">
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
        <div className="px-4 pb-4">
          <Field
            label="Other fixed $"
            value={other}
            onChange={(v) => handleFixed(setOther, "fixedOther", v)}
          />
        </div>

        <div className="mx-4 mb-8 bg-gray-900 rounded-2xl p-4 space-y-2">
          <ResultRow label="Total fixed costs" value={`-${fmtMoney(fixed)}`} />
          <div className="border-t border-gray-700 pt-2 flex justify-between text-base font-medium">
            <span className="text-white">Final net profit</span>
            <span className={finalNet >= 0 ? "text-green-400" : "text-red-400"}>
              {fmtMoney(finalNet)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, positive }) {
  return (
    <div className="bg-gray-900 rounded-xl p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div
        className={`text-xl font-medium ${positive === false ? "text-red-400" : positive ? "text-green-400" : "text-white"}`}
      >
        {value}
      </div>
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

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-gray-500"
      />
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="px-4 pt-2 pb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
      {children}
    </div>
  );
}
