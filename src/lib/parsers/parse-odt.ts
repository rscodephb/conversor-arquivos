import JSZip from "jszip";
import { escapeHtml } from "@/lib/html-utils";
import { bytesToBase64 } from "@/lib/bytes";

function childrenToHtml(element: Element, zip: JSZip): string {
  return Array.from(element.childNodes)
    .map((child) => odtNodeToHtml(child, zip))
    .join("");
}

function odtNodeToHtml(node: Node, zip: JSZip): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent ?? "");
  if (!(node instanceof Element)) return "";
  const name = node.localName;
  if (name === "p") return `<p>${childrenToHtml(node, zip)}</p>`;
  if (name === "h") {
    const level = Math.min(6, Math.max(1, Number(node.getAttribute("text:outline-level") ?? "1")));
    return `<h${level}>${childrenToHtml(node, zip)}</h${level}>`;
  }
  if (name === "span" || name === "a") return childrenToHtml(node, zip);
  if (name === "s") return "&nbsp;".repeat(Number(node.getAttribute("text:c") ?? "1"));
  if (name === "line-break" || name === "tab") return name === "tab" ? "&emsp;" : "<br/>";
  if (name === "list") return `<ul>${childrenToHtml(node, zip)}</ul>`;
  if (name === "list-item") return `<li>${childrenToHtml(node, zip)}</li>`;
  if (name === "table") return `<table>${childrenToHtml(node, zip)}</table>`;
  if (name === "table-row") return `<tr>${childrenToHtml(node, zip)}</tr>`;
  if (name === "table-cell" || name === "table-header-cell") {
    return `<td>${childrenToHtml(node, zip)}</td>`;
  }
  if (name === "image") {
    const href =
      node.getAttribute("xlink:href") ??
      node.getAttributeNS("http://www.w3.org/1999/xlink", "href") ??
      "";
    return odtImageToHtml(zip, href);
  }
  return childrenToHtml(node, zip);
}

function odtImageToHtml(zip: JSZip, href: string): string {
  const file = zip.file(href) ?? zip.file(href.replace(/^\.\//, ""));
  if (!file) return "";
  return `<!--image:${href}-->`;
}

async function embedOdtImages(html: string, zip: JSZip): Promise<string> {
  const matches = Array.from(html.matchAll(/<!--image:([^>]+)-->/g));
  let output = html;
  for (const match of matches) {
    const path = match[1];
    const file = zip.file(path) ?? zip.file(path.replace(/^\.\//, ""));
    if (!file) {
      output = output.replace(match[0], "");
      continue;
    }
    const bytes = await file.async("uint8array");
    const mime = path.toLowerCase().endsWith(".jpg") || path.toLowerCase().endsWith(".jpeg")
      ? "image/jpeg"
      : "image/png";
    const dataUrl = `data:${mime};base64,${bytesToBase64(bytes)}`;
    output = output.replace(match[0], `<img src="${dataUrl}" alt="" />`);
  }
  return output;
}

export async function parseOdtToHtml(bytes: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const contentFile = zip.file("content.xml");
  if (!contentFile) throw new Error("Arquivo ODT inválido: content.xml não encontrado.");
  const xml = await contentFile.async("string");
  const documentRef = new DOMParser().parseFromString(xml, "text/xml");
  const body = documentRef.getElementsByTagName("office:body")[0] ?? documentRef.documentElement;
  const html = odtNodeToHtml(body, zip);
  return embedOdtImages(html, zip);
}
