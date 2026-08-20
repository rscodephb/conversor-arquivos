import { stemOf } from "@/lib/bytes";

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

/**
 * Builds a safe converted filename from the user-provided stem and the target extension.
 */
export function buildConvertedFilename(params: {
  readonly stem: string;
  readonly fallback: string;
  readonly extension: string;
}): string {
  const extension = params.extension.replace(/^\./, "").toLowerCase();
  const rawStem = params.stem.trim() || stemOf(params.fallback);
  const withoutExtension =
    extension && rawStem.toLowerCase().endsWith(`.${extension}`)
      ? rawStem.slice(0, -(extension.length + 1))
      : rawStem;
  const sanitized = withoutExtension
    .replace(INVALID_FILENAME_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
  const stem = sanitized.length > 0 ? sanitized : "convertido";
  return extension ? `${stem}.${extension}` : stem;
}
