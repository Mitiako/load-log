export function calcLoad(load) {
  const totalMiles = load.miles + (load.dh || 0);
  let myGross, cut;

  if (load.payMode === "pct") {
    myGross = (load.gross * load.payVal) / 100;
    cut = load.gross - myGross;
  } else {
    myGross = (totalMiles * load.payVal) / 100;
    cut = load.gross - myGross;
  }

  const fuelActual = (load.diesel || []).reduce(
    (s, d) => s + ((Number(d.amount) || 0) - (Number(d.discount) || 0)),
    0,
  );
  const otherExp = (load.expenses || []).reduce(
    (s, e) => s + (Number(e.amount) || 0),
    0,
  );
  const net = myGross - fuelActual - otherExp;
  const ppm = totalMiles > 0 ? myGross / totalMiles : 0;

  return { cut, myGross, fuelActual, otherExp, net, ppm, totalMiles };
}

export function fmtDate(d) {
  if (!d) return "";
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dt = new Date(d + "T12:00:00");
  return (
    days[dt.getDay()] +
    ", " +
    dt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  );
}

export function fmtMoney(n) {
  return "$" + Math.round(n).toLocaleString();
}
