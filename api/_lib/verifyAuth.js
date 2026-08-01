// api/_lib/verifyAuth.js
// Спільна утиліта перевірки Firebase ID token + App Check token —
// підключається на початку кожної serverless-функції.
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getAppCheck } from "firebase-admin/app-check";

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
 * Перевіряє App Check token (ЩО це реальний застосунок) і
 * Authorization: Bearer <idToken> (ХТО робить запит).
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<string>} uid залогіненого користувача
 * @throws {Error} якщо будь-яка з перевірок не пройшла
 */
export async function verifyAuth(req) {
  ensureInitialized();

  const appCheckToken = req.headers["x-firebase-appcheck"];
  if (!appCheckToken) {
    throw new Error("Missing App Check token");
  }
  await getAppCheck().verifyToken(appCheckToken);

  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    throw new Error("Missing Authorization header");
  }
  const idToken = match[1];
  // Другий параметр true — обов'язково перевіряти чи токен не був
  // відкликаний (revokeRefreshTokens). Без нього перевірка відкликання
  // не має жодного ефекту, токен лишається дійсним до природного exp.
  const decoded = await getAuth().verifyIdToken(idToken, true);
  return decoded.uid;
}
