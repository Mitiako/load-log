// src/constants/expenseCategories.js
// Централізований довідник категорій витрат — одне джерело правди для
// Analytics, LoadForm, AI Assistant і Smart Receipt Scan. Кожна
// категорія прив'язана до рядка Schedule C (Form 1040, Part II) для
// водіїв-owner-operator. Водій може додавати власні категорії поверх
// цього списку (не в цьому файлі) — цей список лише базовий/дефолтний.
export const EXPENSE_CATEGORIES = [
  { name: "Diesel", scheduleCLine: "9" },
  { name: "Truck Insurance", scheduleCLine: "15" },
  { name: "Loan Interest", scheduleCLine: "16b" },
  { name: "Professional Services", scheduleCLine: "17" },
  { name: "Truck Lease Payment", scheduleCLine: "20a" },
  { name: "Repairs & Maintenance", scheduleCLine: "21" },
  { name: "Tires", scheduleCLine: "21" },
  { name: "Permits & Licenses", scheduleCLine: "23" },
  { name: "Hotel/Lodging", scheduleCLine: "24a" },
  { name: "Meals", scheduleCLine: "24b" },
  { name: "Phone, Internet, ELD", scheduleCLine: "25" },
  { name: "Scale Fees", scheduleCLine: "27a" },
  { name: "Parking", scheduleCLine: "27a" },
  { name: "Tolls", scheduleCLine: "27a" },
  { name: "Truck Wash", scheduleCLine: "27a" },
  { name: "Lumper Fees", scheduleCLine: "27a" },
  { name: "Software & Subscriptions", scheduleCLine: "27a" },
  { name: "Other", scheduleCLine: "27a" },
];

// Швидкий пошук рядка Schedule C за назвою категорії — те саме джерело
// даних, зручний доступ. Якщо категорія не знайдена (напр. кастомна
// водієм) — повертає null, а не вигадує рядок.
export function getScheduleCLine(categoryName) {
  const found = EXPENSE_CATEGORIES.find((c) => c.name === categoryName);
  return found ? found.scheduleCLine : null;
}
