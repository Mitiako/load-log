// api/scan-expense.js
// Vercel Serverless Function — сканує чек НЕ пального (запчастини,
// lumper, tolls, ремонт тощо) для секції Other Expenses.
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
              "You are a business expense receipt scanner for a trucking app (NOT for fuel receipts — those are handled elsewhere). Respond with ONLY a JSON object, no other text, no markdown. If this is actually a diesel fuel receipt, respond with exactly: {\"isFuelReceipt\": true}. Otherwise extract: name (short description of the expense, e.g. 'Lumper fee', 'Truck parts - O\\'Reilly Auto', 'Tolls'), amount (total dollar amount paid, number), date (YYYY-MM-DD format, null if not visible). Never guess or invent values — only extract what is actually printed on the receipt. If the image doesn't look like any kind of receipt, respond with exactly: {\"notAReceipt\": true}.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract the expense data from this receipt image.",
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
    console.error("Scan expense error:", err);
    return res.status(500).json({ error: "Failed to process receipt" });
  }
}
