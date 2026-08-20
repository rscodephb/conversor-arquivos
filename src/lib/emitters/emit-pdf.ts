import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { DocumentModel, ParagraphBlock } from "@/lib/document-model";
import { escapeHtml } from "@/lib/html-utils";
import { flattenSpans } from "@/lib/document-model";
import { parseHtmlToModel } from "@/lib/parsers/parse-html-model";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

function toWinAnsi(text: string): string {
  return Array.from(text)
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code === 9) return " ";
      if (code === 10 || code === 13) return " ";
      if (code < 32) return "";
      if (code > 255) return "?";
      return char;
    })
    .join("");
}

function wrapLine(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const sanitized = toWinAnsi(text);
  const words = sanitized.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  function commit(): void {
    if (current) lines.push(current);
    current = "";
  }
  function appendChunk(chunk: string): void {
    const trial = current ? `${current} ${chunk}` : chunk;
    if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
      current = trial;
      return;
    }
    commit();
    if (font.widthOfTextAtSize(chunk, size) <= maxWidth) {
      current = chunk;
      return;
    }
    let piece = "";
    for (const char of chunk) {
      const next = piece + char;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        piece = next;
        continue;
      }
      if (piece) lines.push(piece);
      piece = char;
    }
    current = piece;
  }
  words.forEach(appendChunk);
  commit();
  return lines.length > 0 ? lines : [""];
}

interface PdfCursor {
  page: PDFPage;
  y: number;
}

async function createPdfLayout(model: DocumentModel): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 48;
  const maxWidth = A4_WIDTH - margin * 2;
  const cursor: PdfCursor = { page: pdf.addPage([A4_WIDTH, A4_HEIGHT]), y: A4_HEIGHT - margin };
  function ensureSpace(needed: number): void {
    if (cursor.y - needed >= margin) return;
    cursor.page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
    cursor.y = A4_HEIGHT - margin;
  }
  function drawParagraph(block: ParagraphBlock): void {
    const raw = flattenSpans(block.spans).trim();
    if (raw.length === 0) return;
    const size = block.type === "heading" ? Math.max(18 - (block.level ?? 1), 12) : 11;
    const font = block.type === "heading" ? bold : regular;
    const prefix = block.type === "list-item" ? "- " : "";
    const lines = wrapLine(prefix + flattenSpans(block.spans), font, size, maxWidth);
    for (const line of lines) {
      ensureSpace(size + 4);
      cursor.page.drawText(line, { x: margin, y: cursor.y - size, size, font, color: rgb(0.11, 0.1, 0.09) });
      cursor.y -= size + 4;
    }
    cursor.y -= 6;
  }
  for (const block of model.blocks) {
    if (block.type === "paragraph" || block.type === "heading" || block.type === "list-item") {
      drawParagraph(block);
      continue;
    }
    if (block.type === "table") {
      for (const row of block.rows) {
        drawParagraph({ type: "paragraph", spans: [{ text: row.join(" | ") }] });
      }
      continue;
    }
    if (block.type !== "image") continue;
    try {
      const image = block.mimeType.includes("jpeg")
        ? await pdf.embedJpg(block.bytes)
        : await pdf.embedPng(block.bytes);
      const scale = Math.min(maxWidth / image.width, 320 / image.height, 1);
      const width = image.width * scale;
      const height = image.height * scale;
      ensureSpace(height + 12);
      cursor.page.drawImage(image, { x: margin, y: cursor.y - height, width, height });
      cursor.y -= height + 12;
    } catch {
      drawParagraph({ type: "paragraph", spans: [{ text: "[imagem omitida]" }] });
    }
  }
  return pdf.save();
}

export async function emitPdfFromHtml(html: string): Promise<Uint8Array> {
  return createPdfLayout(parseHtmlToModel(html));
}

export async function emitPdfFromModel(model: DocumentModel): Promise<Uint8Array> {
  return createPdfLayout(model);
}

export async function emitPdfFromRows(rows: string[][], title: string): Promise<Uint8Array> {
  const html = `<h1>${escapeHtml(title)}</h1><table>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("")}</table>`;
  return emitPdfFromHtml(html);
}
