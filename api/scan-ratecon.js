// api/scan-ratecon.js
// Vercel Serverless Function — витягує дані з RateCon через streaming-виклик
// OpenAI: модель пише міркування вголос перед JSON, і ми пересилаємо ці
// слова водієві в реальному часі, поки вони генеруються — так замість
// "чорної скриньки на 5-7 секунд" водій буквально бачить AI, що аналізує
// документ рядок за рядком.
import { verifyAuth } from "./_lib/verifyAuth.js";

const MARKER = "===JSON===";
const RESULT_TAG = "@@RESULT@@";
const ERROR_TAG = "@@ERROR@@";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await verifyAuth(req);
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { images } = req.body;
  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: "No images provided" });
  }
  if (images.length > 4) {
    return res.status(400).json({ error: "Too many pages (max 4)" });
  }
  for (const img of images) {
    if (typeof img !== "string" || !img.startsWith("data:image/")) {
      return res.status(400).json({ error: "Invalid image format" });
    }
    if (img.length > 10_000_000) {
      return res.status(413).json({ error: "Image too large" });
    }
  }

  const systemPrompt = `You are a Rate Confirmation (RateCon) document scanner for a trucking app. You will be shown ALL pages of the document as separate images, in order.

First, write your reasoning as SHORT STEP LINES — one step per line, like a checklist, NOT full sentences or paragraphs. Each line is a brief phrase describing what you just figured out. Example style:
Reading page 1 of 2...
Found Stop 1: PICKUP — Toledo, OH
Found Stop 2: DELIVERY — Columbus, OH
Locating total rate...
Found rate: $2,950.00
Checking pickup weight...
Weight: 12,035 lbs total
Write 4-8 such short lines covering: how many pickup stops and delivery stops you found and their cities (they may be labeled "Stop 1/2/3", "PU#1/PU#2", "Shipper Pickup"/"Consignee Delivery", or similar); where the total pay/rate is printed and its value; and the weight information you found in pickup sections (see WEIGHT RULES below). Then on a new blank line write exactly "===JSON===" followed by ONLY a valid JSON object, no markdown, no other text after it.

If this is NOT a rate confirmation / load tender document, the JSON must be exactly {"notARateCon": true}.

Otherwise the JSON must have these fields:
- originCity, originState (2-letter), originAddress, originZip — from the FIRST pickup stop. Use null for any field not shown.
- shipperName — the company/facility name at the FIRST pickup (e.g. "Stuart Egg Farm", "Bluegrass Steel Mill"). This is a business name, NEVER a person's name. If no business name is printed but a person's name is, use the person's name as a fallback. Null if truly nothing is shown.
- shipperContact — a PHONE NUMBER for the FIRST pickup, if one is printed anywhere for that stop. NEVER put a person's name here (e.g. if the document shows "Contact: Tyler" and separately "Phone: 515-523-7002", shipperContact must be the phone number, not "Tyler"). Null only if no phone number at all is printed for this stop.
- destinationCity, destinationState (2-letter), destinationAddress, destinationZip — from the LAST delivery stop. Use null for any field not shown.
- receiverName — same rules as shipperName above, but for the LAST delivery stop.
- receiverContact — same rules as shipperContact above (always a phone number, never a person's name), but for the LAST delivery stop.
- additionalPickups — array of every pickup stop AFTER the first, in route order. Each: { city (combined "City, ST" string), address, zip, contactName, contactPhone }. Empty array if only one pickup.
- additionalDeliveries — array of every delivery stop BEFORE the last, in route order. Each: same shape as above. Empty array if only one delivery.
- rate — total dollar amount the broker pays the carrier (number). Look for labels like "Total Carrier Pay", "Net Freight Charges", "Carrier Fees Total", "Total Cost", "Total Due Carrier", "Total Rate". If the document lists a Rate Breakdown with a highlighted/bolded final total row, use that final total — do NOT skip it just because there are ALSO separate conditional "if applicable" accessorial charges (detention, lumper, layover) or deduction lines (fuel advance) nearby; those are separate from the base rate and never prevent you from reporting the main final total. If you truly cannot find any total pay figure anywhere in the document, use null — but check carefully first, this field should be null only rarely.

STOP TYPE CLASSIFICATION — read the label word on EACH stop individually, never assume by position or stop number:
- Words meaning PICKUP: "Pickup", "PU", "PUP", "P/U", "Pick", "Shipper", "Origin", "Ship From", "Supplier", "Vendor", "Loading Point", "Loading Location", "Collection Point", "Facility", "Warehouse" (when it's the FIRST stop context), "POL", "Pickup Location", "Pickup Address".
- Words meaning DELIVERY: "Delivery", "Drop", "Drop-off", "Consignee", "SO", "DEL", "DLY", "DLV", "Destination", "Final Destination", "Ship To", "Deliver To", "Receiver", "Recipient", "Unloading Point", "POD", "Buyer", "Customer", "Receiving Dock", "R-Dock".
- A stop labeled "Consignee Delivery (Stop 2)" is a DELIVERY even though it's stop #2 — the label WORD decides the type, the stop NUMBER never does.
- Before writing the JSON, in your reasoning sentences, list every stop as "Stop N: [PICKUP or DELIVERY] — [city]" using its actual label word, then use that list to fill originCity/destinationCity/additionalPickups/additionalDeliveries correctly.

STOP TYPE FOR AMBIGUOUS LABELS: if a stop is labeled only "Stop N" with no other pickup/delivery keyword nearby, infer its type from context: compare it to the document's own pickup label (e.g. if the document uses "PICK" or "PU" for the pickup stop and then separately numbers "STOP 1", "STOP 2", "STOP 3" for the rest, those "STOP" entries are deliveries — a document only numbers what comes after the pickup). Retail/warehouse/distribution-center names (e.g. "WAL MART STORES", "WAL MART DC") appearing in a "STOP" block are further confirmation it's a delivery, not a pickup.

FIELD SEPARATION: the "address" field must contain ONLY the street address (e.g. "1234 Main St"). Never include the company/consignee/shipper name in the address field — that always goes in the name field instead, even if they're printed right next to each other on the document.

COMPANY NAME WITHOUT AN EXPLICIT LABEL: some documents print the company or facility name as a plain line of text right at the top of a stop block, with no "Shipper:"/"Consignee:"/"Name:" label in front of it — for example, directly under a "STOP 1" or "PICK 1" header, the very next line might simply read "WAL MART STORES 6084" with no label at all. Treat that unlabeled top line as the company name for that stop — do not require an explicit label word to recognize it. If that line is clearly just an internal facility code with no readable company name (e.g. "418-TLC"), use null instead of guessing.

RUN-TOGETHER ADDRESS TEXT: some documents print an address with no spaces between words due to a formatting artifact (e.g. "1200IndustrialParkwaySteC" or "77WestcliffeAveDock9"). When you see clearly-run-together address text like this, insert spaces at the natural word/number boundaries before returning it (e.g. "1200 Industrial Parkway Ste C", "77 Westcliffe Ave Dock 9"). Do this for street addresses only, not for company names or reference numbers.

CONTACT NAME RULE (for additionalPickups/additionalDeliveries contactName/contactPhone fields): contactName is for a PERSON's name or a role/department (e.g. "Warehouse Desk", "Dock Supervisor", "John Smith"). contactPhone is ALWAYS a phone number, never an email or a person's name. If the only contact information printed for a stop is an email address and/or phone number with no named person or role, set contactName to null and put the phone number (not the email) in contactPhone. NEVER put an email address into a name field, and NEVER put a person's name into a phone field.

WEIGHT RULES — read carefully, this is commonly mis-extracted:
- Only look for weight in sections belonging to PICKUP stops (the first pickup AND any additional pickups). Ignore weight tables on delivery/consignee stops — those often repeat a subset of the SAME cargo already counted at pickup, and adding them again would double-count.
- Collect weight readings into "weightComponents": an array covering EVERY pickup stop's weight information, one entry per weight reading you find. Each entry: { type: "total" or "itemized", value: number or null, items: array of numbers or null }.
  - If a pickup shows ONE printed total (e.g. "Weight: 41690.0" or "Total Weight: 6,300 lbs"), add one entry: { type: "total", value: <that number>, items: null }.
  - If a pickup's weight is spread across a line-item table with no single total (e.g. multiple "Pallet 1 — 1,240 lbs" rows), add one entry: { type: "itemized", value: null, items: [<every number in that table>] }.
  - If there are TWO pickup stops and each has its own weight reading, weightComponents will have TWO entries — one for each pickup. Do not merge them into one.
  - Do NOT add up the numbers yourself — just list every component you find, the app will sum them.
- If no weight information is found anywhere in the pickup section(s), weightComponents should be an empty array.

ANTI-GUESSING RULE — this is critical, read carefully: Addresses, city/state, ZIP, contact names, and contact phones for origin/destination/additional stops must ONLY come from sections explicitly labeled as a pickup, delivery, stop, shipper, or consignee location. NEVER use the broker/company's own letterhead address, header contact block, or "billing contact" info at the top of the document as a pickup or delivery address — even though it looks like a valid, real address, it is NOT the shipper or receiver location. If you cannot find a genuine pickup or delivery address anywhere in the document, set that field to null. Returning null for a field you couldn't find is always correct; substituting the nearest available address-like text is always wrong, even if it seems like a reasonable guess.

Never guess or invent values anywhere in this task — only extract what is actually printed on the document, in the correct labeled section.`;

  let openaiResponse;
  try {
    openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract the rate confirmation data. This document has ${images.length} page(s), shown in order.`,
              },
              ...images.map((img) => ({
                type: "image_url",
                image_url: { url: img },
              })),
            ],
          },
        ],
        max_tokens: 1600,
        stream: true,
      }),
    });
  } catch (err) {
    console.error("OpenAI fetch failed:", err);
    return res.status(502).json({ error: "AI service error" });
  }

  if (!openaiResponse.ok || !openaiResponse.body) {
    const errBody = await openaiResponse.text().catch(() => "");
    console.error("OpenAI API error:", openaiResponse.status, errBody);
    return res.status(502).json({ error: "AI service error" });
  }

  // Далі відповідаємо клієнту потоково (plain text chunked response) —
  // не JSON одним шматком. Протокол простий, наш власний:
  //   - усе, що йде до RESULT_TAG/ERROR_TAG — "міркування вголос" моделі,
  //     показуємо водієві живцем по мірі надходження;
  //   - після RESULT_TAG — фінальний JSON з готовими даними (вага вже
  //     підсумована на сервері, а не моделлю).
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
  });

  const reader = openaiResponse.body.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = "";
  let fullContent = "";
  let sentLength = 0;
  let markerFound = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split("\n");
      sseBuffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === "[DONE]") continue;

        let chunk;
        try {
          chunk = JSON.parse(dataStr);
        } catch {
          continue;
        }
        const delta = chunk.choices?.[0]?.delta?.content;
        if (!delta) continue;

        fullContent += delta;

        if (!markerFound) {
          const idx = fullContent.indexOf(MARKER);
          if (idx !== -1) {
            // Маркер щойно зʼявився в накопиченому тексті — форвардимо
            // водієві все ДО маркера (це й є фінальний шматок міркувань),
            // і назавжди перестаємо пересилати що-небудь далі (то вже JSON).
            const toSend = fullContent.slice(sentLength, idx);
            if (toSend) res.write(toSend);
            sentLength = fullContent.length;
            markerFound = true;
          } else {
            // Тримаємо останні (MARKER.length - 1) символів непересланими —
            // раптом вони виявляться ПОЧАТКОМ маркера в наступному шматку.
            // Без цього маркер міг би "просочитись" водієві частинами.
            const safeBoundary = Math.max(
              sentLength,
              fullContent.length - (MARKER.length - 1),
            );
            if (safeBoundary > sentLength) {
              res.write(fullContent.slice(sentLength, safeBoundary));
              sentLength = safeBoundary;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Stream reading error:", err);
    res.write(`\n${ERROR_TAG}\nStream interrupted`);
    return res.end();
  }

  const markerIndex = fullContent.indexOf(MARKER);
  if (markerIndex === -1) {
    console.error("No JSON marker in response:", fullContent);
    res.write(`\n${ERROR_TAG}\nAI response format error`);
    return res.end();
  }

  let jsonText = fullContent.slice(markerIndex + MARKER.length).trim();
  jsonText = jsonText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    console.error("JSON parse error:", err, jsonText);
    res.write(`\n${ERROR_TAG}\nAI response format error`);
    return res.end();
  }

  // Вагу рахуємо тут, у нашому коді — модель повертає ОКРЕМІ компоненти
  // ваги (може бути кілька, по одному на кожен pickup-стоп) — ми їх усі
  // підсумовуємо. Так надійніше за арифметику моделі "в умі".
  let weight = null;
  if (
    Array.isArray(parsed.weightComponents) &&
    parsed.weightComponents.length > 0
  ) {
    let total = 0;
    for (const comp of parsed.weightComponents) {
      if (comp.type === "total" && typeof comp.value === "number") {
        total += comp.value;
      } else if (comp.type === "itemized" && Array.isArray(comp.items)) {
        total += comp.items.reduce((sum, n) => sum + (Number(n) || 0), 0);
      }
    }
    weight = total;
  }

  res.write(`\n${RESULT_TAG}\n${JSON.stringify({ ...parsed, weight })}`);
  res.end();
}
