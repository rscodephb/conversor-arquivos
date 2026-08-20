import JSZip from "jszip";
import type { DocumentModel } from "@/lib/document-model";
import { parseHtmlToModel } from "@/lib/parsers/parse-html-model";
import { escapeXml } from "@/lib/html-utils";

function spansToXml(spans: { text: string; bold?: boolean; italic?: boolean }[]): string {
  return spans
    .map((span) => {
      const text = escapeXml(span.text);
      if (span.bold && span.italic) return `<text:span text:style-name="BoldItalic">${text}</text:span>`;
      if (span.bold) return `<text:span text:style-name="Bold">${text}</text:span>`;
      if (span.italic) return `<text:span text:style-name="Italic">${text}</text:span>`;
      return text;
    })
    .join("");
}

export async function emitOdtFromModel(model: DocumentModel): Promise<Uint8Array> {
  const zip = new JSZip();
  const pictures: string[] = [];
  const bodyParts: string[] = [];
  let imageIndex = 0;
  for (const block of model.blocks) {
    if (block.type === "heading") {
      const level = block.level ?? 1;
      bodyParts.push(`<text:h text:outline-level="${level}">${spansToXml(block.spans)}</text:h>`);
      continue;
    }
    if (block.type === "list-item") {
      bodyParts.push(`<text:list><text:list-item><text:p>${spansToXml(block.spans)}</text:p></text:list-item></text:list>`);
      continue;
    }
    if (block.type === "paragraph") {
      bodyParts.push(`<text:p>${spansToXml(block.spans)}</text:p>`);
      continue;
    }
    if (block.type === "table") {
      const rows = block.rows
        .map((row) => {
          const cells = row.map((cell) => `<table:table-cell><text:p>${escapeXml(cell)}</text:p></table:table-cell>`).join("");
          return `<table:table-row>${cells}</table:table-row>`;
        })
        .join("");
      bodyParts.push(`<table:table>${rows}</table:table>`);
      continue;
    }
    if (block.type !== "image") continue;
    imageIndex += 1;
    const name = `Pictures/image${imageIndex}.png`;
    zip.file(name, block.bytes);
    pictures.push(name);
    bodyParts.push(
      `<text:p><draw:frame svg:width="12cm" svg:height="8cm"><draw:image xlink:href="${name}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame></text:p>`,
    );
  }
  if (bodyParts.length === 0) bodyParts.push("<text:p></text:p>");
  zip.file("mimetype", "application/vnd.oasis.opendocument.text", { compression: "STORE" });
  zip.file(
    "META-INF/manifest.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
  ${pictures.map((path) => `<manifest:file-entry manifest:full-path="${path}" manifest:media-type="image/png"/>`).join("\n")}
</manifest:manifest>`,
  );
  zip.file(
    "meta.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" office:version="1.3">
  <office:meta></office:meta>
</office:document-meta>`,
  );
  zip.file(
    "styles.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.3">
  <office:styles>
    <style:style style:name="Bold" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>
    <style:style style:name="Italic" style:family="text"><style:text-properties fo:font-style="italic"/></style:style>
    <style:style style:name="BoldItalic" style:family="text"><style:text-properties fo:font-weight="bold" fo:font-style="italic"/></style:style>
  </office:styles>
</office:document-styles>`,
  );
  zip.file(
    "content.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
  office:version="1.3">
  <office:automatic-styles/>
  <office:body><office:text>${bodyParts.join("")}</office:text></office:body>
</office:document-content>`,
  );
  return zip.generateAsync({ type: "uint8array" });
}

export async function emitOdtFromHtml(html: string): Promise<Uint8Array> {
  return emitOdtFromModel(parseHtmlToModel(html));
}
