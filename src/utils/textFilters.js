// textFilters.js
// Прибирає кирилицю з рядка (для полів, де очікується тільки латиниця — адреси, назви у US-документах)
export function stripCyrillic(value) {
  return value.replace(/[\u0400-\u04FF]/g, "");
}
