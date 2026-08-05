// api/_lib/getAppData.js
// Універсальний "widecast" data provider для AI Assistant — повертає
// ПОВНИЙ зріз даних водія (усі трипи/лоуди з усіма деталями + профіль,
// без фото) ОДНИМ викликом. Замінює окремі вузькі tools
// (getLoads/getFuelPurchases/getOtherExpenses) — модель сама фільтрує/
// групує/рахує в межах свого мислення, а не через новий tool на кожну
// прогалину, яку ми виявляємо по одній. uid завжди з перевіреного
// токена (verifyAuth) — ніколи з параметрів самого tool-виклику.
import { getFirestore } from "firebase-admin/firestore";
import { calcLoad } from "../../src/data/calc.js";

export async function getAppData(uid, todayDate) {
  const db = getFirestore();

  const [tripsSnap, profileSnap] = await Promise.all([
    db.collection("users").doc(uid).collection("trips").get(),
    db.collection("users").doc(uid).collection("profile").doc("data").get(),
  ]);

  const loads = [];
  tripsSnap.forEach((doc) => {
    const trip = doc.data();
    (trip.loads || []).forEach((load) => {
      const c = calcLoad(load);
      loads.push({
        tripId: doc.id,
        date: load.date,
        from: load.from,
        to: load.to,
        extraPickups: (load.extraPickups || [])
          .map((p) => p.city)
          .filter(Boolean),
        extraDeliveries: (load.extraDeliveries || [])
          .map((d) => d.city)
          .filter(Boolean),
        miles: load.miles,
        deadhead: load.dh || 0,
        weight: load.weight || 0,
        gross: load.gross,
        yourGross: Math.round(c.myGross),
        netProfit: Math.round(c.net),
        ratePerMile: Number(c.ppm.toFixed(2)),
        fuelPurchases: (load.diesel || []).map((d) => ({
          date: d.date || load.date,
          location: d.location || null,
          gallons: Number(d.gallons) || 0,
          amount: Number(d.amount) || 0,
          discount: Number(d.discount) || 0,
          netCost: (Number(d.amount) || 0) - (Number(d.discount) || 0),
        })),
        otherExpenses: (load.expenses || []).map((e) => ({
          name: e.name || null,
          amount: Number(e.amount) || 0,
        })),
      });
    });
  });

  // Профіль без фото — base64-рядки зображень безглузді для текстової
  // моделі (вона їх не "бачить" без окремого vision-виклику) і тільки
  // роздули б розмір даних, що передаються в кожен запит без користі.
  const profileData = profileSnap.exists ? profileSnap.data() : {};
  const profileWithoutPhotos = { ...profileData };
  delete profileWithoutPhotos.truckPhoto;
  delete profileWithoutPhotos.trailerPhoto;
  delete profileWithoutPhotos.cdlPhoto;
  delete profileWithoutPhotos.medPhoto;

  const summary = computeSummary(loads, todayDate);

  return { loads, profile: profileWithoutPhotos, summary };
}

// Готові, порахован НАШИМ кодом (не моделлю) підсумки за типові
// періоди — модель читає готове число замість того щоб сумувати сирі
// лоуди "в умі", де вона ненадійна (те саме, що ми вже виправили для
// ваги-з-таблиці в RateCon-сканері). Сирі loads лишаються доступними
// для нестандартних запитів, яких summary не покриває.
function computeSummary(loads, todayDate) {
  const anchor = todayDate ? new Date(`${todayDate}T00:00:00`) : new Date();

  function daysAgoDateString(n) {
    const d = new Date(anchor);
    d.setDate(d.getDate() - n);
    return d.toISOString().split("T")[0];
  }

  function rollup(sinceDate) {
    const subset = sinceDate
      ? loads.filter((l) => l.date && l.date >= sinceDate)
      : loads;
    const totalGross = subset.reduce((s, l) => s + (l.gross || 0), 0);
    const totalYourGross = subset.reduce((s, l) => s + (l.yourGross || 0), 0);
    const totalNetProfit = subset.reduce((s, l) => s + (l.netProfit || 0), 0);
    const totalMiles = subset.reduce(
      (s, l) => s + (l.miles || 0) + (l.deadhead || 0),
      0,
    );
    const avgRatePerMile =
      totalMiles > 0 ? Number((totalYourGross / totalMiles).toFixed(2)) : 0;
    return {
      loadCount: subset.length,
      totalGross: Math.round(totalGross),
      totalYourGross: Math.round(totalYourGross),
      totalNetProfit: Math.round(totalNetProfit),
      totalMiles,
      avgRatePerMile,
    };
  }

  return {
    last7Days: rollup(daysAgoDateString(7)),
    last30Days: rollup(daysAgoDateString(30)),
    last90Days: rollup(daysAgoDateString(90)),
    allTime: rollup(null),
  };
}
