export function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function createBlob(bytes: Uint8Array, mimeType: string): Blob {
  return new Blob([bytesToArrayBuffer(bytes)], { type: mimeType });
}

export function extensionOf(filename: string): string {
  const match = /\.([^.]+)$/.exec(filename);
  return match ? match[1].toLowerCase() : "";
}

export function replaceExtension(filename: string, extension: string): string {
  const base = filename.replace(/\.[^.]+$/, "");
  return `${base}.${extension}`;
}

export function stemOf(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
