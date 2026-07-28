// authFetch.js
// Обгортка над fetch для викликів до наших api/*.js — автоматично додає
// Authorization: Bearer <idToken>, щоб бекенд міг перевірити хто робить запит.
import { auth } from "../firebase";

/**
 * Робить POST-запит до нашого API з доданим Firebase ID token.
 * Використання таке саме як fetch(url, { method: "POST", body: ... }),
 * тільки headers.Authorization додається сама.
 */
export async function authFetch(url, options = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not signed in");
  }
  const idToken = await user.getIdToken();

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${idToken}`,
    },
  });
}
