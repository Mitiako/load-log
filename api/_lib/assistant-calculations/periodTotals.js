// api/_lib/assistant-calculations/periodTotals.js
// Детерміновані підсумки по expenseLineItems — рахує КОД, не модель.
// Той самий принцип, що вже застосований у getAppData.js computeSummary:
// готове число прибирає можливість арифметичної помилки повністю,
// незалежно від того, чи модель "вирішить" рахувати сама правильно.
export function computePeriodTotals(expenseLineItems) {
  const items = expenseLineItems || [];

  const totalExpenses = items.reduce((s, i) => s + (i.amount || 0), 0);
  const fuelTotal = items
    .filter((i) => i.type === "fuel")
    .reduce((s, i) => s + (i.amount || 0), 0);
  const otherTotal = items
    .filter((i) => i.type === "other")
    .reduce((s, i) => s + (i.amount || 0), 0);

  return {
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    fuelTotal: Math.round(fuelTotal * 100) / 100,
    otherTotal: Math.round(otherTotal * 100) / 100,
    expenseCount: items.length,
  };
}
