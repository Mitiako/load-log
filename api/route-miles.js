// api/route-miles.js
// Vercel Serverless Function — рахує орієнтовну кількість миль між двома
// точками через безкоштовний ланцюжок: Nominatim (геокодування City/State
// в координати) → OSRM (публічний демо-сервер маршрутизації).
// Без API-ключа, без білінгу — обидва сервіси безкоштовні (OpenStreetMap-based).
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { originCity, originState, destinationCity, destinationState } =
    req.body;
  if (!originCity || !originState || !destinationCity || !destinationState) {
    return res.status(400).json({ error: "Missing city/state" });
  }

  try {
    const originCoords = await geocode(`${originCity}, ${originState}, USA`);
    const destCoords = await geocode(
      `${destinationCity}, ${destinationState}, USA`,
    );

    // Геокодування не гарантоване (нетипові назви міст, тимчасова
    // недоступність Nominatim) — тихо повертаємо null, водій довводить
    // милі вручну як і зараз, жодної помилки на екрані.
    if (!originCoords || !destCoords) {
      return res.status(200).json({ miles: null });
    }

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originCoords.lon},${originCoords.lat};${destCoords.lon},${destCoords.lat}?overview=false`;
    const routeRes = await fetch(osrmUrl);
    const routeData = await routeRes.json();

    if (routeData.code !== "Ok" || !routeData.routes?.[0]) {
      return res.status(200).json({ miles: null });
    }

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
