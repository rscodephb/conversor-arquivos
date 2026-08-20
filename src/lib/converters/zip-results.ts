import JSZip from "jszip";
import type { ConversionResult } from "@/lib/formats";
import { MIME_TYPES } from "@/lib/formats";

export async function zipConversionResults(
  results: ConversionResult[],
  zipName: string,
): Promise<ConversionResult> {
  const zip = new JSZip();
  results.forEach((result) => {
    zip.file(result.filename, result.bytes);
  });
  const bytes = await zip.generateAsync({ type: "uint8array" });
  return { filename: zipName, bytes, mimeType: MIME_TYPES.zip };
}
