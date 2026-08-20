import mammoth from "mammoth";

export async function parseDocxToHtml(bytes: ArrayBuffer): Promise<string> {
  const result = await mammoth.convertToHtml({ arrayBuffer: bytes });
  return result.value || "<p></p>";
}
