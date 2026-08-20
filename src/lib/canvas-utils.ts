import { createBlob } from "@/lib/bytes";

export async function canvasToImageBytes(
  canvas: HTMLCanvasElement,
  mimeType: "image/png" | "image/jpeg",
): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => {
        if (!value) {
          reject(new Error("Falha ao exportar imagem."));
          return;
        }
        resolve(value);
      },
      mimeType,
      mimeType === "image/jpeg" ? 0.92 : undefined,
    );
  });
  return new Uint8Array(await blob.arrayBuffer());
}

export async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return canvasToImageBytes(canvas, "image/png");
}

export function flattenCanvasOntoWhite(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d");
  if (!context) return source;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0);
  return canvas;
}

export async function decodeImage(bytes: Uint8Array, mimeType: string): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(createBlob(bytes, mimeType));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function rasterFileToPngOrJpeg(
  file: File,
): Promise<{ bytes: Uint8Array; kind: "png" | "jpeg"; width: number; height: number }> {
  const isJpeg = file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name);
  const isPng = file.type === "image/png" || /\.png$/i.test(file.name);
  if (isJpeg || isPng) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const image = await decodeImage(bytes, isJpeg ? "image/jpeg" : "image/png");
    return {
      bytes,
      kind: isJpeg ? "jpeg" : "png",
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  }
  const sourceBytes = new Uint8Array(await file.arrayBuffer());
  const image = await decodeImage(sourceBytes, file.type || "image/png");
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || 1;
  canvas.height = image.naturalHeight || 1;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponível neste dispositivo.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);
  const bytes = await canvasToPngBytes(canvas);
  return { bytes, kind: "png", width: canvas.width, height: canvas.height };
}

export async function readImageSize(
  bytes: Uint8Array,
  mimeType: string,
): Promise<{ width: number; height: number }> {
  const image = await decodeImage(bytes, mimeType);
  return { width: image.naturalWidth, height: image.naturalHeight };
}
