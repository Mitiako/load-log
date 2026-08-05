// api/_lib/assistantHistory.js
// Персистенція розмов з AI Assistant + автоматичний "дайджест" останніх
// сесій, який підмішується в системний промпт на початку НОВОЇ розмови —
// водій нічого не робить, асистент сам бачить коротке нагадування що
// обговорювалось раніше, без явного нагадування з боку водія.
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const MAX_RECENT_CHATS = 4;
const MAX_DIGEST_CHARS_PER_CHAT = 350;

/**
 * Дістає компактний текстовий дайджест останніх розмов водія (крім
 * поточної, яку ще не збережено) — для підмішування в системний промпт.
 * @returns {Promise<string|null>} null якщо історії ще немає взагалі
 */
export async function getRecentHistoryDigest(uid, excludeChatId) {
  const db = getFirestore();
  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("assistantChats")
    .orderBy("updatedAt", "desc")
    .limit(MAX_RECENT_CHATS + 1)
    .get();

  const chats = [];
  snap.forEach((doc) => {
    if (doc.id === excludeChatId) return;
    if (chats.length >= MAX_RECENT_CHATS) return;
    chats.push(doc.data());
  });

  if (chats.length === 0) return null;

  const parts = chats.map((chat) => {
    const dateLabel = chat.updatedAt?.toDate
      ? chat.updatedAt.toDate().toISOString().split("T")[0]
      : "unknown date";
    const text = (chat.messages || [])
      .map((m) => `${m.role === "user" ? "Driver" : "Assistant"}: ${m.content}`)
      .join("\n");
    const trimmed =
      text.length > MAX_DIGEST_CHARS_PER_CHAT
        ? text.slice(0, MAX_DIGEST_CHARS_PER_CHAT) + "…"
        : text;
    return `[${dateLabel}]\n${trimmed}`;
  });

  return parts.join("\n\n");
}

/**
 * Зберігає (чи оновлює) повну розмову — викликається після кожної
 * відповіді асистента, щоб наступного разу її можна було і прочитати
 * (водій вручну), і врахувати автоматично (дайджест вище).
 */
export async function saveConversation(uid, chatId, messages) {
  const db = getFirestore();
  await db
    .collection("users")
    .doc(uid)
    .collection("assistantChats")
    .doc(chatId)
    .set(
      {
        messages,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}
