// api/logout.js
// Vercel Serverless Function — примусово відкликає ВСІ refresh-токени
// користувача. На відміну від клієнтського signOut(auth) (який просто
// стирає токен з локального сховища браузера), це реально забороняє
// серверу приймати старі токени цього користувача, навіть якщо вони
// технічно ще не протухли за часом (exp).
import { verifyAuth } from "./_lib/verifyAuth.js";
import { getAuth } from "firebase-admin/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let uid;
  try {
    uid = await verifyAuth(req);
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await getAuth().revokeRefreshTokens(uid);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Logout revoke error:", err);
    return res.status(500).json({ error: "Failed to revoke tokens" });
  }
}
