// authFetch.js
// Обгортка над fetch для викликів до наших api/*.js — автоматично додає
// Authorization: Bearer <idToken> і App Check токен, щоб бекенд міг
// перевірити і ХТО робить запит, і ЩО це реальний застосунок.
import { auth, appCheck } from "../firebase";
import { getToken } from "firebase/app-check";

export async function authFetch(url, options = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not signed in");
  }
  const idToken = await user.getIdToken();
  const appCheckResult = await getToken(appCheck, /* forceRefresh= */ false);

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${idToken}`,
      "X-Firebase-AppCheck": appCheckResult.token,
    },
  });
}
