import { PDFDocument } from "pdf-lib";
import type { ConversionResult } from "@/lib/formats";
import { MIME_TYPES } from "@/lib/formats";
import { stemOf } from "@/lib/bytes";

export async function mergePdfs(files: File[], onProgress?: (value: number) => void): Promise<ConversionResult> {
  const merged = await PDFDocument.create();
  for (let index = 0; index < files.length; index += 1) {
    const source = await PDFDocument.load(await files[index].arrayBuffer());
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
    onProgress?.((index + 1) / files.length);
  }
  const bytes = await merged.save();
  return {
    filename: `${stemOf(files[0].name)}-unificado.pdf`,
    bytes,
    mimeType: MIME_TYPES.pdf,
  };
}
