// api/assistant.js
// Vercel Serverless Function — AI Chat Assistant з function calling.
// На відміну від api/chat.js (вузький, заздалегідь підготовлений зріз
// даних за 3 місяці) — цей асистент САМ вирішує коли й які дані йому
// потрібні, викликаючи широкі "getters" (getLoads/getFuelPurchases),
// які повертають СИРІ дані. Групування/порівняння/аналіз модель робить
// сама, в межах власного мислення — не через окремий tool на кожен
// можливий тип питання. uid береться ТІЛЬКИ з перевіреного токена,
// ніколи з тіла запиту — жоден tool не може торкнутись чужих даних.
import { verifyAuth } from "./_lib/verifyAuth.js";
import { getFirestore } from "firebase-admin/firestore";
import { calcLoad } from "../src/data/calc.js";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "getLoads",
      description:
        "Get the driver's own loads (trips), optionally filtered by date range and/or a city appearing anywhere on the route (pickup, delivery, or any multi-stop point). Returns raw load records including the full route, miles, weight, gross rate, driver's own gross, total expenses, net profit, and rate per mile (RPM).",
      parameters: {
        type: "object",
        properties: {
          dateFrom: {
            type: "string",
            description:
              "YYYY-MM-DD, inclusive start date. Omit for no lower bound.",
          },
          dateTo: {
            type: "string",
            description:
              "YYYY-MM-DD, inclusive end date. Omit for no upper bound.",
          },
          city: {
            type: "string",
            description:
              "Optional city name (or 'City, ST') to filter loads whose route includes this city at any stop. Omit to return all loads in the date range.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getFuelPurchases",
      description:
        "Get the driver's individual diesel fuel purchases across all loads, optionally filtered by date range. Each entry includes location, date, gallons, amount paid, discount, and net cost.",
      parameters: {
        type: "object",
        properties: {
          dateFrom: {
            type: "string",
            description:
              "YYYY-MM-DD, inclusive start date. Omit for no lower bound.",
          },
          dateTo: {
            type: "string",
            description:
              "YYYY-MM-DD, inclusive end date. Omit for no upper bound.",
          },
        },
      },
    },
  },
];

const SYSTEM_PROMPT = `You are the LoadLog AI Assistant — a business analyst built into a mobile app for a single trucking owner-operator.

You have access to two tools that return the driver's OWN raw data from the app:
- getLoads: every load (trip) the driver has logged, optionally filtered by date range and/or a city appearing anywhere on the route (including multi-stop loads). Each load includes the full route, miles, weight, gross rate, the driver's own gross, total expenses, net profit, and rate per mile (RPM).
- getFuelPurchases: every individual diesel fuel purchase across all loads, optionally filtered by date range.

Use these tools freely to answer ANY question about the driver's own trucking business — searching, filtering, grouping, comparing, calculating averages, totals, trends, or any other analysis the driver asks for. You are NOT limited to pre-defined report types — reason it through yourself using the raw data, the way a human analyst would with a spreadsheet.

Call a tool whenever you need data you don't already have in the conversation. You may call tools multiple times, including with different filters, to compare groups. Never invent, estimate, or guess any number that isn't actually present in what a tool returned — if the data needed to answer isn't available, say so honestly rather than making something up. When a conclusion is based on a small number of loads (fewer than about 5), say so explicitly rather than stating it as a confident trend.

SCOPE: You ONLY help with the driver's own trucking business data (via the tools above) and general, non-legal, non-tax trucking industry topics. You do NOT have access to external market rates, other carriers' data, or anything outside what these tools return — be upfront about that limitation when it's relevant to the question. For anything outside this scope (general knowledge, entertainment, unrelated topics), decline playfully — channel movie one-liners, witty pop-culture refusals, vary the style each time, don't repeat the same joke twice in a row — 1-2 sentences max, then redirect to what you can help with. Never use the playful refusal style for legitimate business questions, even unusual or open-ended ones — those are exactly what you're here for.

You never give specific tax or legal advice — for those, tell the driver to consult a CPA or attorney.

Keep answers conversational and appropriately concise for a mobile chat, but don't artificially shorten a genuinely detailed analysis the driver actually asked for. Match the driver's own language if they write in something other than English.`;

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

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "No messages provided" });
  }

  // Завантажуємо лоуди водія ЛІНИВО (тільки якщо модель реально
  // викличе якийсь tool) і кешуємо на час цього запиту — кілька
  // викликів getLoads/getFuelPurchases не б'ють по Firestore повторно.
  let cachedLoads = null;
  async function getAllLoadsCached() {
    if (cachedLoads === null) {
      cachedLoads = await fetchAllLoads(uid);
    }
    return cachedLoads;
  }

  try {
    const conversation = [
      { role: "system", content: SYSTEM_PROMPT },
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
        const loadsData = await getAllLoadsCached();

        for (const toolCall of msg.tool_calls) {
          let args = {};
          try {
            args = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            args = {};
          }

          let result;
          if (toolCall.function.name === "getLoads") {
            result = runGetLoads(loadsData, args);
          } else if (toolCall.function.name === "getFuelPurchases") {
            result = runGetFuelPurchases(loadsData, args);
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

    return res.status(200).json({ reply: finalReply });
  } catch (err) {
    console.error("Assistant error:", err);
    return res.status(500).json({ error: "Failed to get response" });
  }
}

// Дістає ВСІ лоуди водія з Firestore (сплющуючи Trips → Loads
// ієрархію), напряму через Admin SDK — verifyAuth() вже ініціалізував
// firebase-admin app, тому getFirestore() тут просто перевикористовує
// той самий інстанс, без повторної ініціалізації.
async function fetchAllLoads(uid) {
  const db = getFirestore();
  const tripsSnap = await db
    .collection("users")
    .doc(uid)
    .collection("trips")
    .get();

  const loads = [];
  tripsSnap.forEach((doc) => {
    const trip = doc.data();
    (trip.loads || []).forEach((load) => {
      loads.push({ tripId: doc.id, ...load });
    });
  });
  return loads;
}

function matchesCity(load, cityQuery) {
  if (!cityQuery) return true;
  const q = cityQuery.toLowerCase();
  const candidates = [
    load.from,
    load.to,
    ...(load.extraPickups || []).map((p) => p.city),
    ...(load.extraDeliveries || []).map((d) => d.city),
  ].filter(Boolean);
  return candidates.some((c) => c.toLowerCase().includes(q));
}

function runGetLoads(allLoads, args) {
  const { dateFrom, dateTo, city } = args || {};
  const filtered = allLoads.filter((load) => {
    if (dateFrom && load.date < dateFrom) return false;
    if (dateTo && load.date > dateTo) return false;
    if (city && !matchesCity(load, city)) return false;
    return true;
  });

  return filtered.map((load) => {
    const c = calcLoad(load);
    return {
      date: load.date,
      from: load.from,
      to: load.to,
      extraPickups: (load.extraPickups || [])
        .map((p) => p.city)
        .filter(Boolean),
      extraDeliveries: (load.extraDeliveries || [])
        .map((d) => d.city)
        .filter(Boolean),
      miles: load.miles,
      deadhead: load.dh || 0,
      weight: load.weight || 0,
      gross: load.gross,
      yourGross: Math.round(c.myGross),
      totalExpenses: Math.round(c.fuelActual + c.otherExp),
      netProfit: Math.round(c.net),
      ratePerMile: Number(c.ppm.toFixed(2)),
    };
  });
}

function runGetFuelPurchases(allLoads, args) {
  const { dateFrom, dateTo } = args || {};
  const purchases = [];

  for (const load of allLoads) {
    for (const d of load.diesel || []) {
      const purchaseDate = d.date || load.date;
      if (dateFrom && purchaseDate < dateFrom) continue;
      if (dateTo && purchaseDate > dateTo) continue;
      purchases.push({
        date: purchaseDate,
        location: d.location || null,
        gallons: Number(d.gallons) || 0,
        amount: Number(d.amount) || 0,
        discount: Number(d.discount) || 0,
        netCost: (Number(d.amount) || 0) - (Number(d.discount) || 0),
        loadRoute: `${load.from} → ${load.to}`,
      });
    }
  }
  return purchases;
}
