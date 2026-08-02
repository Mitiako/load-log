// api/scan-ratecon.js
// Vercel Serverless Function — витягує дані з фото/фото RateCon
// (Rate Confirmation), який водій отримує від диспетчера/брокера.
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

  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: "No image provided" });
  }
  if (typeof image !== "string" || !image.startsWith("data:image/")) {
    return res.status(400).json({ error: "Invalid image format" });
  }
  // ~10MB base64 ліміт — реальні фото чеків важать значно менше;
  // захист від навмисно роздутого payload, що забиває памʼять
  // функції чи роздуває OpenAI-рахунок.
  if (image.length > 10_000_000) {
    return res.status(413).json({ error: "Image too large" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              'You are a Rate Confirmation (RateCon) document scanner for a trucking app. Respond with ONLY a JSON object, no other text, no markdown. If this is NOT a rate confirmation / load tender document, respond with exactly: {"notARateCon": true}. Otherwise extract: originCity (FIRST pickup city, string), originState (FIRST pickup 2-letter state abbreviation), originAddress (FIRST pickup street address if shown, string, null if not shown), originZip (FIRST pickup ZIP code if shown, string, null if not shown), shipperName (company name at FIRST pickup, string, null if not shown), shipperContact (phone number or contact person at FIRST pickup if shown, string, null if not shown), destinationCity (LAST delivery city, string), destinationState (LAST delivery 2-letter state abbreviation), destinationAddress (LAST delivery street address if shown, string, null if not shown), destinationZip (LAST delivery ZIP code if shown, string, null if not shown), receiverName (company name at LAST delivery, string, null if not shown), receiverContact (phone number or contact person at LAST delivery if shown, string, null if not shown), rate (total dollar amount the broker pays, number), miles (trip/loaded miles if printed on the document, number, null if not shown), weight (in lbs if shown, number, null if not shown). IMPORTANT — multi-stop documents: many RateCons list MULTIPLE pickup and/or delivery stops, labeled things like "Stop 1", "Stop 2", "PU#1/PU#2", "Consignee 1/2", or simply multiple address blocks under pickup/delivery sections. If there is more than ONE pickup stop, put the FIRST one in originCity/originState/etc above, and put every ADDITIONAL pickup stop (2nd, 3rd, ...) as an object in an "additionalPickups" array, each with: city (combined "City, ST" string), address (string, null if not shown), zip (string, null if not shown), contactName (string, null if not shown), contactPhone (string, null if not shown). Do the same for extra delivery stops in an "additionalDeliveries" array (same object shape). If there is only one pickup and one delivery (the common case), return additionalPickups and additionalDeliveries as empty arrays. Never guess or invent values — only extract what is actually printed on the document. If a field is not visible or not present, use null, never an empty string or a guess.',
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract the rate confirmation data from this image.",
              },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
        max_tokens: 900,
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);
      return res.status(502).json({ error: "AI service error" });
    }

    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error("Scan RateCon error:", err);
    return res.status(500).json({ error: "Failed to process document" });
  }
}
