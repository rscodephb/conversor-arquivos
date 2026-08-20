export interface TextSpan {
  readonly text: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
}

export interface ParagraphBlock {
  readonly type: "paragraph" | "heading" | "list-item";
  readonly level?: number;
  readonly listKind?: "bullet" | "number";
  readonly spans: TextSpan[];
}

export interface ImageBlock {
  readonly type: "image";
  readonly bytes: Uint8Array;
  readonly mimeType: string;
}

export interface TableBlock {
  readonly type: "table";
  readonly rows: string[][];
}

export type DocumentBlock = ParagraphBlock | ImageBlock | TableBlock;

export interface DocumentModel {
  readonly title?: string;
  readonly blocks: DocumentBlock[];
}

export function createTextBlock(
  type: ParagraphBlock["type"],
  text: string,
  level?: number,
): ParagraphBlock {
  return { type, level, spans: [{ text }] };
}

export function flattenSpans(spans: TextSpan[]): string {
  return spans.map((span) => span.text).join("");
}
