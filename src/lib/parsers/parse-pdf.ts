import { OPS } from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { loadPdfDocument } from "@/lib/pdf-worker";
import { canvasToPngBytes, flattenCanvasOntoWhite } from "@/lib/canvas-utils";
import { bytesToBase64 } from "@/lib/bytes";
import type { DocumentModel, DocumentBlock } from "@/lib/document-model";

interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  height: number;
}

function isTextItem(item: unknown): item is TextItem {
  return typeof item === "object" && item !== null && "str" in item && "transform" in item;
}

function groupLines(items: PdfTextItem[]): string[] {
  const sorted = [...items].sort((a, b) => (Math.abs(a.y - b.y) > 2 ? b.y - a.y : a.x - b.x));
  const lines: string[] = [];
  let currentY = Number.NaN;
  let current: PdfTextItem[] = [];
  for (const item of sorted) {
    if (Number.isNaN(currentY) || Math.abs(item.y - currentY) <= Math.max(item.height, 4) * 0.6) {
      current.push(item);
      currentY = Number.isNaN(currentY) ? item.y : currentY;
      continue;
    }
    lines.push(current.sort((a, b) => a.x - b.x).map((entry) => entry.str).join("").trim());
    current = [item];
    currentY = item.y;
  }
  if (current.length > 0) {
    lines.push(current.sort((a, b) => a.x - b.x).map((entry) => entry.str).join("").trim());
  }
  return lines.filter((line) => line.length > 0);
}

async function extractPageImages(page: Awaited<ReturnType<Awaited<ReturnType<typeof loadPdfDocument>>["getPage"]>>): Promise<DocumentBlock[]> {
  const blocks: DocumentBlock[] = [];
  try {
    const operatorList = await page.getOperatorList();
    for (let index = 0; index < operatorList.fnArray.length; index += 1) {
      if (operatorList.fnArray[index] !== OPS.paintImageXObject) continue;
      const name = operatorList.argsArray[index]?.[0];
      if (typeof name !== "string") continue;
      const image = page.objs.get(name) as { width?: number; height?: number; data?: Uint8ClampedArray | Uint8Array } | undefined;
      if (!image?.width || !image.height || !image.data) continue;
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      if (!context) continue;
      const pixels = image.data.length === image.width * image.height * 4
        ? new Uint8ClampedArray(image.data)
        : expandRgbToRgba(image.data, image.width, image.height);
      context.putImageData(new ImageData(pixels, image.width, image.height), 0, 0);
      const bytes = await canvasToPngBytes(flattenCanvasOntoWhite(canvas));
      blocks.push({ type: "image", bytes, mimeType: "image/png" });
    }
  } catch {
    return blocks;
  }
  return blocks;
}

function expandRgbToRgba(data: Uint8ClampedArray | Uint8Array, width: number, height: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    rgba[index * 4] = data[index * 3] ?? 0;
    rgba[index * 4 + 1] = data[index * 3 + 1] ?? 0;
    rgba[index * 4 + 2] = data[index * 3 + 2] ?? 0;
    rgba[index * 4 + 3] = 255;
  }
  return rgba;
}

async function renderPagePng(page: Awaited<ReturnType<Awaited<ReturnType<typeof loadPdfDocument>>["getPage"]>>): Promise<Uint8Array> {
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponível.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, canvas, viewport }).promise;
  return canvasToPngBytes(canvas);
}

export async function parsePdfToModel(
  bytes: ArrayBuffer,
  onProgress?: (value: number) => void,
): Promise<DocumentModel> {
  const pdf = await loadPdfDocument(bytes);
  const blocks: DocumentBlock[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items: PdfTextItem[] = content.items.filter(isTextItem).map((item) => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
      height: item.height || 10,
    }));
    const lines = groupLines(items);
    if (lines.length < 1) {
      const png = await renderPagePng(page);
      blocks.push({ type: "image", bytes: png, mimeType: "image/png" });
    } else {
      lines.forEach((line) => blocks.push({ type: "paragraph", spans: [{ text: line }] }));
      const images = await extractPageImages(page);
      blocks.push(...images);
    }
    onProgress?.(pageNumber / pdf.numPages);
  }
  return { blocks };
}

export async function parsePdfToHtml(
  bytes: ArrayBuffer,
  onProgress?: (value: number) => void,
): Promise<string> {
  const model = await parsePdfToModel(bytes, onProgress);
  return modelToSimpleHtml(model);
}

function modelToSimpleHtml(model: DocumentModel): string {
  return model.blocks
    .map((block) => {
      if (block.type === "paragraph" || block.type === "heading" || block.type === "list-item") {
        const text = block.spans.map((span) => span.text).join("");
        return `<p>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`;
      }
      if (block.type === "image") {
        return `<p><img src="data:${block.mimeType};base64,${bytesToBase64(block.bytes)}" alt="" /></p>`;
      }
      if (block.type !== "table") return "";
      const rows = block.rows
        .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
        .join("");
      return `<table>${rows}</table>`;
    })
    .join("");
}
