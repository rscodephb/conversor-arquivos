import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PDFDocumentProxy } from "pdfjs-dist";

let isWorkerConfigured = false;

export function configurePdfWorker(): void {
  if (isWorkerConfigured) return;
  GlobalWorkerOptions.workerSrc = workerUrl;
  isWorkerConfigured = true;
}

export async function loadPdfDocument(bytes: ArrayBuffer): Promise<PDFDocumentProxy> {
  configurePdfWorker();
  const task = getDocument({ data: new Uint8Array(bytes) });
  return task.promise;
}
