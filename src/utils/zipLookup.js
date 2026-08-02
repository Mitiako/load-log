// zipLookup.js
// Lookup City/State за US ZIP-кодом — без API-ключа, підтримує CORS напряму з браузера.
// Дозволяє водієві ввести тільки ZIP (найпростіше поле — просто переписати з документа),
// а City/State підтягуються самі, замість ручного вибору штату зі списку.

/**
 * @param {string} zip - 5-значний US ZIP код
 * @returns {Promise<{city: string, state: string} | null>} null якщо не знайдено
 */
export async function lookupZip(zip) {
  if (!/^\d{5}$/.test(zip)) return null;

  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!res.ok) return null;
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return null;
    return {
      city: place["place name"],
      state: place["state abbreviation"],
    };
  } catch (err) {
    console.error("ZIP lookup failed:", err);
    // Тихо ігноруємо — водій довводить City/State вручну, як і раніше.
    return null;
  }
}
