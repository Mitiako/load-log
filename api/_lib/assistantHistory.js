// api/_lib/assistantHistory.js
// Персистенція розмов з AI Assistant + автоматичний "дайджест" останніх
// сесій, який підмішується в системний промпт на початку НОВОЇ розмови —
// водій нічого не робить, асистент сам бачить коротке нагадування що
// обговорювалось раніше, без явного нагадування з боку водія.
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const MAX_RECENT_CHATS = 4;
const MAX_MESSAGES_PER_CHAT = 6; // останні N повідомлень, не перші

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
    const allMessages = chat.messages || [];
    // Останні N повідомлень, не перші — водій найчастіше питає "про що
    // ми говорили", маючи на увазі кінець розмови, не її початок.
    // Якщо розмова довша за ліміт, позначаємо що це "хвіст", не все.
    const recentMessages = allMessages.slice(-MAX_MESSAGES_PER_CHAT);
    const wasTrimmed = allMessages.length > recentMessages.length;
    const text = recentMessages
      .map((m) => `${m.role === "user" ? "Driver" : "Assistant"}: ${m.content}`)
      .join("\n");
    const prefix = wasTrimmed ? "(...earlier messages omitted...)\n" : "";
    return `[${dateLabel}]\n${prefix}${text}`;
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
