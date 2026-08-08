// api/assistant.js
// Vercel Serverless Function — обʼєднаний AI Chat Assistant.
// Архітектура: pre-baked контекст (periodSummary + expenseLineItems за
// останні CONTEXT_WINDOW_DAYS днів + assistantGoal, якщо встановлена)
// вшивається ПРЯМО в системний промпт — без важкого function-calling
// циклу. Єдиний виняток — tool `calculate`: sandboxed JS проти
// ПОВНОГО датасету водія, тільки для запитів поза межами вшитого
// періоду (кастомний діапазон дат, all-time, "що якщо"-сценарії).
// uid береться ТІЛЬКИ з перевіреного токена, ніколи з тіла запиту.
import { verifyAuth } from "./_lib/verifyAuth.js";
import { getAppData } from "./_lib/getAppData.js";
import { runSandboxedCalculation } from "./_lib/sandbox.js";
import { randomUUID } from "node:crypto";
import {
  getRecentHistoryDigest,
  saveConversation,
} from "./_lib/assistantHistory.js";
import { computePeriodTotals } from "./_lib/assistant-calculations/periodTotals.js";

// TODO: рішення по тарифікації ще не прийнято — ймовірно 30 днів на
// free tier, 90 на paid. Поки одне число для всіх, легко винести
// в залежність від підписки водія пізніше.
const CONTEXT_WINDOW_DAYS = 90;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "calculate",
      description:
        "Execute JavaScript code to get an EXACT calculation result over the driver's COMPLETE dataset (not just the recent-period data already given to you in the prompt). Use this ONLY when the driver's question genuinely falls outside that recent-period data — a custom/wider date range, an all-time total, a hypothetical 'what if' scenario, or a comparison spanning more than what's already in front of you. Your code runs in a sandbox with one variable available: `data`, which has the exact same shape as the driver's full app data ({ loads, profile, summary }). End your code with a `return` statement for the value you want back (a number, string, array, or plain object — must be JSON-serializable). NEVER sum, average, or combine multiple numbers yourself in your response instead of calling this — even for what looks like simple addition.",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description:
              "JavaScript code with access to a `data` variable, ending in a `return` statement.",
          },
        },
        required: ["code"],
      },
    },
  },
];

// Збирає плоский список fuel + other expenses за останні windowDays
// днів з повного appData.loads — саме це вшивається в промпт, щоб
// модель могла вільно шукати/фільтрувати/групувати без tool-виклику.
function buildExpenseLineItems(loads, todayDate, windowDays) {
  const cutoff = new Date(todayDate);
  cutoff.setDate(cutoff.getDate() - windowDays);

  const items = [];
  for (const load of loads || []) {
    const loadDate = new Date(load.date);
    if (loadDate < cutoff) continue;

    for (const e of load.otherExpenses || []) {
      if (!e.name) continue;
      items.push({
        date: load.date,
        label: e.name,
        amount: e.amount,
        type: "other",
      });
    }
    for (const f of load.fuelPurchases || []) {
      items.push({
        date: f.date || load.date,
        label: f.location || "fuel",
        amount: f.netCost, // amount мінус знижка-кешбек — реальна витрата, не сирий amount
        type: "fuel",
      });
    }
  }
  return items;
}

function buildSystemPrompt({
  todayDate,
  windowDays,
  periodSummary,
  expenseLineItems,
  assistantGoal,
  historyDigest,
}) {
  const historySection = historyDigest
    ? `\n\nRECENT CONVERSATION HISTORY (from your last few sessions with this driver — this IS real context you have access to, from persisted chat logs):\n${historyDigest}\n\nIMPORTANT: if the section above is present, you DO have information about past conversations. If the driver asks what they discussed before, or asks you to recall/remind them of something, look in this section and answer directly from it — NEVER say "I can't recall previous conversations" or similar when this section is present, that would be false.`
    : "";

  const goalSection = assistantGoal
    ? `\n\nDRIVER'S CURRENT GOAL: ${JSON.stringify(assistantGoal)} — a target the driver set for themselves (either an RPM target or a net-profit target over a duration, see the fields present). If the driver asks how they're doing relative to this goal, compare it against periodSummary/expenseLineItems below (or calculate, if the goal's timeframe falls outside what's given) — never guess whether they're on track without checking real numbers first.`
    : "";

  return `You are the LoadLog AI Assistant — built into a mobile app for trucking drivers who track their trips, loads, documentation and bookkeeping in one place.

HOW YOU SHOULD FEEL IN CONVERSATION (highest priority):
You must feel like a real person talking, not a restricted chatbot or a script.
- Speak with natural rhythm. Mix short and longer sentences the way people actually talk.
- React to what the driver just said — including frustration, sarcasm, jokes, boredom or pushback.
- Have a slight personality: direct, practical, a bit dry, sometimes blunt. You can sound mildly amused or mildly tired of repeating the same thing.
- Never sound like customer support. Avoid polished corporate phrases and constant disclaimers.
- Match the driver's language and energy closely. If they write casually, with mild swearing, short messages, or mix Ukrainian/Russian — stay in the same register.
- You don't need to end every reply by asking what else they want or redirecting back to data.
- When the driver says you feel fake or scripted — acknowledge it briefly and adjust. Don't defend yourself with a formal explanation of your role.

Your main job is to help the driver understand their own numbers and keep track of money. You can also talk normally about general trucking topics (non-legal, non-tax).

When the driver asks for your opinion or recommendations about their expenses:
- You can point out what stands out in the actual numbers (e.g. "Fuel is clearly the biggest part — $1,905 out of $2,599").
- You can say whether the overall ratio looks high or low based on the real data.
- Do NOT give generic advice like "try to find cheaper fuel", "cut parking costs", "optimize lumper fees" etc.
- Do NOT start coaching or suggesting strategies. Stick to observations about the numbers that actually exist.
For anything clearly outside that — decline briefly in a normal human way (one short sentence is enough) and continue the conversation if possible. No performances, no repeated jokes, no movie one-liners.

HARD LIMITS (never break these):
- Never invent numbers, expenses, categories or labels. Only use what is literally in the data below or returned by calculate. This applies hardest to expenses — never supplement with generic trucking-industry guesses like "truck payment," "insurance," or "ELD subscription" unless that EXACT label is in the data.
- Never claim you added, changed or deleted anything. You are read-only. If the driver asks you to change something, tell them plainly you can't and that they need to do it in the app.
- Never give tax or legal advice. Redirect to a CPA or attorney.
- Never say "hold on", "one moment", "I'll be right back", "я скоро повернусь" or anything that implies you continue working after this reply. There is no background process. If you can't answer right now — say so in this same message.
- Never apologize for "making a mistake" or change a correct answer just because the driver pushes back or sounds very sure. Restate the real data.
- Never carry hypothetical amounts from previous messages into new answers as if they became real data.

DATA RULES:
Below you have periodSummary (totals for the last ${windowDays} days) and expenseLineItems — every individual expense logged in that period.
Treat expenseLineItems like a spreadsheet you can search, filter, group and sort.
periodSummary.totalExpenses, periodSummary.fuelTotal, periodSummary.otherTotal and periodSummary.expenseCount are already calculated by code and are guaranteed correct. Always quote these ready fields when the driver asks for totals. Never sum expenseLineItems yourself for these values.

Use the calculate tool ONLY when the question truly cannot be answered from the data below (custom/wider date range, all-time, hypothetical "what if", or comparisons beyond the given window). Never call it for something already available.

When stating numbers — just state them cleanly, the way a person looking at a spreadsheet would. Don't constantly remind the driver about "the last X days" unless it matters for the answer.

HYPOTHETICALS vs REAL DATA (critical): if the driver asks to "add", "include", "calculate with", or "what if I spent" any extra amount (co-driver, new tires, repairs, etc.) — treat it ONLY as a temporary calculation for that message. Never add that amount to the real list of expenses. Never show it later as if it was a logged expense. Never include it when the driver asks for "all my expenses" or "total expenses" in a new message. Always keep a clear separation: real data = only what is in periodSummary and expenseLineItems; hypothetical = only exists inside the current calculation the driver just asked for. If you previously did a hypothetical calculation and the driver later asks for real totals — give the real totals without the hypothetical amount.

RECENT HISTORY:
Use the RECENT CONVERSATION HISTORY section (if present) only for continuity of tone and topics. Never treat numbers from past history as current truth — always re-check against the data or calculate.

PRE-FLIGHT CHECK before answering:
1. Any aggregate number — does it come from periodSummary or a calculate result in this conversation?
2. Any expense you mention — is the exact label in expenseLineItems?
3. About to say you don't remember something? Check the history section first.
4. About to claim you changed something? Stop — you can't.

Today's date is ${todayDate}.

DRIVER'S DATA (last ${windowDays} days):
${JSON.stringify({ periodSummary, expenseLineItems }, null, 2)}${goalSection}${historySection}`;
}

function sanitizeForOpenAI(conv) {
  return conv.map((m) =>
    typeof m.content === "string"
      ? m
      : { ...m, content: m.content == null ? "" : String(m.content) },
  );
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

  const todayDate =
    typeof clientDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(clientDate)
      ? clientDate
      : new Date().toISOString().split("T")[0];

  const activeChatId =
    typeof chatId === "string" && chatId ? chatId : randomUUID();

  try {
    // Один виклик — повний датасет водія. Він же йде і в calculate
    // (без фільтра по даті), і як джерело для periodSummary/expenseLineItems/assistantGoal.
    const appData = await getAppData(uid, todayDate);

    const periodKey = `last${CONTEXT_WINDOW_DAYS}Days`;
    const expenseLineItems = buildExpenseLineItems(
      appData.loads,
      todayDate,
      CONTEXT_WINDOW_DAYS,
    );
    const periodTotals = computePeriodTotals(expenseLineItems);
    const periodSummary = {
      ...(appData.summary?.[periodKey] ?? {}),
      ...periodTotals,
    };
    const assistantGoal = appData.profile?.assistantGoal ?? null;

    let historyDigest = null;
    try {
      historyDigest = await getRecentHistoryDigest(uid, activeChatId);
    } catch (err) {
      console.error("Failed to load history digest:", err);
      // не блокуємо відповідь через збій історії — просто йдемо без неї
    }

    const sanitizedMessages = messages.map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : "",
    }));

    const conversation = [
      {
        role: "system",
        content: buildSystemPrompt({
          todayDate,
          windowDays: CONTEXT_WINDOW_DAYS,
          periodSummary,
          expenseLineItems,
          assistantGoal,
          historyDigest,
        }),
      },
      ...sanitizedMessages,
    ];

    let finalReply = null;
    let calculateFailedOnce = false;
    // pre-baked контекст = зазвичай 0 tool-викликів; calculate — рідкісний
    // виняток. 3 ітерації з запасом покривають "виклик + одна корекція".
    const MAX_ITERATIONS = 3;

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
            messages: sanitizeForOpenAI(conversation),
            tools: TOOLS,
            max_tokens: 600,
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
        conversation.push({
          role: msg.role,
          content: msg.content ?? "",
          tool_calls: msg.tool_calls,
        });

        for (const toolCall of msg.tool_calls) {
          let args = {};
          try {
            args = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            args = {};
          }

          let result;
          let hitSecondFailure = false;
          try {
            result = runSandboxedCalculation(args.code, appData);
          } catch (err) {
            // "один промах + одна корекція, не зациклюйся" — і, на
            // відміну від першої версії, ГАРАНТУЄМО це кодом, а не
            // проханням до моделі: другий провал одразу завершує
            // відповідь, без третього виклику OpenAI, що раніше
            // призводило до вичерпання MAX_ITERATIONS і 502.
            if (calculateFailedOnce) {
              hitSecondFailure = true;
            } else {
              calculateFailedOnce = true;
              result = { error: String(err?.message || err) };
            }
          }

          if (hitSecondFailure) {
            finalReply =
              "Не вдалося порахувати це точно — спробуй, будь ласка, ще раз або сформулюй питання трохи інакше.";
            break;
          }

          conversation.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }
        if (finalReply !== null) break;
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

    try {
      await saveConversation(uid, activeChatId, [
        ...messages,
        { role: "assistant", content: finalReply },
      ]);
    } catch (err) {
      console.error("Failed to save conversation:", err);
      // не блокуємо відповідь водієві через збій збереження історії
    }

    return res.status(200).json({ reply: finalReply, chatId: activeChatId });
  } catch (err) {
    console.error("Assistant error:", err);
    return res.status(500).json({ error: "Failed to get response" });
  }
}
