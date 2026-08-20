export type FileFormat =
  | "pdf"
  | "png"
  | "jpg"
  | "jpeg"
  | "webp"
  | "bmp"
  | "docx"
  | "odt"
  | "doc"
  | "txt"
  | "md"
  | "html"
  | "htm"
  | "csv"
  | "xlsx";

export type Fidelity = "high" | "good" | "approximate";

export interface ConversionResult {
  readonly filename: string;
  readonly bytes: Uint8Array;
  readonly mimeType: string;
}

export interface ConversionOption {
  readonly target: FileFormat;
  readonly label: string;
  readonly fidelity: Fidelity;
  readonly warning?: string;
  readonly isMerge?: boolean;
}

export const RASTER_FORMATS: readonly FileFormat[] = ["png", "jpg", "jpeg", "webp", "bmp"];

export const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  odt: "application/vnd.oasis.opendocument.text",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv;charset=utf-8",
  txt: "text/plain;charset=utf-8",
  html: "text/html;charset=utf-8",
  zip: "application/zip",
  md: "text/markdown;charset=utf-8",
};

export const OUTPUT_FORMAT_ORDER: readonly FileFormat[] = [
  "pdf",
  "odt",
  "docx",
  "png",
  "jpg",
  "xlsx",
  "csv",
  "html",
  "txt",
  "md",
];

const EXTENSION_ALIASES: Record<string, FileFormat> = {
  pdf: "pdf",
  png: "png",
  jpg: "jpg",
  jpeg: "jpg",
  webp: "webp",
  bmp: "bmp",
  docx: "docx",
  odt: "odt",
  doc: "doc",
  txt: "txt",
  md: "md",
  markdown: "md",
  html: "html",
  htm: "html",
  csv: "csv",
  xlsx: "xlsx",
};

export function detectFileFormat(file: File): FileFormat | null {
  const extension = /\.([^.]+)$/.exec(file.name)?.[1]?.toLowerCase() ?? "";
  if (extension in EXTENSION_ALIASES) return EXTENSION_ALIASES[extension];
  return null;
}

export function isRasterFormat(format: FileFormat): boolean {
  return RASTER_FORMATS.includes(format);
}

export function formatLabel(format: FileFormat): string {
  const labels: Record<FileFormat, string> = {
    pdf: "PDF",
    png: "PNG",
    jpg: "JPG",
    jpeg: "JPG",
    webp: "WEBP",
    bmp: "BMP",
    docx: "DOCX",
    odt: "ODT",
    doc: "DOC",
    txt: "TXT",
    md: "Markdown",
    html: "HTML",
    htm: "HTML",
    csv: "CSV",
    xlsx: "XLSX",
  };
  return labels[format];
}
