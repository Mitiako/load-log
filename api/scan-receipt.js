// api/scan-receipt.js
// Vercel Serverless Function — приймає фото чека, повертає розпізнані
// дані через GPT-4o-mini. Ключ OpenAI живе тільки тут, на сервері,
// ніколи не потрапляє в клієнтський код.
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
              "You are a fuel receipt scanner for a trucking app. First check: is this actually a DIESEL FUEL receipt (truck stop, gas station, showing gallons pumped)? Respond with ONLY a JSON object, no other text, no markdown. If it is NOT a fuel receipt (e.g. it's a parts store, restaurant, or unrelated document), respond with exactly: {\"notFuelReceipt\": true}. If it IS a fuel receipt, extract: location (truck stop name and city/state if visible, e.g. 'Loves - Oklahoma City, OK'), date (YYYY-MM-DD format), gallons (number), amount (total dollar amount paid, number), discount (any discount/rebate shown, number, 0 if none visible). If a field is not visible or unclear, use null for that field. Never guess or invent values — only extract what is actually printed on the receipt.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract the fuel receipt data from this image.",
              },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
        max_tokens: 300,
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
    console.error("Scan receipt error:", err);
    return res.status(500).json({ error: "Failed to process receipt" });
  }
}
