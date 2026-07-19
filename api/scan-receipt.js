// api/scan-receipt.js
// Vercel Serverless Function — приймає фото чека, повертає розпізнані
// дані через GPT-4o-mini. Ключ OpenAI живе тільки тут, на сервері,
// ніколи не потрапляє в клієнтський код.
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
              "You are a fuel receipt scanner for a trucking app. Extract data from the receipt image and respond with ONLY a JSON object, no other text, no markdown. Fields: location (truck stop name and city/state if visible, e.g. 'Loves - Oklahoma City, OK'), date (YYYY-MM-DD format), gallons (number), amount (total dollar amount paid, number), discount (any discount/rebate shown, number, 0 if none visible). If a field is not visible or unclear, use null for that field. Never guess or invent values — only extract what is actually printed on the receipt.",
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
