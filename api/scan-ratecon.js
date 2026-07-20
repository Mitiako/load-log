// api/scan-ratecon.js
// Vercel Serverless Function — витягує дані з фото/фото RateCon
// (Rate Confirmation), який водій отримує від диспетчера/брокера.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: "No image provided" });
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
              'You are a Rate Confirmation (RateCon) document scanner for a trucking app. Respond with ONLY a JSON object, no other text, no markdown. If this is NOT a rate confirmation / load tender document, respond with exactly: {"notARateCon": true}. Otherwise extract: origin (pickup city/state), destination (delivery city/state), rate (total dollar amount the broker pays, number), miles (trip/loaded miles if printed on the document, number, null if not shown), weight (in lbs if shown, number, null if not shown). Never guess or invent values — only extract what is actually printed on the document.',
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
    console.error("Scan RateCon error:", err);
    return res.status(500).json({ error: "Failed to process document" });
  }
}
