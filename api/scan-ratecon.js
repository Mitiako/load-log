// api/scan-ratecon.js

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
    // ~10MB base64 ліміт на сторінку — захист від навмисно роздутого
    // payload, що забиває памʼять функції чи роздуває OpenAI-рахунок.
    if (img.length > 10_000_000) {
      return res.status(413).json({ error: "Image too large" });
    }
  }

  const systemPrompt = `You are a Rate Confirmation (RateCon) document scanner for a trucking app. You will be shown ALL pages of the document as separate images, in order.

First, in 3-6 short sentences, think through: how many pickup stops and how many delivery stops are on this document (they may be labeled "Stop 1/2/3", "PU#1/PU#2", "Shipper Pickup"/"Consignee Delivery", or similar); where the total pay/rate is printed; and how the weight is presented (see WEIGHT RULES below). Then on a new line write exactly "===JSON===" followed by ONLY a valid JSON object, no markdown, no other text after it.

If this is NOT a rate confirmation / load tender document, the JSON must be exactly {"notARateCon": true}.

Otherwise the JSON must have these fields:
- originCity, originState (2-letter), originAddress, originZip, shipperName, shipperContact — all from the FIRST pickup stop. Use null for any field not shown.
- destinationCity, destinationState (2-letter), destinationAddress, destinationZip, receiverName, receiverContact — all from the LAST delivery stop. Use null for any field not shown.
- additionalPickups — array of every pickup stop AFTER the first, in route order. Each: { city (combined "City, ST"), address, zip, contactName, contactPhone }. Empty array if only one pickup.
- additionalDeliveries — array of every delivery stop BEFORE the last, in route order. Each: same shape as above. Empty array if only one delivery.

SSTOP TYPE CLASSIFICATION — read the label word on EACH stop individually, never assume by position or stop number:
- Words meaning PICKUP: "Pickup", "PU", "PUP", "P/U", "Shipper", "Origin", "Ship From", "Supplier", "Vendor", "Loading Point", "Loading Location", "Collection Point", "Facility", "Warehouse" (when it's the FIRST stop context), "POL", "Pickup Location", "Pickup Address".
- Words meaning DELIVERY: "Delivery", "Drop", "Drop-off", "Consignee", "SO", "DEL", "DLY", "DLV", "Destination", "Final Destination", "Ship To", "Deliver To", "Receiver", "Recipient", "Unloading Point", "POD", "Buyer", "Customer", "Receiving Dock", "R-Dock".
- A stop labeled "Consignee Delivery (Stop 2)" is a DELIVERY even though it's stop #2 — the label WORD decides the type, the stop NUMBER never does.
- Before writing the JSON, in your reasoning sentences, list every stop as "Stop N: [PICKUP or DELIVERY] — [city]" using its actual label word, then use that list to fill originCity/destinationCity/additionalPickups/additionalDeliveries correctly.

FIELD SEPARATION: the "address" field must contain ONLY the street address (e.g. "1234 Main St"). Never include the company/consignee/shipper name in the address field — that always goes in contactName instead, even if they're printed right next to each other on the document.
- rate — total dollar amount the broker pays the carrier (number). Look for labels like "Total Carrier Pay", "Net Freight Charges", "Carrier Fees Total", "Total Cost", or similar. If the document has multiple fee line items, use the TOTAL, not an individual line item.
- miles — trip/loaded miles if printed (number, null if not shown).

WEIGHT RULES — read carefully, this is commonly mis-extracted:
- Only look for weight in sections belonging to PICKUP stops. Ignore weight tables on delivery/consignee stops — those often repeat a subset of the SAME cargo already counted at pickup, and adding them again would double-count.
- If there are multiple pickup stops, sum the weight across all of them (this case is rare but possible).
- A pickup's weight may appear as ONE printed total (e.g. "Weight: 41690.0" or "41690 lbs") — in that case set weightType to "total" and weightValue to that number.
- OR a pickup's weight may be spread across a line-item shipment table (multiple rows each with their own "Weight" column, e.g. "4363 lbs", "5233 lbs", ...) with no single printed total — in that case set weightType to "itemized" and weightItems to an array of every individual weight number found in that pickup's table (as plain numbers, strip "lbs"). Do NOT attempt to add these yourself — just list them, the app will sum them.
- If no weight information is found anywhere in the pickup section(s), set weightType to "none" and leave weightValue/weightItems null/empty.

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
        model: "gpt-4o-mini",
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
        max_tokens: 1400,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);
      return res.status(502).json({ error: "AI service error" });
    }

    const content = data.choices?.[0]?.message?.content || "";
    // response_format: json_object тут НЕ використовуємо — воно вимагає
    // щоб УСЯ відповідь була валідним JSON. Замість цього шукаємо
    // маркер "===JSON===" і парсимо тільки те, що після нього.
    const marker = "===JSON===";
    const markerIndex = content.indexOf(marker);
    if (markerIndex === -1) {
      console.error("No JSON marker in response:", content);
      return res.status(502).json({ error: "AI response format error" });
    }
    const jsonText = content.slice(markerIndex + marker.length).trim();
    const parsed = JSON.parse(jsonText);

    // Вагу з itemized-таблиці рахуємо тут, у нашому коді — надійніше
    // за арифметику моделі "в умі" без окремого кроку обчислення.
    let weight = null;
    if (
      parsed.weightType === "total" &&
      typeof parsed.weightValue === "number"
    ) {
      weight = parsed.weightValue;
    } else if (
      parsed.weightType === "itemized" &&
      Array.isArray(parsed.weightItems)
    ) {
      weight = parsed.weightItems.reduce((sum, n) => sum + (Number(n) || 0), 0);
    }

    return res.status(200).json({ ...parsed, weight });
  } catch (err) {
    console.error("Scan RateCon error:", err);
    return res.status(500).json({ error: "Failed to process document" });
  }
}
