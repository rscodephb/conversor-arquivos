import * as CFB from "cfb";
import { parseTextToHtml } from "@/lib/parsers/parse-text";

function toUint8(content: number[] | Uint8Array): Uint8Array {
  return content instanceof Uint8Array ? content : Uint8Array.from(content);
}

function sanitizeDocText(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000e-\u001f\u007f]/g, "")
    .replace(/[\u0007\u000b\u000c]/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
function extractPrintable(data: Uint8Array): string {
  const decoded = new TextDecoder("utf-16le").decode(data);
  const chunks: string[] = [];
  let current = "";
  for (const char of decoded) {
    const code = char.charCodeAt(0);
    const isPrintable =
      (code >= 32 && code < 127) || (code >= 160 && code < 65534) || char === "\n" || char === "\r" || char === "\t";
    if (isPrintable) {
      current += char;
      continue;
    }
    if (current.trim().length >= 4) chunks.push(current.trim());
    current = "";
  }
  if (current.trim().length >= 4) chunks.push(current.trim());
  return chunks.join("\n");
}

function readPlcPcd(word: Uint8Array, plc: Uint8Array): string {
  const pieceCount = Math.floor((plc.length - 4) / 12);
  if (pieceCount <= 0) return "";
  const view = new DataView(plc.buffer, plc.byteOffset, plc.byteLength);
  const cps: number[] = [];
  for (let index = 0; index <= pieceCount; index += 1) cps.push(view.getUint32(index * 4, true));
  const pcdOffset = (pieceCount + 1) * 4;
  const parts: string[] = [];
  for (let index = 0; index < pieceCount; index += 1) {
    const count = cps[index + 1] - cps[index];
    if (count <= 0) continue;
    const fcValue = view.getUint32(pcdOffset + index * 8 + 2, true);
    const compressed = (fcValue & 0x40000000) !== 0;
    const fc = fcValue & 0x3fffffff;
    if (compressed) {
      const start = Math.floor(fc / 2);
      parts.push(new TextDecoder("windows-1252").decode(word.subarray(start, start + count)));
      continue;
    }
    parts.push(new TextDecoder("utf-16le").decode(word.subarray(fc, fc + count * 2)));
  }
  return parts.join("").replace(/\r/g, "\n").replace(/[\u0007\u000b\u000c]/g, "\n");
}

function extractPieceTable(word: Uint8Array, table: Uint8Array, view: DataView): string {
  const fcClx = view.getUint32(0x1a2, true);
  const lcbClx = view.getUint32(0x1a6, true);
  if (lcbClx === 0 || fcClx + lcbClx > table.length) throw new Error("CLX ausente");
  const clx = table.subarray(fcClx, fcClx + lcbClx);
  let offset = 0;
  while (offset < clx.length) {
    const marker = clx[offset];
    if (marker === 0x01) {
      const skipped = clx[offset + 1] ?? 0;
      offset += 2 + skipped;
      continue;
    }
    if (marker === 0x02) {
      const length = new DataView(clx.buffer, clx.byteOffset + offset + 1, 4).getUint32(0, true);
      return readPlcPcd(word, clx.subarray(offset + 5, offset + 5 + length));
    }
    break;
  }
  throw new Error("Tabela de peças não encontrada");
}

export function parseDocToHtml(bytes: ArrayBuffer): string {
  const cfb = CFB.read(new Uint8Array(bytes), { type: "array" });
  const wordEntry = CFB.find(cfb, "WordDocument");
  if (!wordEntry) throw new Error("Arquivo DOC inválido.");
  const word = toUint8(wordEntry.content);
  const view = new DataView(word.buffer, word.byteOffset, word.byteLength);
  const flags = view.getUint16(10, true);
  const tableName = flags & 0x0200 ? "1Table" : "0Table";
  const tableEntry = CFB.find(cfb, tableName) ?? CFB.find(cfb, "1Table") ?? CFB.find(cfb, "0Table");
  let text = "";
  try {
    if (tableEntry) text = extractPieceTable(word, toUint8(tableEntry.content), view);
  } catch {
    text = "";
  }
  if (text.trim().length === 0) text = extractPrintable(word);
  if (text.trim().length === 0) throw new Error("Não foi possível extrair texto deste .doc.");
  return parseTextToHtml(sanitizeDocText(text));
}
