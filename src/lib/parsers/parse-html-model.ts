import type { DocumentBlock, DocumentModel, TextSpan } from "@/lib/document-model";
import { parseDataUrl } from "@/lib/parse-data-url";

function collectSpans(root: Node): TextSpan[] {
  const spans: TextSpan[] = [];
  function visit(node: Node, style: { bold?: boolean; italic?: boolean; underline?: boolean }): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text.length > 0) spans.push({ text, ...style });
      return;
    }
    if (!(node instanceof HTMLElement)) {
      node.childNodes.forEach((child) => visit(child, style));
      return;
    }
    const next = { ...style };
    const tag = node.tagName;
    if (tag === "STRONG" || tag === "B") next.bold = true;
    if (tag === "EM" || tag === "I") next.italic = true;
    if (tag === "U") next.underline = true;
    node.childNodes.forEach((child) => visit(child, next));
  }
  visit(root, {});
  return spans.length > 0 ? spans : [{ text: "" }];
}

function pushTable(element: HTMLTableElement, blocks: DocumentBlock[]): void {
  const rows: string[][] = [];
  element.querySelectorAll("tr").forEach((row) => {
    const cells: string[] = [];
    row.querySelectorAll("th,td").forEach((cell) => {
      cells.push((cell.textContent ?? "").trim());
    });
    if (cells.length > 0) rows.push(cells);
  });
  if (rows.length > 0) blocks.push({ type: "table", rows });
}

export function parseHtmlToModel(html: string): DocumentModel {
  const documentRef = new DOMParser().parseFromString(html, "text/html");
  const blocks: DocumentBlock[] = [];
  function visit(node: Node): void {
    if (!(node instanceof HTMLElement)) {
      node.childNodes.forEach((child) => visit(child));
      return;
    }
    const tag = node.tagName;
    if (/^H[1-6]$/.test(tag)) {
      blocks.push({ type: "heading", level: Number(tag[1]), spans: collectSpans(node) });
      return;
    }
    if (tag === "P") {
      blocks.push({ type: "paragraph", spans: collectSpans(node) });
      node.querySelectorAll("img").forEach((image) => visit(image));
      return;
    }
    if (tag === "LI") {
      blocks.push({ type: "list-item", listKind: "bullet", spans: collectSpans(node) });
      return;
    }
    if (tag === "TABLE") {
      pushTable(node as HTMLTableElement, blocks);
      return;
    }
    if (tag === "IMG") {
      const parsed = parseDataUrl(node.getAttribute("src") ?? "");
      if (parsed) blocks.push({ type: "image", bytes: parsed.bytes, mimeType: parsed.mimeType });
      return;
    }
    node.childNodes.forEach((child) => visit(child));
  }
  visit(documentRef.body);
  if (blocks.length === 0) {
    const text = (documentRef.body.textContent ?? "").trim();
    if (text.length > 0) blocks.push({ type: "paragraph", spans: [{ text }] });
  }
  return { blocks };
}
