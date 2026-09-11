// api/get-receipt-photo.js
// Vercel Serverless Function — віддає приватне фото чека з R2 тільки
// автентифікованому власнику. Ключ файлу завжди починається з
// users/{uid}/... — звіряємо його з uid із перевіреного токена, щоб
// водій не міг підставити чужий ключ і побачити не своє фото.
import { verifyAuth } from "./_lib/verifyAuth.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let uid;
  try {
    uid = await verifyAuth(req);
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { key } = req.query;
  if (!key || typeof key !== "string") {
    return res.status(400).json({ error: "Missing key" });
  }
  // Захист від "чужого" ключа: файл водія завжди лежить під
  // users/{його власний uid}/... — якщо префікс не збігається,
  // відмовляємо, незалежно від того, чи такий файл реально існує.
  if (!key.startsWith(`users/${uid}/`)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const result = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      }),
    );

    res.setHeader("Content-Type", result.ContentType || "image/jpeg");
    // Кешуємо на клієнті годину — фото чека не змінюється після
    // завантаження, немає сенсу тягнути його з R2 повторно щоразу.
    res.setHeader("Cache-Control", "private, max-age=3600");

    const chunks = [];
    for await (const chunk of result.Body) chunks.push(chunk);
    res.status(200).send(Buffer.concat(chunks));
  } catch (err) {
    console.error("R2 get error:", err);
    return res.status(404).json({ error: "Photo not found" });
  }
}
