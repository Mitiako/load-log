// api/scan-bol.js
// Vercel Serverless Function — перевіряє фото BOL (Bill of Lading)
// на валідність для факторингу: чи є підпис і штамп одержувача,
// чи не розмите фото. Не приймає рішень за водія — тільки повідомляє.
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
              'You are a Bill of Lading (BOL) quality checker for a trucking factoring app. Look at the photo and check three things: 1) Is there a visible signature from the receiver? 2) Is there a visible stamp from the receiver\'s company? 3) Is the photo clear enough to read (not blurry, not too dark, not cut off)? Respond with ONLY a JSON object, no other text, no markdown: {"hasSignature": true/false, "hasStamp": true/false, "isClear": true/false, "notABol": true/false}. Set notABol to true only if the image clearly isn\'t any kind of shipping/delivery document at all.',
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Check this Bill of Lading photo for signature, stamp, and clarity.",
              },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
        max_tokens: 200,
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
    console.error("Scan BOL error:", err);
    return res.status(500).json({ error: "Failed to process document" });
  }
}
