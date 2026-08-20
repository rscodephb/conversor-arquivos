import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import type { DocumentModel, ParagraphBlock } from "@/lib/document-model";
import { parseHtmlToModel } from "@/lib/parsers/parse-html-model";
import { readImageSize } from "@/lib/canvas-utils";
import { flattenSpans } from "@/lib/document-model";

function headingLevelOf(level: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  if (level <= 1) return HeadingLevel.HEADING_1;
  if (level === 2) return HeadingLevel.HEADING_2;
  if (level === 3) return HeadingLevel.HEADING_3;
  if (level === 4) return HeadingLevel.HEADING_4;
  if (level === 5) return HeadingLevel.HEADING_5;
  return HeadingLevel.HEADING_6;
}

function paragraphFromBlock(block: ParagraphBlock): Paragraph {
  const runs = block.spans.map(
    (span) =>
      new TextRun({
        text: span.text,
        bold: span.bold || block.type === "heading",
        italics: span.italic,
        underline: span.underline ? {} : undefined,
      }),
  );
  const text = flattenSpans(block.spans);
  if (block.type === "heading") {
    return new Paragraph({
      heading: headingLevelOf(block.level ?? 1),
      children: runs.length > 0 ? runs : [new TextRun(text)],
    });
  }
  if (block.type === "list-item") {
    return new Paragraph({
      bullet: { level: 0 },
      children: runs,
    });
  }
  return new Paragraph({ children: runs.length > 0 ? runs : [new TextRun(text || "")] });
}

async function imageParagraph(bytes: Uint8Array, mimeType: string): Promise<Paragraph> {
  const kind = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
  const size = await readImageSize(bytes, mimeType).catch(() => ({ width: 800, height: 600 }));
  const maxWidth = 500;
  const scale = Math.min(maxWidth / Math.max(size.width, 1), 1);
  return new Paragraph({
    children: [
      new ImageRun({
        type: kind,
        data: bytes,
        transformation: {
          width: Math.max(40, Math.round(size.width * scale)),
          height: Math.max(40, Math.round(size.height * scale)),
        },
      }),
    ],
  });
}

export async function emitDocxFromModel(model: DocumentModel): Promise<Uint8Array> {
  const children: Array<Paragraph | Table> = [];
  for (const block of model.blocks) {
    if (block.type === "image") {
      try {
        children.push(await imageParagraph(block.bytes, block.mimeType));
      } catch {
        children.push(new Paragraph({ text: "[imagem omitida]" }));
      }
      continue;
    }
    if (block.type === "table") {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: block.rows.map(
            (row) =>
              new TableRow({
                children: row.map(
                  (cell) =>
                    new TableCell({
                      children: [new Paragraph({ text: cell })],
                    }),
                ),
              }),
          ),
        }),
      );
      continue;
    }
    children.push(paragraphFromBlock(block));
  }
  if (children.length === 0) children.push(new Paragraph({ text: "" }));
  const documentRef = new Document({
    sections: [{ children }],
  });
  return new Uint8Array(await Packer.toArrayBuffer(documentRef));
}

export async function emitDocxFromHtml(html: string): Promise<Uint8Array> {
  return emitDocxFromModel(parseHtmlToModel(html));
}
