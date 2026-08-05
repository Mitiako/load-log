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

export async function getAppData(uid) {
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

  const profileData = profileSnap.exists ? profileSnap.data() : {};
  const profileWithoutPhotos = { ...profileData };
  delete profileWithoutPhotos.truckPhoto;
  delete profileWithoutPhotos.trailerPhoto;
  delete profileWithoutPhotos.cdlPhoto;
  delete profileWithoutPhotos.medPhoto;
}
