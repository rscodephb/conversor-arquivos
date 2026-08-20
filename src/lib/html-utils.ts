export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function sanitizeHtml(html: string): string {
  const documentRef = new DOMParser().parseFromString(html, "text/html");
  documentRef.querySelectorAll("script,iframe,object,embed,link,meta").forEach((node) => {
    node.remove();
  });
  return documentRef.body.innerHTML;
}

export function wrapDocumentHtml(bodyHtml: string): string {
  return `<article class="doc-sheet">${bodyHtml}</article>`;
}

export const DOCUMENT_HTML_STYLES = `
.doc-sheet { font-family: "Segoe UI", Arial, sans-serif; color: #1c1917; font-size: 16px; line-height: 1.5; }
.doc-sheet h1 { font-size: 26px; margin: 0 0 12px; }
.doc-sheet h2 { font-size: 22px; margin: 18px 0 10px; }
.doc-sheet h3 { font-size: 18px; margin: 16px 0 8px; }
.doc-sheet p { margin: 0 0 10px; }
.doc-sheet ul, .doc-sheet ol { margin: 0 0 12px; padding-left: 22px; }
.doc-sheet img { max-width: 100%; height: auto; display: block; margin: 8px 0; }
.doc-sheet table { border-collapse: collapse; width: 100%; margin: 8px 0 14px; }
.doc-sheet td, .doc-sheet th { border: 1px solid #d6d3d1; padding: 6px 8px; vertical-align: top; }
`;
