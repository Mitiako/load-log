// chatContext.js
// Збирає реальні дані водія в один компактний об'єкт, який іде в
// api/chat.js як контекст для AI. Рахується наново при кожному
// відкритті чату — нічого не "пам'ятається" з попередніх розмов.
import {
  getAnalytics,
  getRecentActiveWeeksAverage,
  getAssistantGoalProgress,
} from "./analytics";

export function buildChatContext(trips, profile) {
  const analytics = getAnalytics(trips);
  const recentAvg = getRecentActiveWeeksAverage(trips, 4);

  let breakEvenRpm = null;
  if (recentAvg && recentAvg.avgMiles > 0) {
    const items = profile?.beCostItems || [];
    const monthlyFixed = items.reduce(
      (sum, it) => sum + (Number(it.amount) || 0),
      0,
    );
    const weeklyFixed = monthlyFixed / (52 / 12);
    breakEvenRpm =
      (weeklyFixed + recentAvg.avgFuel + recentAvg.avgOtherExp) /
      recentAvg.avgMiles;
  }

  const assistantGoalProgress = profile?.assistantGoal
    ? getAssistantGoalProgress(trips, profile.assistantGoal)
    : null;

  return {
    thisWeekNet: Math.round(analytics.thisWeek?.net || 0),
    thisMonthNet: Math.round(analytics.thisMonth?.net || 0),
    breakEvenRpm:
      breakEvenRpm !== null ? Number(breakEvenRpm.toFixed(2)) : null,
    profileLongTermGoal: profile?.goalType
      ? { type: profile.goalType, value: profile.goalVal }
      : null,
    assistantGoal: assistantGoalProgress,
    payMode: profile?.payMode || null,
    payVal: profile?.payVal || null,
  };
}
