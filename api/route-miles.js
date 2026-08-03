// api/route-miles.js
// Vercel Serverless Function — рахує орієнтовну кількість миль реального
// дорожнього маршруту через довільну кількість точок по порядку (не тільки
// origin→destination) через безкоштовний ланцюжок: Nominatim (геокодування
// в координати) → OSRM (публічний демо-сервер маршрутизації, підтримує
// multi-waypoint маршрути нативно).
// Без API-ключа, без білінгу — обидва сервіси безкоштовні (OpenStreetMap-based).
import { verifyAuth } from "./_lib/verifyAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await verifyAuth(req);
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // stops — впорядкований масив { city, state, address?, zip? }, мінімум
  // 2 точки. address/zip опціональні, але коли є — дають набагато точніше
  // геокодування (конкретна точка замість центру міста), суттєво звужуючи
  // розбіжність з реальною відстанню на мульти-стоп маршрутах.
  const { stops } = req.body;
  if (!Array.isArray(stops) || stops.length < 2) {
    return res.status(400).json({ error: "Need at least 2 stops" });
  }
  for (const stop of stops) {
    if (!stop?.city || !stop?.state) {
      return res.status(400).json({ error: "Each stop needs city and state" });
    }
  }

  try {
    // Геокодуємо всі точки паралельно — швидше за послідовні запити.
    const coordsList = await Promise.all(stops.map(geocodeStop));

    // Якщо хоч одна точка не геокодувалась — тихо повертаємо null,
    // водій довводить милі вручну, жодної помилки на екрані.
    if (coordsList.some((c) => !c)) {
      return res.status(200).json({ miles: null });
    }

    const coordsPath = coordsList.map((c) => `${c.lon},${c.lat}`).join(";");

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsPath}?overview=false`;
    const routeRes = await fetch(osrmUrl);
    const routeData = await routeRes.json();

    if (routeData.code !== "Ok" || !routeData.routes?.[0]) {
      return res.status(200).json({ miles: null });
    }

    // OSRM сам повертає ЗАГАЛЬНУ відстань всього маршруту через усі
    // waypoints по порядку — не треба нічого підсумовувати вручну.
    const meters = routeData.routes[0].distance;
    const miles = Math.round(meters / 1609.34);
    return res.status(200).json({ miles });
  } catch (err) {
    console.error("Route miles error:", err);
    return res.status(200).json({ miles: null });
  }
}

// Геокодує одну зупинку — спершу пробує повну адресу (найточніше),
// і якщо Nominatim її не знайшов (нетипове форматування, неповна адреса),
// відкочується на просто City+State (центр міста, менш точно, але краще
// ніж узагалі нічого).
async function geocodeStop(stop) {
  if (stop.address) {
    const fullQuery = stop.zip
      ? `${stop.address}, ${stop.city}, ${stop.state} ${stop.zip}, USA`
      : `${stop.address}, ${stop.city}, ${stop.state}, USA`;
    const preciseCoords = await geocode(fullQuery);
    if (preciseCoords) return preciseCoords;
  }
  return geocode(`${stop.city}, ${stop.state}, USA`);
}

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      // Nominatim вимагає ідентифікований User-Agent у запиті —
      // інакше може блокувати або обмежувати відповіді.
      "User-Agent": "LoadLogApp/1.0 (trucking profit tracker)",
    },
  });
  const data = await response.json();
  if (!data?.[0]) return null;
  return { lat: data[0].lat, lon: data[0].lon };
}
