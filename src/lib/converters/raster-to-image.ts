import { canvasToImageBytes, decodeImage } from "@/lib/canvas-utils";
import type { ConversionResult, FileFormat } from "@/lib/formats";
import { MIME_TYPES } from "@/lib/formats";
import { replaceExtension } from "@/lib/bytes";

export async function convertRasterToImage(
  file: File,
  target: Extract<FileFormat, "png" | "jpg">,
): Promise<ConversionResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const image = await decodeImage(bytes, file.type || "image/png");
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || 1;
  canvas.height = image.naturalHeight || 1;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponível neste dispositivo.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);
  const mimeType = target === "jpg" ? "image/jpeg" : "image/png";
  const output = await canvasToImageBytes(canvas, mimeType);
  return {
    filename: replaceExtension(file.name, target === "jpg" ? "jpg" : "png"),
    bytes: output,
    mimeType: target === "jpg" ? MIME_TYPES.jpg : MIME_TYPES.png,
  };
}
