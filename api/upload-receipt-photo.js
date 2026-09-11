// api/upload-receipt-photo.js
// Vercel Serverless Function — приймає стиснуте фото чека (base64) і
// завантажує в Cloudflare R2 (S3-сумісне сховище, нульовий egress).
// Секретні R2-ключі живуть тільки тут, на сервері, ніколи не
// потрапляють у клієнтський код (на відміну від Firebase Storage, де
// клієнтський SDK мав би прямий доступ до бакета).
import { verifyAuth } from "./_lib/verifyAuth.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto", // R2 не використовує реальні AWS-регіони
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

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

  const { image, tripId } = req.body;
  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    return res.status(400).json({ error: "Invalid image format" });
  }
  if (!tripId || typeof tripId !== "string") {
    return res.status(400).json({ error: "Missing tripId" });
  }
  // ~5MB ліміт на стиснуте зображення — реальні стиснуті фото (1600px,
  // JPEG 0.7) важать значно менше; захист від навмисно роздутого payload.
  if (image.length > 5_000_000) {
    return res.status(413).json({ error: "Image too large" });
  }

  try {
    // Base64 dataURL → чистий бінарний Buffer для завантаження.
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const key = `users/${uid}/receipts/${tripId}/${Date.now()}.jpg`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: "image/jpeg",
      }),
    );

    // R2 не генерує публічний download URL сам по собі (бакет
    // приватний за замовчуванням) — повертаємо КЛЮЧ, не URL. Перегляд
    // фото відбуватиметься через окремий ендпоінт, що віддає файл
    // тільки автентифікованому власнику (наступний крок).
    return res.status(200).json({ key });
  } catch (err) {
    console.error("R2 upload error:", err);
    return res.status(500).json({ error: "Failed to upload photo" });
  }
}
