import { calcLoad, fmtDate, fmtMoney } from "../data/calc";

export default function LoadDetail({ load, onBack, onEdit }) {
  const c = calcLoad(load);

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 text-sm">
          ← Back
        </button>
        <h1 className="text-white text-base font-medium flex-1">
          {load.from} → {load.to}
        </h1>
        <button onClick={onEdit} className="text-gray-400 text-sm">
          Edit
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Row label="Date" value={fmtDate(load.date)} />
        <Row label="Loaded miles" value={`${load.miles.toLocaleString()} mi`} />
        {load.dh > 0 && <Row label="Deadhead" value={`${load.dh} mi`} />}
        {load.weight > 0 && (
          <Row label="Weight" value={`${load.weight.toLocaleString()} lbs`} />
        )}

        <Section>Pay</Section>
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

        {(load.diesel?.length > 0 || load.expenses?.length > 0) && (
          <Section>Expenses</Section>
        )}

        {load.diesel?.map((d, i) => (
          <Row
            key={i}
            label={`Fuel stop ${i + 1} (${d.gallons} gal)`}
            value={`$${d.amount} − $${d.discount} = $${d.amount - d.discount}`}
          />
        ))}

        {load.expenses?.map((e, i) => (
          <Row key={i} label={e.name} value={fmtMoney(e.amount)} />
        ))}

        {c.fuelActual > 0 && (
          <Row label="Total fuel (actual)" value={fmtMoney(c.fuelActual)} />
        )}
        <Row
          label="Total expenses"
          value={fmtMoney(c.fuelActual + c.otherExp)}
        />

        <div className="mx-4 my-4 bg-gray-900 rounded-2xl p-4">
          <div className="flex justify-between text-base font-medium">
            <span className="text-white">Net profit</span>
            <span className={c.net >= 0 ? "text-green-400" : "text-red-400"}>
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
    <div className="flex justify-between px-4 py-2 border-b border-gray-800 text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}

function Section({ children }) {
  return (
    <div className="px-4 pt-4 pb-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
      {children}
    </div>
  );
}
