// api/_lib/verifyAuth.js
// Спільна утиліта перевірки Firebase ID token — підключається на початку
// кожної serverless-функції, яка має бути доступна лише залогіненим водіям.
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Ініціалізація винесена в окрему функцію і викликається ЛІНИВО, всередині
// verifyAuth() — не на верхньому рівні модуля. Якщо ключ невалідний,
// помилка тепер потрапляє в наш власний try/catch (JSON-відповідь),
// а не валить увесь модуль до необробленого краху (FUNCTION_INVOCATION_FAILED).
function ensureInitialized() {
  if (getApps().length) return;
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

/**
 * Перевіряє Authorization: Bearer <idToken> заголовок запиту.
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<string>} uid залогіненого користувача
 * @throws {Error} якщо токен відсутній або невалідний
 */
export async function verifyAuth(req) {
  ensureInitialized();

  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    throw new Error("Missing Authorization header");
  }
  const idToken = match[1];
  const decoded = await getAuth().verifyIdToken(idToken);
  return decoded.uid;
}
