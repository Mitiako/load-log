// src/data/storage.js
// Firebase Storage — стиснення й завантаження фото чеків/документів.
// Профіль (truck/trailer/CDL) свідомо лишається на base64-в-Firestore
// (фіксована кількість фото, окрема усталена система) — це тільки для
// НЕОБМЕЖЕНОЇ кількості записів (чек на кожну заправку/витрату/лоуд).
import { storage } from "../firebase";
import { ref, uploadString, getDownloadURL } from "firebase/storage";

// Стискає зображення в браузері ПЕРЕД завантаженням: максимум 1600px
// по довшій стороні, JPEG якість 0.7. Це і зменшує розмір у Storage, і
// зменшує трафік — водій не тягне мегабайти на кожен перегляд.
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

// Завантажує стиснуте фото в Storage за шляхом
// users/{uid}/receipts/{tripId}/{timestamp}.jpg і повертає ПОСТІЙНИЙ
// download URL — саме його зберігаємо в Firestore-записі витрати
// (не сам файл), тому <img> вантажить повний розмір лише коли водій
// реально відкриє перегляд, а не при кожному завантаженні лоуда.
export async function uploadReceiptPhoto(uid, tripId, dataUrl) {
  const compressed = await compressImage(dataUrl);
  const path = `users/${uid}/receipts/${tripId}/${Date.now()}.jpg`;
  const storageRef = ref(storage, path);
  await uploadString(storageRef, compressed, "data_url");
  return getDownloadURL(storageRef);
}
