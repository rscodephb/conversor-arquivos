import type { ConversionResult, FileFormat } from "@/lib/formats";
import { detectFileFormat, isRasterFormat, MIME_TYPES } from "@/lib/formats";
import { replaceExtension, stemOf } from "@/lib/bytes";
import { convertImagesToPdf } from "@/lib/converters/image-to-pdf";
import { convertPdfToImages } from "@/lib/converters/pdf-to-images";
import { convertRasterToImage } from "@/lib/converters/raster-to-image";
import { mergePdfs } from "@/lib/converters/merge-pdf";
import { parseDocxToHtml } from "@/lib/parsers/parse-docx";
import { parseOdtToHtml } from "@/lib/parsers/parse-odt";
import { parseDocToHtml } from "@/lib/parsers/parse-doc";
import {
  htmlToMarkdown,
  htmlToPlainText,
  parseHtmlFile,
  parseMarkdownToHtml,
  parseTextToHtml,
} from "@/lib/parsers/parse-text";
import { parsePdfToHtml } from "@/lib/parsers/parse-pdf";
import { parseCsv, serializeCsv } from "@/lib/parsers/parse-csv";
import { parseXlsxToRows, rowsToXlsx } from "@/lib/parsers/parse-xlsx";
import { emitPdfFromHtml, emitPdfFromRows } from "@/lib/emitters/emit-pdf";
import { emitDocxFromHtml } from "@/lib/emitters/emit-docx";
import { emitOdtFromHtml } from "@/lib/emitters/emit-odt";
import { escapeHtml } from "@/lib/html-utils";

function rowsToHtml(rows: string[][]): string {
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<table>${body}</table>`;
}

async function fileToHtml(file: File, format: FileFormat, onProgress?: (value: number) => void): Promise<string> {
  const bytes = await file.arrayBuffer();
  if (format === "docx") return parseDocxToHtml(bytes);
  if (format === "odt") return parseOdtToHtml(bytes);
  if (format === "doc") return parseDocToHtml(bytes);
  if (format === "pdf") return parsePdfToHtml(bytes, onProgress);
  if (format === "md") return parseMarkdownToHtml(await file.text());
  if (format === "html" || format === "htm") return parseHtmlFile(await file.text());
  return parseTextToHtml(await file.text());
}

async function htmlToTarget(html: string, target: FileFormat, filename: string): Promise<ConversionResult> {
  if (target === "pdf") {
    return { filename: replaceExtension(filename, "pdf"), bytes: await emitPdfFromHtml(html), mimeType: MIME_TYPES.pdf };
  }
  if (target === "docx") {
    return { filename: replaceExtension(filename, "docx"), bytes: await emitDocxFromHtml(html), mimeType: MIME_TYPES.docx };
  }
  if (target === "odt") {
    return { filename: replaceExtension(filename, "odt"), bytes: await emitOdtFromHtml(html), mimeType: MIME_TYPES.odt };
  }
  if (target === "html") {
    const wrapped = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${stemOf(filename)}</title></head><body>${html}</body></html>`;
    return {
      filename: replaceExtension(filename, "html"),
      bytes: new TextEncoder().encode(wrapped),
      mimeType: MIME_TYPES.html,
    };
  }
  if (target === "txt") {
    return {
      filename: replaceExtension(filename, "txt"),
      bytes: new TextEncoder().encode(htmlToPlainText(html)),
      mimeType: MIME_TYPES.txt,
    };
  }
  if (target === "md") {
    return {
      filename: replaceExtension(filename, "md"),
      bytes: new TextEncoder().encode(htmlToMarkdown(html)),
      mimeType: MIME_TYPES.md,
    };
  }
  throw new Error(`Destino não suportado: ${target}`);
}

export async function convertFiles(params: {
  files: File[];
  target: FileFormat;
  onProgress: (value: number) => void;
}): Promise<ConversionResult[]> {
  const formats = params.files.map(detectFileFormat);
  if (formats.some((format) => format === null)) {
    throw new Error("Um ou mais arquivos têm extensão não suportada.");
  }
  const typed = formats as FileFormat[];
  if (typed.every((format) => isRasterFormat(format)) && params.target === "pdf") {
    return [await convertImagesToPdf(params.files, params.onProgress)];
  }
  if (typed.every((format) => isRasterFormat(format)) && (params.target === "png" || params.target === "jpg")) {
    const results: ConversionResult[] = [];
    for (let index = 0; index < params.files.length; index += 1) {
      results.push(await convertRasterToImage(params.files[index], params.target));
      params.onProgress((index + 1) / params.files.length);
    }
    return results;
  }
  if (typed.every((format) => format === "pdf") && (params.target === "png" || params.target === "jpg")) {
    const outputs: ConversionResult[] = [];
    for (let index = 0; index < params.files.length; index += 1) {
      const pages = await convertPdfToImages(params.files[index], params.target, (value) => {
        params.onProgress((index + value) / params.files.length);
      });
      outputs.push(...pages);
    }
    return outputs;
  }
  if (typed.every((format) => format === "pdf") && params.target === "pdf") {
    return [await mergePdfs(params.files, params.onProgress)];
  }
  if (typed.every((format) => format === "csv") && params.target === "xlsx") {
    const results: ConversionResult[] = [];
    for (let index = 0; index < params.files.length; index += 1) {
      const rows = parseCsv(await params.files[index].text());
      results.push({
        filename: replaceExtension(params.files[index].name, "xlsx"),
        bytes: await rowsToXlsx(rows),
        mimeType: MIME_TYPES.xlsx,
      });
      params.onProgress((index + 1) / params.files.length);
    }
    return results;
  }
  if (typed.every((format) => format === "xlsx") && params.target === "csv") {
    const results: ConversionResult[] = [];
    for (let index = 0; index < params.files.length; index += 1) {
      const rows = await parseXlsxToRows(await params.files[index].arrayBuffer());
      results.push({
        filename: replaceExtension(params.files[index].name, "csv"),
        bytes: new TextEncoder().encode(serializeCsv(rows)),
        mimeType: MIME_TYPES.csv,
      });
      params.onProgress((index + 1) / params.files.length);
    }
    return results;
  }
  if (
    typed.every((format) => format === "csv" || format === "xlsx") &&
    (params.target === "pdf" || params.target === "html" || params.target === "txt" || params.target === "md")
  ) {
    const results: ConversionResult[] = [];
    for (let index = 0; index < params.files.length; index += 1) {
      const file = params.files[index];
      const format = typed[index];
      const rows = format === "csv" ? parseCsv(await file.text()) : await parseXlsxToRows(await file.arrayBuffer());
      if (params.target === "pdf") {
        results.push({
          filename: replaceExtension(file.name, "pdf"),
          bytes: await emitPdfFromRows(rows, stemOf(file.name)),
          mimeType: MIME_TYPES.pdf,
        });
      } else {
        results.push(await htmlToTarget(rowsToHtml(rows), params.target, file.name));
      }
      params.onProgress((index + 1) / params.files.length);
    }
    return results;
  }
  const results: ConversionResult[] = [];
  for (let index = 0; index < params.files.length; index += 1) {
    const html = await fileToHtml(params.files[index], typed[index], (value) => {
      params.onProgress((index + value) / params.files.length);
    });
    results.push(await htmlToTarget(html, params.target, params.files[index].name));
    params.onProgress((index + 1) / params.files.length);
  }
  return results;
}
