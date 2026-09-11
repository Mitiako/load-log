// src/data/storage.js
// Завантаження й перегляд фото чеків через Cloudflare R2 (не Firebase
// Storage — той вимагає платного Blaze-плану лише для активації).
// Стиснення відбувається тут, на клієнті, ПЕРЕД відправкою на сервер —
// самі R2-ключі ніколи не потрапляють у клієнтський код, весь
// фактичний upload/download проходить через наші authFetch-ендпоінти.
import { authFetch } from "../utils/authFetch";

// Стискає зображення в браузері: максимум 1600px по довшій стороні,
// JPEG якість 0.7. Зменшує розмір і в R2, і трафік при перегляді.
export function compressImage(dataUrl, maxDimension = 1600, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else if (height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// Стискає й завантажує фото чека, повертає КЛЮЧ файлу в R2 (не URL —
// бакет приватний, перегляд відбувається через getReceiptPhotoUrl).
export async function uploadReceiptPhoto(tripId, dataUrl) {
  const compressed = await compressImage(dataUrl);
  const res = await authFetch("/api/upload-receipt-photo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: compressed, tripId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.key;
}

// Перетворює збережений R2-ключ на тимчасовий blob-URL для показу в
// <img>. Викликається лише коли водій РЕАЛЬНО відкриває перегляд —
// не при завантаженні лоуда, тому немає зайвого трафіку.
export async function getReceiptPhotoUrl(key) {
  const res = await authFetch(
    `/api/get-receipt-photo?key=${encodeURIComponent(key)}`,
    { method: "GET" },
  );
  if (!res.ok) throw new Error("Failed to load photo");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
