export function parseDataUrl(src: string): { bytes: Uint8Array; mimeType: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(src.trim());
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return { bytes, mimeType: match[1] };
}
