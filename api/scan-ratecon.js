// api/scan-ratecon.js
// Vercel Serverless Function — витягує дані з RateCon (Rate Confirmation),
// підтримує кілька сторінок (images: масив base64 data URL) і дозволяє
// моделі коротко "подумати" перед фінальним JSON — це суттєво покращує
// точність на багатосторінкових/табличних документах порівняно з жорстким
// "тільки JSON, без жодного тексту".
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

  const { images } = req.body;
  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: "No images provided" });
  }
  if (images.length > 6) {
    return res.status(400).json({ error: "Too many pages (max 6)" });
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

First, in 3-6 short sentences, think through: how many pickup stops and how many delivery stops are on this document (they may be labeled "Stop 1/2/3", "PU#1/PU#2", "Shipper Pickup"/"Consignee Delivery", or similar); where the total pay/rate is printed; and every weight reading you can find in pickup sections (see WEIGHT RULES below). Then on a new line write exactly "===JSON===" followed by ONLY a valid JSON object, no markdown, no other text after it.

If this is NOT a rate confirmation / load tender document, the JSON must be exactly {"notARateCon": true}.

Otherwise the JSON must have these fields:
- originCity, originState (2-letter), originAddress, originZip, shipperName, shipperContact — all from the FIRST pickup stop. Use null for any field not shown.
- destinationCity, destinationState (2-letter), destinationAddress, destinationZip, receiverName, receiverContact — all from the LAST delivery stop. Use null for any field not shown.
- additionalPickups — array of every pickup stop AFTER the first, in route order. Each: { city (combined "City, ST"), address, zip, contactName, contactPhone }. Empty array if only one pickup.
- additionalDeliveries — array of every delivery stop BEFORE the last, in route order. Each: same shape as above. Empty array if only one delivery.
- rate — total dollar amount the broker pays the carrier (number). Look for labels like "Total Carrier Pay", "Net Freight Charges", "Carrier Fees Total", "Total Cost". If the document lists a Rate Breakdown with a highlighted/bolded final total row (e.g. Linehaul + Fuel Surcharge = Total Carrier Pay), use that final total — do NOT skip it just because there are ALSO separate conditional "if applicable" accessorial charges (detention, lumper, layover) nearby; those are optional and separate from the base rate, they never prevent you from reporting the main total. If you truly cannot find any total pay figure anywhere in the document, use null — but check carefully first, this field should be null only rarely.

STOP TYPE CLASSIFICATION — read the label word on EACH stop individually, never assume by position or stop number:
- Words meaning PICKUP: "Pickup", "PU", "PUP", "P/U", "Shipper", "Origin", "Ship From", "Supplier", "Vendor", "Loading Point", "Loading Location", "Collection Point", "Facility", "Warehouse" (when it's the FIRST stop context), "POL", "Pickup Location", "Pickup Address".
- Words meaning DELIVERY: "Delivery", "Drop", "Drop-off", "Consignee", "SO", "DEL", "DLY", "DLV", "Destination", "Final Destination", "Ship To", "Deliver To", "Receiver", "Recipient", "Unloading Point", "POD", "Buyer", "Customer", "Receiving Dock", "R-Dock".
- A stop labeled "Consignee Delivery (Stop 2)" is a DELIVERY even though it's stop #2 — the label WORD decides the type, the stop NUMBER never does.
- Before writing the JSON, in your reasoning sentences, list every stop as "Stop N: [PICKUP or DELIVERY] — [city]" using its actual label word, then use that list to fill originCity/destinationCity/additionalPickups/additionalDeliveries correctly.

FIELD SEPARATION: the "address" field must contain ONLY the street address (e.g. "1234 Main St"). Never include the company/consignee/shipper name in the address field — that always goes in contactName instead, even if they're printed right next to each other on the document.

RUN-TOGETHER ADDRESS TEXT: some documents print an address with no spaces between words due to a formatting artifact (e.g. "1200IndustrialParkwaySteC" or "77WestcliffeAveDock9"). When you see clearly-run-together address text like this, insert spaces at the natural word/number boundaries before returning it (e.g. "1200 Industrial Parkway Ste C", "77 Westcliffe Ave Dock 9"). Do this for street addresses only, not for company names or reference numbers.

CONTACT NAME RULE: contactName and shipperContact/receiverContact-style fields are for a PERSON's name or a role/department (e.g. "Warehouse Desk", "Dock Supervisor", "John Smith"). If the only contact information printed for a stop is an email address and/or phone number with no named person or role, set the name field to null and put the phone number (not the email) in the phone/contact field. NEVER put an email address into a name field.

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

  try {
    const imageContent = images.map((img) => ({
      type: "image_url",
      image_url: { url: img },
    }));

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
              ...imageContent,
            ],
          },
        ],
        max_tokens: 1600,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);
      return res.status(502).json({ error: "AI service error" });
    }

    const content = data.choices?.[0]?.message?.content || "";
    const marker = "===JSON===";
    const markerIndex = content.indexOf(marker);
    if (markerIndex === -1) {
      console.error("No JSON marker in response:", content);
      return res.status(502).json({ error: "AI response format error" });
    }
    let jsonText = content.slice(markerIndex + marker.length).trim();

    jsonText = jsonText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    const parsed = JSON.parse(jsonText);

    // Вагу рахуємо тут, у нашому коді — модель повертає ОКРЕМІ компоненти
    // ваги (може бути кілька, по одному на кожен pickup-стоп, кожен або
    // готове число, або масив позицій з таблиці) — ми їх усі підсумовуємо.
    // Так надійніше за арифметику моделі "в умі" без окремого кроку.
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

    return res.status(200).json({ ...parsed, weight });
  } catch (err) {
    console.error("Scan RateCon error:", err);
    return res.status(500).json({ error: "Failed to process document" });
  }
}
