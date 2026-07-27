// Конвертує перву сторінку PDF у base64 JPEG для передачі в vision AI
// pdfjs-dist v6 — ESM-only пакет, воркер підключається через Vite ?url імпорт
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

// Воркер треба вказати один раз — робить парсинг PDF в окремому потоці,
// щоб не блокувати UI на важких файлах
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * Конвертує File (PDF) у base64 JPEG рядок (без префіксу data:image/...)
 * @param {File} pdfFile - файл PDF з інпута
 * @param {number} scale - масштаб рендеру, 2 = приблизно 150-200 DPI, достатньо для OCR
 * @returns {Promise<string>} base64 рядок JPEG
 */
export async function pdfToImageBase64(pdfFile, scale = 2) {
  const arrayBuffer = await pdfFile.arrayBuffer();

  // Завантажуємо PDF-документ
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  // RateCon завжди одна сторінка — беремо першу
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale });

  // Рендеримо сторінку на canvas
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext("2d");

  await page.render({ canvasContext: context, viewport }).promise;

  // Конвертуємо canvas у base64 JPEG (без data: префіксу — його додає викликач)
  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  return dataUrl.split(",")[1];
}
