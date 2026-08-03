// api/route-miles.js
// Vercel Serverless Function — рахує орієнтовну кількість миль реального
// дорожнього маршруту через довільну кількість точок по порядку (не тільки
// origin→destination) через безкоштовний ланцюжок: Nominatim (геокодування
// City/State в координати) → OSRM (публічний демо-сервер маршрутизації,
// підтримує multi-waypoint маршрути нативно).
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

  // stops — впорядкований масив { city, state }, мінімум 2 точки
  // (перший pickup ... останній delivery, з усіма проміжними стопами між).
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
    const coordsList = await Promise.all(
      stops.map((s) => geocode(`${s.city}, ${s.state}, USA`)),
    );

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
