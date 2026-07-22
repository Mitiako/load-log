// analytics.js
// Агрегація даних по лоудах для екрана Analytics.
// Working тиждень — календарний (нд-сб).

import { calcLoad } from "./calc";

export function flattenLoads(trips) {
  return (trips || []).flatMap((trip, tripIdx) =>
    (trip.loads || []).map((load, loadIdx) => ({
      ...load,
      tripIdx,
      loadIdx,
      ...calcLoad(load),
    })),
  );
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function startOfMonth(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function parseLoadDate(dateStr) {
  return dateStr ? new Date(dateStr + "T12:00:00") : null;
}

export function summarize(loads) {
  const gross = loads.reduce((s, l) => s + (Number(l.gross) || 0), 0);
  const yourShare = loads.reduce((s, l) => s + l.myGross, 0);
  const brokerCut = loads.reduce((s, l) => s + l.cut, 0);
  const fuel = loads.reduce((s, l) => s + l.fuelActual, 0);
  const otherExp = loads.reduce((s, l) => s + l.otherExp, 0);
  const net = loads.reduce((s, l) => s + l.net, 0);
  const miles = loads.reduce((s, l) => s + l.totalMiles, 0);
  const rpm = miles > 0 ? net / miles : 0;
  const margin = gross > 0 ? (net / gross) * 100 : 0;
  return {
    gross,
    yourShare,
    brokerCut,
    fuel,
    otherExp,
    expenses: fuel + otherExp,
    net,
    miles,
    rpm,
    margin,
    loadCount: loads.length,
  };
}

// % зміна поточного періоду відносно попереднього.
// null означає "немає з чим порівнювати" (в попередньому періоді 0 лоудів).
export function pctChange(current, previous) {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function getAnalytics(trips) {
  const loads = flattenLoads(trips).filter((l) => l.date);
  const now = new Date();

  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = addMonths(thisMonthStart, -1);

  const inRange = (l, start, end) => {
    const d = parseLoadDate(l.date);
    return d && d >= start && d < end;
  };

  const thisWeek = loads.filter((l) =>
    inRange(l, thisWeekStart, addDays(thisWeekStart, 7)),
  );
  const lastWeek = loads.filter((l) =>
    inRange(l, lastWeekStart, thisWeekStart),
  );
  const thisMonth = loads.filter((l) =>
    inRange(l, thisMonthStart, addMonths(thisMonthStart, 1)),
  );
  const lastMonth = loads.filter((l) =>
    inRange(l, lastMonthStart, thisMonthStart),
  );

  // Останні 8 календарних тижнів для графіка, від найстарішого до найновішого
  const weeklyChart = [];
  for (let i = 7; i >= 0; i--) {
    const start = addDays(thisWeekStart, -7 * i);
    const end = addDays(start, 7);
    const weekLoads = loads.filter((l) => inRange(l, start, end));
    weeklyChart.push({
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      net: Math.round(summarize(weekLoads).net),
    });
  }

  return {
    hasData: loads.length > 0,
    thisWeek: summarize(thisWeek),
    lastWeek: summarize(lastWeek),
    thisMonth: summarize(thisMonth),
    lastMonth: summarize(lastMonth),
    weeklyChart,
  };
}

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Дані для навігованого по тижнях екрана (weekOffset: 0 = поточний тиждень, -1 = минулий, +1 = наступний)
export function getWeekBreakdown(trips, weekOffset = 0) {
  const loads = flattenLoads(trips).filter((l) => l.date);
  const now = new Date();
  const currentWeekStart = startOfWeek(now);
  const weekStart = addDays(currentWeekStart, weekOffset * 7);
  const weekEnd = addDays(weekStart, 6);

  const dayMeta = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    dayMeta.push({ dateStr: toDateStr(d), date: d });
  }
  const weekDateStrs = dayMeta.map((d) => d.dateStr);
  const weekLoads = loads.filter((l) => weekDateStrs.includes(l.date));

  const days = dayMeta.map(({ dateStr, date }) => {
    const dayLoads = weekLoads.filter((l) => l.date === dateStr);
    return {
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
      net: Math.round(summarize(dayLoads).net),
      loads: dayLoads.map((l) => ({
        tripIdx: l.tripIdx,
        loadIdx: l.loadIdx,
        from: l.from,
        to: l.to,
        net: l.net,
      })),
    };
  });

  // Реальні рядки витрат, введені водієм (Description + Amount), по всіх лоудах тижня
  const otherExpenseItems = weekLoads.flatMap((l) =>
    (l.expenses || [])
      .filter((e) => Number(e.amount) > 0)
      .map((e) => ({ name: e.name || "Unnamed", amount: Number(e.amount) })),
  );

  return {
    weekStart,
    weekEnd,
    days,
    summary: summarize(weekLoads),
    otherExpenseItems,
  };
}

// Середні Fuel/Other/Miles за останні N АКТИВНИХ тижнів (тільки ті, де були лоуди),
// а не просто останні N календарних тижнів — щоб не рахувати порожні тижні простою.
export function getRecentActiveWeeksAverage(
  trips,
  weeksNeeded = 4,
  maxLookback = 26,
) {
  const loads = flattenLoads(trips).filter((l) => l.date);
  const now = new Date();
  const currentWeekStart = startOfWeek(now);

  const found = [];
  for (let i = 1; i <= maxLookback && found.length < weeksNeeded; i++) {
    const weekStart = addDays(currentWeekStart, -i * 7);
    const weekEnd = addDays(weekStart, 7);
    const weekLoads = loads.filter((l) => {
      const d = parseLoadDate(l.date);
      return d && d >= weekStart && d < weekEnd;
    });
    if (weekLoads.length > 0) {
      found.push(summarize(weekLoads));
    }
  }

  if (found.length === 0) return null;

  const totals = found.reduce(
    (acc, w) => ({
      fuel: acc.fuel + w.fuel,
      otherExp: acc.otherExp + w.otherExp,
      miles: acc.miles + w.miles,
    }),
    { fuel: 0, otherExp: 0, miles: 0 },
  );

  return {
    weeksUsed: found.length,
    avgFuel: totals.fuel / found.length,
    avgOtherExp: totals.otherExp / found.length,
    avgMiles: totals.miles / found.length,
  };
}

// Прогрес довільної тимчасової цілі асистента (не плутати з постійною
// Profile Goal) — рахується наново щоразу з реальних лоудів від дати
// старту цілі до сьогодні, нічого не "запам'ятовується" з чату.
export function getAssistantGoalProgress(trips, assistantGoal) {
  if (!assistantGoal?.amount || !assistantGoal?.startDate) return null;

  const loads = flattenLoads(trips).filter((l) => l.date);
  const start = new Date(assistantGoal.startDate + "T00:00:00");
  const now = new Date();
  const durationDays = Number(assistantGoal.durationDays) || 7;
  const end = new Date(start);
  end.setDate(end.getDate() + durationDays);

  const relevantLoads = loads.filter((l) => {
    const d = parseLoadDate(l.date);
    return d && d >= start && d < end;
  });

  const netSoFar = summarize(relevantLoads).net;
  const daysElapsed = Math.max(
    1,
    Math.min(durationDays, Math.ceil((now - start) / 86400000)),
  );
  const daysRemaining = Math.max(0, durationDays - daysElapsed);
  const projectedTotal = (netSoFar / daysElapsed) * durationDays;

  return {
    targetAmount: Number(assistantGoal.amount),
    durationDays,
    startDate: assistantGoal.startDate,
    daysElapsed,
    daysRemaining,
    netSoFar: Math.round(netSoFar),
    projectedTotal: Math.round(projectedTotal),
    onTrack: projectedTotal >= Number(assistantGoal.amount),
  };
}

// Помісячна розкладка за останні N місяців + підсумок за весь час —
// дає AI-асистенту змогу відповідати на будь-яке питання про
// конкретний місяць чи "скільки всього", без дампу кожного лоуда
// (що було б і дорого в токенах, і непотрібно детально).
export function getMonthlyBreakdown(trips, monthsBack = 12) {
  const loads = flattenLoads(trips).filter((l) => l.date);
  const now = new Date();

  const months = [];
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = d;
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const monthLoads = loads.filter((l) => {
      const ld = parseLoadDate(l.date);
      return ld && ld >= monthStart && ld < monthEnd;
    });
    if (monthLoads.length === 0) continue;
    const s = summarize(monthLoads);
    months.push({
      month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`,
      label: monthStart.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
      net: Math.round(s.net),
      gross: Math.round(s.gross),
      fuel: Math.round(s.fuel),
      otherExpenses: Math.round(s.otherExp),
      miles: Math.round(s.miles),
      loadCount: s.loadCount,
    });
  }

  const allTime = summarize(loads);

  return {
    monthlyBreakdown: months,
    allTime: {
      net: Math.round(allTime.net),
      gross: Math.round(allTime.gross),
      fuel: Math.round(allTime.fuel),
      otherExpenses: Math.round(allTime.otherExp),
      miles: Math.round(allTime.miles),
      loadCount: allTime.loadCount,
    },
  };
}

// Список конкретних рядків витрат (не агрегат!) за останні N місяців —
// кожен fuel-запис і кожен Other Expense окремо, з назвою і сумою.
// Без цього AI-асистент бачить тільки суму за місяць і не може сказати
// "на що саме" пішли гроші чи виділити конкретний нетипово-трекінговий
// запис.
export function getExpenseLineItems(trips, monthsBack = 3, limit = 100) {
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const loads = flattenLoads(trips).filter((l) => l.date);

  const items = [];
  loads.forEach((l) => {
    const d = parseLoadDate(l.date);
    if (!d || d < cutoff) return;

    (l.diesel || []).forEach((f) => {
      const amt = (Number(f.amount) || 0) - (Number(f.discount) || 0);
      if (amt > 0) {
        items.push({
          date: f.date || l.date,
          type: "fuel",
          label: f.location ? `Fuel — ${f.location}` : "Fuel",
          amount: Math.round(amt),
        });
      }
    });

    (l.expenses || []).forEach((e) => {
      const amt = Number(e.amount) || 0;
      if (amt > 0) {
        items.push({
          date: l.date,
          type: "other",
          label: e.name || "Unnamed expense",
          amount: Math.round(amt),
        });
      }
    });
  });

  items.sort((a, b) => new Date(b.date) - new Date(a.date));
  return items.slice(0, limit);
}
