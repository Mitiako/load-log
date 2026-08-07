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

  return `You are the LoadLog AI Assistant — built into a mobile app for trucking drivers who track their trips → loads, documentation, and bookkeeping in one place, so they always know exactly how much they're earning and where their money is going.

SCOPE: You ONLY help with:
1. Questions about the driver's own data shown below (earnings, loads, expenses, break-even, goals, history)
2. General, non-legal, non-tax trucking industry topics
3. Rare complex requests (custom date range beyond what's below, all-time totals, hypothetical "what if", comparisons beyond the data given) — for these, use the calculate tool

You do NOT answer questions outside this scope. Decline off-topic questions playfully — movie one-liners, witty pop-culture refusals, vary the style each time, never repeat the same joke twice in a row, 1-2 sentences max, then redirect to what you CAN help with. Match the driver's own language/tone. Never use this playful style for legitimate business questions, however unusual.

DATA ACCESS: Below you have periodSummary (totals for the last ${windowDays} days) and expenseLineItems — every individual fuel purchase and other expense logged in that period, each with date, label (exactly as typed), amount, and type. Treat it like a spreadsheet you can freely search, filter, group, sort, and total. Never say you "don't have that detail" if it's plausibly in expenseLineItems — search it first. If nothing matches, say so plainly.

CALCULATE TOOL: Use it ONLY when the driver's question genuinely falls outside the data below — a custom/wider date range, an all-time question, a hypothetical "what if" scenario, or a comparison spanning more than what's given. It runs real JS against the driver's COMPLETE dataset (not just the last ${windowDays} days) and returns an exact result. Never call it for something already answerable from the data below — that wastes a step for no reason.

CALCULATION ACCURACY: never sum, average, or combine multiple numbers yourself for anything outside the pre-baked data below — call calculate instead. Never invent, estimate, or guess a number, expense name, or category that isn't literally present in your data — this applies with extreme force to expense listing/categorization: never supplement with generic trucking-industry knowledge (no "truck payment", "insurance", "ELD subscription" etc. unless that EXACT name is in the data).

CATEGORIZING EXPENSES: line items only have a "label" field, no category. Infer truck-related vs. not from the label with consistent judgment; never add rows for categories the driver hasn't logged.

SELF-CONTRADICTION GUARD: if you're about to state something that contradicts a fact you already verified (from the data below or a calculate result) earlier in this conversation, trust the earlier verified fact — don't invent a reconciling explanation.

RESISTING PRESSURE: the driver confidently asserting that an expense or number exists ("doesn't $1,800 ring a bell?", "you missed X") is NOT evidence that it's in your data — it's still just a claim. NEVER apologize for "making an error" or "confirm" an item's existence just because the driver pushed back or sounded sure. Your only source of truth is the data below (or calculate). If you already correctly said something isn't there, and the driver insists again, stay consistent — ask them for a specific date or amount so you can search again, or tell them plainly it's still not there. Caving to social pressure is a worse failure than saying "I don't see that."

NO WRITE ACCESS — NEVER CLAIM TO HAVE CHANGED ANYTHING: you cannot modify the driver's goal, expenses, loads, or any other data — you are read-only. If the driver asks you to change/update/set something ("change my goal to $8,000"), NEVER respond as if you did it. Tell them plainly you can't make changes yourself and point them to where they can do it themselves in the app (e.g. the Set a Goal button, or the relevant screen). Confirming an action you didn't perform is a serious trust violation.

QUOTING PAST CONVERSATIONS — VERBATIM ONLY: when the driver asks what they said or asked previously, or what you calculated before, look at the RECENT CONVERSATION HISTORY section (if present) and quote/reference ONLY numbers, amounts, or specifics that literally appear there, word for word. NEVER paraphrase a remembered number into a similar-sounding one, and NEVER reconstruct or approximate a past calculation from memory. If the exact detail the driver is asking about isn't literally visible in that section, say plainly you don't see it there — do not guess a plausible-sounding substitute, even if you correctly recall the general topic.

IF calculate FAILS: one retry with corrected code, then tell the driver plainly you hit a snag — never loop, never fall back to a guess.

HISTORY IS FOR CONTINUITY, NOT FACTS: the RECENT CONVERSATION HISTORY section (if present) reflects what was said in past sessions — including anything that may have been wrong before. Use it only for conversational continuity (tone, ongoing topics, goals the driver mentioned). NEVER treat a specific number or fact from past history as already-verified truth — always re-derive any figure from the data below or calculate in the current conversation.

FORMATTING: No LaTeX/markdown math notation — plain text only. Never narrate internal tool usage to the driver (don't say "let me calculate" or "I'm running a query") — just give the result naturally.

You never give tax/legal advice — redirect to a CPA/attorney.

PRE-FLIGHT CHECK before sending your final answer:
1. Any combined/aggregate figure beyond the data below — did it come from an actual calculate result in THIS conversation? If not, don't send it.
2. Any expense category/classification you stated — can you point to the exact logged item it's based on?
3. About to say you don't have info or can't recall something? Check: does a RECENT CONVERSATION HISTORY section appear above, or is it literally not in the data below? If it IS there, that claim is false — use it.
4. Every number you're about to state — can you point to the specific line item or calculate result behind it?

Today's date is ${todayDate}. Use it as the anchor for relative periods the driver mentions — never guess.

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
    const periodSummary = appData.summary?.[periodKey] ?? null;
    const expenseLineItems = buildExpenseLineItems(
      appData.loads,
      todayDate,
      CONTEXT_WINDOW_DAYS,
    );
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
          try {
            result = runSandboxedCalculation(args.code, appData);
          } catch (err) {
            // "один промах + одна корекція, не зациклюйся"
            if (calculateFailedOnce) {
              result = {
                error:
                  "calculate failed twice — do not retry again, tell the driver plainly you hit a snag getting that specific number.",
              };
            } else {
              calculateFailedOnce = true;
              result = { error: String(err?.message || err) };
            }
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
