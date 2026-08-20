import { marked } from "marked";
import { sanitizeHtml } from "@/lib/html-utils";

export async function parseMarkdownToHtml(markdown: string): Promise<string> {
  const html = await marked.parse(markdown, { async: true });
  return sanitizeHtml(typeof html === "string" ? html : String(html));
}

export function parseTextToHtml(text: string): string {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return "<p></p>";
  return lines.map((line) => `<p>${escapeForHtml(line)}</p>`).join("");
}

function escapeForHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function parseHtmlFile(html: string): string {
  const documentRef = new DOMParser().parseFromString(html, "text/html");
  documentRef.querySelectorAll("script,iframe,object,embed,link,meta").forEach((node) => node.remove());
  return documentRef.body.innerHTML || `<p>${escapeForHtml(documentRef.body.textContent ?? "")}</p>`;
}

export function htmlToPlainText(html: string): string {
  const documentRef = new DOMParser().parseFromString(html, "text/html");
  return (documentRef.body.innerText ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

export function htmlToMarkdown(html: string): string {
  const documentRef = new DOMParser().parseFromString(html, "text/html");
  return walkMarkdown(documentRef.body).replace(/\n{3,}/g, "\n\n").trim();
}

function walkMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement)) {
    return Array.from(node.childNodes).map(walkMarkdown).join("");
  }
  const tag = node.tagName;
  const inner = Array.from(node.childNodes).map(walkMarkdown).join("");
  if (/^H[1-6]$/.test(tag)) return `${"#".repeat(Number(tag[1]))} ${inner.trim()}\n\n`;
  if (tag === "P") return `${inner.trim()}\n\n`;
  if (tag === "LI") return `- ${inner.trim()}\n`;
  if (tag === "BR") return "\n";
  if (tag === "STRONG" || tag === "B") return `**${inner}**`;
  if (tag === "EM" || tag === "I") return `*${inner}*`;
  return inner;
}
