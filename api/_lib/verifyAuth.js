// api/_lib/verifyAuth.js
// Спільна утиліта перевірки Firebase ID token — підключається на початку
// кожної serverless-функції, яка має бути доступна лише залогіненим водіям.
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Ініціалізуємо Admin SDK лише один раз (Vercel може перевикористовувати
// той самий процес між викликами — повторна ініціалізація впаде з помилкою).
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Vercel зберігає \n як буквальні два символи в env-змінній —
      // повертаємо їх у справжні переноси рядка, інакше ключ невалідний.
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
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    throw new Error("Missing Authorization header");
  }
  const idToken = match[1];
  const decoded = await getAuth().verifyIdToken(idToken);
  return decoded.uid;
}
