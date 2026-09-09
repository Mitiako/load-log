// api/scan-expense.js
// Vercel Serverless Function — сканує чек НЕ пального (запчастини,
// lumper, tolls, ремонт тощо) для секції Other Expenses. Повертає
// мульти-item lineItems замість одного name/amount — реальні чеки
// (напр. Walmart) майже завжди містять кілька різних позицій.
import { verifyAuth } from "./_lib/verifyAuth.js";
import { EXPENSE_CATEGORIES } from "../src/utils/expenseCategories.js";

const CATEGORY_NAMES = EXPENSE_CATEGORIES.map((c) => c.name).join(", ");

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
  if (image.length > 10_000_000) {
    return res.status(413).json({ error: "Image too large" });
  }

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gemini-3.6-flash",
          messages: [
            {
              role: "system",
              content: `You are a business expense receipt scanner for a trucking app (NOT for fuel receipts — those are handled elsewhere). Respond with ONLY a JSON object, no other text, no markdown.

If this is actually a diesel fuel receipt, respond with exactly: {"isFuelReceipt": true}.
If the image doesn't look like any kind of receipt, respond with exactly: {"notAReceipt": true}.

Otherwise extract:
- merchant (store/vendor name as printed, e.g. "Walmart", "O'Reilly Auto Parts")
- date (YYYY-MM-DD format, null if not visible)
- total (the final total amount paid, number)
- lineItems: an array of EVERY distinct item/service on the receipt, PLUS sales tax as its own entry if shown separately, each with:
  - label (item name exactly as printed, or a short clear description if abbreviated; use "Sales Tax" for tax line(s) — combine multiple tax lines like "Tax1"/"Tax2" into one "Sales Tax" entry with their summed amount)
  - amount (that item's price, number)
  - category (pick the SINGLE best match from this exact list, use "Other" if nothing fits: ${CATEGORY_NAMES})

Ignore completely (do not create lineItems for):
- Masked card numbers (e.g. XXXXXXXXXXXX0000)
- Authorization / approval codes
- Terminal ID, merchant ID, store number
- Loyalty / rewards / points lines
- "Redeem", "Cash Back", "Change Due", "Amount Tendered" (these are payment method info, not purchased items)
- Any purely technical or payment-processing line

The sum of lineItems amounts (including sales tax) should closely match the printed total. If there's a small unexplained difference, still only extract what is clearly a purchased item or service printed on the receipt — never invent an extra item just to force the sum to match. A receipt with many items is normal — extract ALL genuine items, do not summarize, skip, or merge them. Never guess or invent values — only extract what is actually printed on the receipt.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract the expense data from this receipt image.",
                },
                {
                  type: "image_url",
                  image_url: { url: image, detail: "high" },
                },
              ],
            },
          ],
          max_tokens: 4000,
          response_format: { type: "json_object" },
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);
      return res.status(502).json({ error: "AI service error" });
    }

    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    console.log("scan-expense raw output:", JSON.stringify(parsed)); // ТИМЧАСОВО для діагностики

    // Перевірка кодом, не довірою до моделі: якщо сума окремих позицій
    // не збігається з надрукованим total чека — це ознака того, що
    // OCR переплутав суми між рядками (row misalignment), а не просто
    // помилка округлення. Позначаємо прапорцем — водій бачить
    // попередження в UI, дані все одно повертаються для перегляду.
    if (parsed.lineItems?.length && typeof parsed.total === "number") {
      const itemsSum = parsed.lineItems.reduce(
        (s, item) => s + (Number(item.amount) || 0),
        0,
      );
      const diff = Math.abs(itemsSum - parsed.total);
      if (diff > 0.02) {
        parsed.amountsMismatch = true;
      }
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("Scan expense error:", err);
    return res.status(500).json({ error: "Failed to process receipt" });
  }
}
