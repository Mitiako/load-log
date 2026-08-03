// Конвертує ВСІ сторінки PDF у масив base64 JPEG для передачі в vision AI
// pdfjs-dist v6 — ESM-only пакет, воркер підключається через Vite ?url імпорт
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

// Воркер треба вказати один раз — робить парсинг PDF в окремому потоці,
// щоб не блокувати UI на важких файлах
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * Конвертує File (PDF) у масив base64 JPEG рядків, по одному на сторінку
 * (без префіксу data:image/...) — RateCon буває на 2-3 сторінках, і всі
 * вони потрібні AI для повного розпізнавання (адреси/суми часто на другій).
 * @param {File} pdfFile - файл PDF з інпута
 * @param {number} scale - масштаб рендеру, 2 = приблизно 150-200 DPI, достатньо для OCR
 * @param {number} maxPages - захист від випадково завеликого файлу
 * @returns {Promise<string[]>} масив base64 рядків JPEG, по одному на сторінку
 */
export async function pdfToImagesBase64(pdfFile, scale = 2, maxPages = 6) {
  const arrayBuffer = await pdfFile.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pageCount = Math.min(pdf.numPages, maxPages);
  const images = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");

    await page.render({ canvasContext: context, viewport }).promise;

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    images.push(dataUrl.split(",")[1]);
  }

  return images;
}
