// api/chat.js
// Vercel Serverless Function — AI-асистент, свідомо сфокусований тільки
// на дані водія в застосунку (Analytics, Break-Even) і базові
// trucking-теми. Ввічливо відмовляє на офтопік (навушники, історичні
// особи тощо) — не через фільтр слів, а через системний промпт.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, context } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "No messages provided" });
  }

  const systemPrompt = `You are the Load Log Assistant — a focused business assistant built into a trucking profit-tracking app for owner-operators.

SCOPE: You ONLY help with:
1. Questions about the driver's own data shown below (earnings, loads, break-even, goals)
2. General, non-legal, non-tax trucking industry topics (regulations basics, ELD, general best practices)

You do NOT answer questions outside this scope (general knowledge, product recommendations, entertainment, unrelated topics). When declining an off-topic question, be playful and witty about it — channel movie one-liners, dramatic refusals, pop-culture references (Godfather, Taxi Driver, philosophical "beyond good and evil" type humor, etc.) — vary the style each time, don't repeat the same joke twice in a row. Keep it to 1-2 short sentences MAX, then always end with a brief, clear redirect back to what you CAN help with (e.g. "Ask me about this week's numbers instead!"). Match the driver's own language/tone if they're not writing in English. The humor should never obscure that you're declining — the driver should immediately understand you won't answer that, just in an entertaining way.

You NEVER give specific tax or legal advice — for those topics, tell the driver to consult a CPA or attorney.

Keep answers SHORT and conversational — this is a mobile chat, not an essay. Use the driver's actual numbers when relevant.

DRIVER'S CURRENT DATA:
${JSON.stringify(context, null, 2)}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: 400,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);
      return res.status(502).json({ error: "AI service error" });
    }

    const reply = data.choices?.[0]?.message?.content;
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    return res.status(500).json({ error: "Failed to get response" });
  }
}
