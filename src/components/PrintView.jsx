import { calcLoad, fmtDate, fmtMoney } from "../data/calc";

export default function PrintView({ loads, onClose }) {
  function handlePrint() {
    window.print();
  }

  const pages = [];
  for (let i = 0; i < loads.length; i += 4) {
    pages.push(loads.slice(i, i + 4));
  }

  return (
    <div className="min-h-screen bg-white">
      <style>{`
  @media print {
    .page-break { page-break-before: always !important; break-before: page !important; }
  }
`}</style>
      <div className="print:hidden flex gap-3 p-4 border-b border-gray-200">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium"
        >
          Save as PDF / Print
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm"
        >
          ← Back
        </button>
      </div>

      <h1 className="text-center text-xl font-bold text-gray-800 mb-6 print:text-lg print:mb-4 p-6 print:p-2 max-w-3xl mx-auto">
        Load Log — Monthly Report
      </h1>

      {pages.map((pageLoads, pageIdx) => (
        <div key={pageIdx}>
          <div
            className={`p-6 print:p-2 print:text-xs max-w-3xl mx-auto break-inside-avoid ${pageIdx > 0 ? "page-break" : ""}`}
          >
            <div className="grid grid-cols-2 gap-4 print:gap-3">
              {pageLoads.map((load, i) => {
                const c = calcLoad(load);
                return (
                  <div
                    key={i}
                    className="border border-gray-300 rounded-lg p-2 text-xs break-inside-avoid print:p-1.5"
                  >
                    <div className="font-bold text-gray-900 text-sm mb-2 pb-1 border-b border-gray-200">
                      {load.from} → {load.to}
                    </div>

                    <Row label="Date" value={fmtDate(load.date)} />
                    <Row
                      label="Loaded miles"
                      value={`${load.miles.toLocaleString()} mi`}
                    />
                    {load.dh > 0 && (
                      <Row label="Deadhead" value={`${load.dh} mi`} />
                    )}
                    {load.weight > 0 && (
                      <Row
                        label="Weight"
                        value={`${load.weight.toLocaleString()} lbs`}
                      />
                    )}

                    <div className="mt-2 mb-1 text-gray-400 uppercase text-xs tracking-wider">
                      Pay
                    </div>
                    <Row label="Gross rate" value={fmtMoney(load.gross)} />
                    <Row
                      label="Your share"
                      value={
                        load.payMode === "pct"
                          ? `${load.payVal}%`
                          : `${load.payVal}¢/mi`
                      }
                    />
                    <Row label="Your gross" value={fmtMoney(c.myGross)} />

                    {(load.diesel?.length > 0 || load.expenses?.length > 0) && (
                      <div className="mt-2 mb-1 text-gray-400 uppercase text-xs tracking-wider">
                        Expenses
                      </div>
                    )}

                    {load.diesel?.map((d, j) => (
                      <Row
                        key={j}
                        label={`Fuel #${j + 1}`}
                        value={`$${d.amount} − $${d.discount} = $${d.amount - d.discount}`}
                      />
                    ))}

                    {load.expenses?.map((e, j) => (
                      <Row key={j} label={e.name} value={fmtMoney(e.amount)} />
                    ))}

                    <Row
                      label="Total expenses"
                      value={fmtMoney(c.fuelActual + c.otherExp)}
                    />

                    <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between font-bold text-sm">
                      <span className="text-gray-900">Net profit</span>
                      <span
                        className={
                          c.net >= 0 ? "text-green-600" : "text-red-600"
                        }
                      >
                        {fmtMoney(c.net)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

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

  return (
    <div className="mt-8 print:mt-6">
      <h2 className="text-center text-base font-bold text-gray-800 mb-3">
        Summary for This Page
      </h2>
      <div className="flex justify-center">
        <table className="border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <Th>Loads</Th>
              <Th>Miles</Th>
              <Th>Gross</Th>
              <Th>Fuel</Th>
              <Th>Gallons</Th>
              <Th>Discount</Th>
              <Th>Net Profit</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>{loads.length}</Td>
              <Td>{totalMiles.toLocaleString()}</Td>
              <Td>{fmtMoney(totalGross)}</Td>
              <Td>{fmtMoney(totalFuel)}</Td>
              <Td>{totalGallons}</Td>
              <Td>{fmtMoney(totalDiscount)}</Td>
              <Td positive={totalNet >= 0}>{fmtMoney(totalNet)}</Td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-0.5 text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">
      {children}
    </th>
  );
}

function Td({ children, positive }) {
  return (
    <td
      className={`border border-gray-300 px-3 py-2 text-center ${
        positive === true
          ? "text-green-600 font-bold"
          : positive === false
            ? "text-red-600 font-bold"
            : "text-gray-900"
      }`}
    >
      {children}
    </td>
  );
}
