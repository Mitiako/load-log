// api/assistant.js
// Vercel Serverless Function — AI Chat Assistant з function calling.
// Асистент отримує ПОВНИЙ зріз даних водія одним широким tool-викликом
// (getAppData) і може виконувати РЕАЛЬНИЙ JS-код проти цих даних
// (calculate) для гарантовано точної арифметики — не рахує "в умі".
// uid береться ТІЛЬКИ з перевіреного токена, ніколи з тіла запиту.
import { verifyAuth } from "./_lib/verifyAuth.js";
import { getAppData } from "./_lib/getAppData.js";
import { runSandboxedCalculation } from "./_lib/sandbox.js";
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
        "Get the driver's COMPLETE data from the app in one call: every load with its full route (including multi-stop points), miles, weight, gross rate, driver's own gross, net profit, rate per mile, every individual fuel purchase, every individual non-fuel expense line item (name + amount), the driver's profile info, AND a pre-calculated 'summary' object with ready totals (load count, total gross, total net profit, total miles, average rate per mile) for last7Days, last30Days, last90Days, and allTime. Call this once, then use the calculate tool for any arithmetic beyond what summary already covers.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description:
        "Execute JavaScript code to get an EXACT calculation result over the driver's data. Use this for ANY sum, average, filter+aggregate, comparison, or other arithmetic across multiple loads/expenses that isn't already covered by the pre-computed 'summary' object from getAppData. Your code runs in a sandbox with one variable available: `data`, which has the EXACT same shape as getAppData's return value ({ loads, profile, summary }). End your code with a `return` statement for the value you want back (a number, string, array, or plain object — must be JSON-serializable). This guarantees a mathematically correct result. NEVER sum, average, or combine multiple numbers yourself in your response — always use this tool for that instead, even for what seems like simple addition across several items.",
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

function buildSystemPrompt(todayDate, historyDigest) {
  const historySection = historyDigest
    ? `\n\nRECENT CONVERSATION HISTORY (from your last few sessions with this driver — this IS real context you have access to, from persisted chat logs):\n${historyDigest}\n\nIMPORTANT: if the section above is present, you DO have information about past conversations. If the driver asks what they discussed before, or asks you to recall/remind them of something, look in this section and answer directly from it — NEVER say "I can't recall previous conversations" or similar when this section is present, that would be false.`
    : "";

  return `You are the LoadLog AI Assistant — a business analyst built into a mobile app for a single trucking owner-operator.

You have two tools:
- getAppData: returns the driver's ENTIRE dataset (every load with full multi-stop route, miles, weight, gross rate, driver's own gross, net profit, rate per mile; every individual fuel purchase; every individual non-fuel expense line item by name; the driver's profile; and a pre-calculated "summary" object with ready totals for last7Days, last30Days, last90Days, and allTime).
- calculate: runs real JavaScript code against that data and returns an exact result. Use this for ANY arithmetic across multiple items that "summary" doesn't already cover.

Use this data freely to answer ANY question about the driver's own trucking business — searching, filtering, grouping, comparing, calculating averages, totals, trends, hypothetical "what if" scenarios, or any other analysis the driver asks for. You are NOT limited to pre-defined report types — reason it through yourself, calling calculate whenever real arithmetic across multiple items is needed.

Call getAppData whenever you need data and don't already have it in the conversation. This is MANDATORY: if the driver asks anything about their own loads, expenses, fuel, earnings, or profile — you MUST actually call getAppData before answering. NEVER claim a technical error, or that you "couldn't retrieve the data", unless getAppData was actually called AND its result genuinely indicates a failure — claiming a fake error to avoid a harder question is a serious violation of the driver's trust and is never acceptable. If you called the tool and got data back, you have what you need — use it.

CALCULATION ACCURACY — this is critical: for any question requiring a total, average, count, or other combined figure across MULTIPLE loads or expenses:
1. First check if the matching field already exists in the "summary" object (last7Days/last30Days/last90Days/allTime) — if so, just use it directly.
2. Otherwise, you MUST call the calculate tool and write JS code to get the exact answer — NEVER sum, average, or combine multiple numbers yourself in your response, even if you show step-by-step work. Language models are unreliable at this kind of arithmetic, and it has caused real, confirmed errors before. The calculate tool is the ONLY acceptable source for a combined figure across multiple items beyond what summary covers.
A single value already sitting on one load (e.g. that load's own miles or RPM) doesn't need the tool — only combining/aggregating across items does.

Never invent, estimate, or guess any number, expense name, or detail that isn't actually present in what a tool returned — if something wasn't logged, say so honestly rather than approximating it from unrelated totals. This applies with EXTREME force whenever the driver asks you to list, categorize, or summarize their expenses: you must ONLY use the exact expense line items that literally appear in the otherExpenses/diesel arrays for their loads. Do NOT supplement this list with generic trucking-industry knowledge — even realistic, plausible categories like "truck payment", "insurance", "ELD subscription", or "trailer rent" must NEVER appear in your answer unless that EXACT item name is actually present in the data you retrieved. If the driver's logged expenses don't include something you'd normally expect a trucker to have, that's fine — just don't have an opinion about it, only report what's actually there. Before answering any expense-listing question, mentally verify: "is every single item I'm about to name copied directly from the tool result, or did I add it from general knowledge?" — if it's the latter for even one item, remove it.

CATEGORIZING EXPENSES: individual non-fuel expense line items only have a "name" field (whatever the driver typed) — there is no separate category field. If the driver asks which of THEIR ACTUAL logged expenses are or aren't "truck-related", infer it from each item's name using clear, consistent judgment — e.g. a tire, truck wash, or repair is truck-related; food or personal items are not; be consistent about the SAME item across the whole answer. This categorization only applies to items that are actually in the data — never add extra rows for categories the driver hasn't logged.

HISTORY IS FOR CONTINUITY, NOT FACTS: the RECENT CONVERSATION HISTORY section (if present) reflects what was said in past sessions — including anything you may have gotten wrong before. Use it only for conversational continuity (tone, ongoing topics, goals the driver mentioned). NEVER treat a specific number or fact from past history as already-verified truth — always re-derive any figure you state from getAppData/calculate in the current conversation, even if it looks like something was already established previously.

SCOPE: You ONLY help with the driver's own trucking business data (via these tools) and general, non-legal, non-tax trucking industry topics. You do NOT have access to external market rates, other carriers' data, or anything outside what these tools return — be upfront about that limitation when relevant. For anything outside this scope (general knowledge, entertainment, unrelated topics), decline playfully — channel movie one-liners, witty pop-culture refusals, vary the style each time, don't repeat the same joke twice in a row — 1-2 sentences max, then redirect to what you can help with. Never use the playful refusal style for legitimate business questions, even unusual or open-ended ones — those are exactly what you're here for.

You never give specific tax or legal advice — for those, tell the driver to consult a CPA or attorney. You do not have access to photos or scanned documents (BOL, RateCon images) — only the structured data logged in the app.

FORMATTING: Never use LaTeX or markdown math notation (no \\frac, \\left, \\right, \\text, or bracket-wrapped formulas) — this chat displays plain text only. Write arithmetic in plain, everyday form.

Be precise about WHICH time period your answer actually covers, and say so explicitly — if the driver's phrasing is ambiguous, state which interpretation you're using rather than silently picking one.

Keep answers conversational and appropriately concise for a mobile chat, but don't artificially shorten a genuinely detailed analysis the driver actually asked for. Match the driver's own language if they write in something other than English. Never narrate your internal tool usage to the driver (e.g. don't say "let me call getAppData" or "I'm running a calculation") — just give the result naturally, the way a knowledgeable person would, not a description of your own process.

IF A TOOL CALL FAILS: allow yourself exactly ONE retry with corrected input. If it fails again, tell the driver plainly that you hit a snag getting that specific data, rather than looping indefinitely or falling back to a guess.

PRE-FLIGHT CHECK — before sending your final answer, verify each of these:
1. Any combined/aggregate figure (a sum, average, or total across multiple loads or expenses) — did it come from the "summary" object or an actual calculate tool result in THIS conversation? If you arrived at it any other way, don't send it — get it from calculate first.
2. Any expense category or classification you stated — can you point to the EXACT logged item(s) it's based on? If you're unsure whether an item is genuinely in the data or just sounds plausible for a trucking business, leave it out.
3. About to say you don't have information, can't recall something, or don't have access to data? First check: does a RECENT CONVERSATION HISTORY section appear above, or did you already call a relevant tool this conversation? If so, that claim is false — use what you actually have instead.
4. Every number you're about to state — could you point to the specific load, expense line, or calculate result it came from? If not, don't state it.

Today's date is ${todayDate}. Use this as the anchor for any relative date range the driver mentions — never guess today's date from your own training knowledge.${historySection}`;
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

  let cachedData = null;
  async function getAppDataCached() {
    if (cachedData === null) {
      cachedData = await getAppData(uid, todayDate);
    }
    return cachedData;
  }

  try {
    const sanitizedMessages = messages.map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : "",
    }));

    const historyDigest = await getRecentHistoryDigest(uid, activeChatId);

    const conversation = [
      { role: "system", content: buildSystemPrompt(todayDate, historyDigest) },
      ...sanitizedMessages,
    ];
    let finalReply = null;
    const MAX_ITERATIONS = 6;

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
          if (toolCall.function.name === "getAppData") {
            result = await getAppDataCached();
          } else if (toolCall.function.name === "calculate") {
            const appData = await getAppDataCached();
            result = runSandboxedCalculation(args.code, appData);
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

    try {
      await saveConversation(uid, activeChatId, [
        ...messages,
        { role: "assistant", content: finalReply },
      ]);
    } catch (err) {
      console.error("Failed to save conversation:", err);
    }

    return res.status(200).json({ reply: finalReply, chatId: activeChatId });
  } catch (err) {
    console.error("Assistant error:", err);
    return res.status(500).json({ error: "Failed to get response" });
  }
}
