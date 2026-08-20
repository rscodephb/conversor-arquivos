import { loadPdfDocument } from "@/lib/pdf-worker";
import { canvasToImageBytes } from "@/lib/canvas-utils";
import type { ConversionResult, FileFormat } from "@/lib/formats";
import { MIME_TYPES } from "@/lib/formats";
import { stemOf } from "@/lib/bytes";

export async function convertPdfToImages(
  file: File,
  target: Extract<FileFormat, "png" | "jpg">,
  onProgress?: (value: number) => void,
): Promise<ConversionResult[]> {
  const pdf = await loadPdfDocument(await file.arrayBuffer());
  const results: ConversionResult[] = [];
  const base = stemOf(file.name);
  const mimeType = target === "jpg" ? "image/jpeg" : "image/png";
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas indisponível.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, canvas, viewport }).promise;
    const bytes = await canvasToImageBytes(canvas, mimeType);
    results.push({
      filename: `${base}-pagina-${pageNumber}.${target}`,
      bytes,
      mimeType: target === "jpg" ? MIME_TYPES.jpg : MIME_TYPES.png,
    });
    onProgress?.(pageNumber / pdf.numPages);
  }
  return results;
}

export async function convertPdfToPngs(
  file: File,
  onProgress?: (value: number) => void,
): Promise<ConversionResult[]> {
  return convertPdfToImages(file, "png", onProgress);
}
