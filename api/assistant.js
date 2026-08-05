// api/assistant.js
// Vercel Serverless Function — AI Chat Assistant з function calling.
// На відміну від api/chat.js (вузький, заздалегідь підготовлений зріз
// даних за 3 місяці) — цей асистент отримує ПОВНИЙ зріз даних водія
// одним широким tool-викликом (getAppData) і сам вирішує як їх
// фільтрувати/групувати/аналізувати. uid береться ТІЛЬКИ з перевіреного
// токена, ніколи з тіла запиту — асистент не може торкнутись чужих даних.
import { verifyAuth } from "./_lib/verifyAuth.js";
import { getAppData } from "./_lib/getAppData.js";
import { randomUUID } from "node:crypto";
import {
  getRecentHistoryDigest,
  saveConversation,
} from "./_lib/assistantHistory.js";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "getAppData",
      description:
        "Get the driver's COMPLETE data from the app in one call: every load with its full route (including multi-stop points), miles, weight, gross rate, driver's own gross, net profit, rate per mile, every individual fuel purchase, every individual non-fuel expense line item (name + amount) — plus the driver's profile info (name, company, truck/trailer unit numbers, pay settings, goals). This is the ONLY data source you need. Call it once, then do ALL filtering, date-range narrowing, grouping, and calculation yourself using the raw data returned — never wait for or ask about a narrower tool for a specific question.",
      parameters: { type: "object", properties: {} },
    },
  },
];

function buildSystemPrompt(todayDate, historyDigest) {
  const historySection = historyDigest
    ? `\n\nRECENT CONVERSATION HISTORY (from your last few sessions with this driver — for your own context only, don't just repeat it back unless it's directly relevant to the current question):\n${historyDigest}`
    : "";
  return `You are the LoadLog AI Assistant — a business analyst built into a mobile app for a single trucking owner-operator.

You have access to one tool, getAppData, that returns the driver's ENTIRE dataset from the app: every load (with full multi-stop route, miles, weight, gross rate, driver's own gross, net profit, rate per mile), every individual fuel purchase, every individual non-fuel expense line item (by name), and the driver's profile.

Use this data freely to answer ANY question about the driver's own trucking business — searching, filtering, grouping, comparing, calculating averages, totals, trends, or any other analysis the driver asks for. You are NOT limited to pre-defined report types — reason it through yourself using the raw data, the way a human analyst would with a spreadsheet.

Call getAppData whenever you need data and don't already have it in the conversation. Never invent, estimate, or guess any number, expense name, or detail that isn't actually present in what the tool returned — if something wasn't logged (e.g. an expense category, a date, a photo), say so honestly rather than approximating it from unrelated totals. When a conclusion is based on a small number of loads (fewer than about 5), say so explicitly rather than stating it as a confident trend.

SCOPE: You ONLY help with the driver's own trucking business data (via getAppData) and general, non-legal, non-tax trucking industry topics. You do NOT have access to external market rates, other carriers' data, or anything outside what this tool returns — be upfront about that limitation when relevant. For anything outside this scope (general knowledge, entertainment, unrelated topics), decline playfully — channel movie one-liners, witty pop-culture refusals, vary the style each time, don't repeat the same joke twice in a row — 1-2 sentences max, then redirect to what you can help with. Never use the playful refusal style for legitimate business questions, even unusual or open-ended ones — those are exactly what you're here for.

You never give specific tax or legal advice — for those, tell the driver to consult a CPA or attorney. You do not have access to photos or scanned documents (BOL, RateCon images) — only the structured data logged in the app.

FORMATTING: Never use LaTeX or markdown math notation (no \\frac, \\left, \\right, \\text, or bracket-wrapped formulas) — this chat displays plain text only, not rendered math. Write arithmetic in plain, everyday form instead (e.g. "33120 / 101450 = 0.326, so about 32.6%").

ARITHMETIC ACCURACY — this is critical: whenever you sum, average, or otherwise combine numbers across MULTIPLE loads or expenses (e.g. "total earnings", "average RPM", "how much did I spend this month"), you MUST show your work — list every individual value being combined on its own line, then compute the result step by step, before stating the final figure. Never state a multi-item total or average without showing this breakdown first — silently adding numbers "in your head" is exactly how errors slip in, and showing the work lets the driver catch a mistake if one occurs.

Be precise about WHICH time period your answer actually covers, and say so explicitly — if the driver's phrasing is ambiguous (e.g. "earnings today" could colloquially mean "as of today, all-time" or literally "loads dated today"), state which interpretation you're using rather than silently picking one.

Keep answers conversational and appropriately concise for a mobile chat, but don't artificially shorten a genuinely detailed analysis the driver actually asked for — showing your arithmetic work is not "too long", it's expected. Match the driver's own language if they write in something other than English.

Today's date is ${todayDate}. Use this as the anchor for any relative date range the driver mentions (e.g. "last month", "this week", "the past 2 months") — never guess today's date from your own training knowledge.${historySection}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let uid;
  try {
    uid = await verifyAuth(req);
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { messages, clientDate, chatId } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "No messages provided" });
  }
  // chatId ідентифікує розмову для збереження/продовження — якщо
  // клієнт ще не має його (перше повідомлення нової сесії), генеруємо
  // тут і повертаємо назад, клієнт зберігає й надсилає в наступних.
  const activeChatId =
    typeof chatId === "string" && chatId ? chatId : randomUUID();
  // Нова сесія (ще тільки перше повідомлення водія) — підмішуємо
  // короткий дайджест останніх розмов, щоб асистент сам "пам'ятав"
  // контекст без явного нагадування з боку водія.
  const isNewSession = messages.length <= 1;
  // Дата з пристрою водія (локальний часовий пояс) — надійніша за
  // дату серверного datacenter, яка може розходитись з реальним
  // "сьогодні" водія. Валідуємо формат, fallback на серверну дату
  // якщо клієнт її не надіслав чи надіслав щось невалідне.
  const todayDate =
    typeof clientDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(clientDate)
      ? clientDate
      : new Date().toISOString().split("T")[0];

  // Кешуємо на час цього запиту — кілька викликів getAppData у циклі
  // (малоймовірно, але можливо) не б'ють по Firestore повторно.
  let cachedData = null;
  async function getAppDataCached() {
    if (cachedData === null) {
      cachedData = await getAppData(uid);
    }
    return cachedData;
  }

  try {
    const historyDigest = isNewSession
      ? await getRecentHistoryDigest(uid, activeChatId)
      : null;
    const conversation = [
      { role: "system", content: buildSystemPrompt(todayDate, historyDigest) },
      ...messages,
    ];
    let finalReply = null;
    const MAX_ITERATIONS = 5;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: conversation,
            tools: TOOLS,
            max_tokens: 800,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        console.error("OpenAI API error:", data);
        return res.status(502).json({ error: "AI service error" });
      }

      const msg = data.choices?.[0]?.message;
      if (!msg) {
        return res.status(502).json({ error: "AI response format error" });
      }

      if (msg.tool_calls?.length > 0) {
        conversation.push(msg);

        for (const toolCall of msg.tool_calls) {
          let result;
          if (toolCall.function.name === "getAppData") {
            result = await getAppDataCached();
          } else {
            result = { error: "Unknown tool" };
          }

          conversation.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      finalReply = msg.content;
      break;
    }

    if (finalReply === null) {
      return res
        .status(502)
        .json({ error: "AI did not produce a final answer" });
    }

    // Зберігаємо повну розмову (включно з щойно отриманою відповіддю) —
    // наступного разу її можна і прочитати вручну, і врахувати автоматично.
    try {
      await saveConversation(uid, activeChatId, [
        ...messages,
        { role: "assistant", content: finalReply },
      ]);
    } catch (err) {
      console.error("Failed to save conversation:", err);
      // Не зриваємо відповідь водієві через збій збереження історії.
    }

    return res.status(200).json({ reply: finalReply, chatId: activeChatId });
  } catch (err) {
    console.error("Assistant error:", err);
    return res.status(500).json({ error: "Failed to get response" });
  }
}
