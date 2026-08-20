import { PDFDocument } from "pdf-lib";
import { rasterFileToPngOrJpeg } from "@/lib/canvas-utils";
import type { ConversionResult } from "@/lib/formats";
import { MIME_TYPES } from "@/lib/formats";
import { replaceExtension, stemOf } from "@/lib/bytes";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

export async function convertImagesToPdf(
  files: File[],
  onProgress?: (value: number) => void,
): Promise<ConversionResult> {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < files.length; index += 1) {
    const encoded = await rasterFileToPngOrJpeg(files[index]);
    const image = encoded.kind === "jpeg" ? await pdf.embedJpg(encoded.bytes) : await pdf.embedPng(encoded.bytes);
    const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
    const margin = 24;
    const maxWidth = A4_WIDTH - margin * 2;
    const maxHeight = A4_HEIGHT - margin * 2;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    page.drawImage(image, {
      x: (A4_WIDTH - width) / 2,
      y: (A4_HEIGHT - height) / 2,
      width,
      height,
    });
    onProgress?.((index + 1) / files.length);
  }
  const bytes = await pdf.save();
  const filename = files.length === 1 ? replaceExtension(files[0].name, "pdf") : `${stemOf(files[0].name)}-unificado.pdf`;
  return { filename, bytes, mimeType: MIME_TYPES.pdf };
}
