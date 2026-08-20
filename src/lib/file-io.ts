import { downloadDir, join } from "@tauri-apps/api/path";
import { save } from "@tauri-apps/plugin-dialog";
import { BaseDirectory, readFile, writeFile } from "@tauri-apps/plugin-fs";
import { bytesToArrayBuffer, createBlob, extensionOf } from "@/lib/bytes";

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function isAndroidRuntime(): boolean {
  return isTauriRuntime() && /Android/i.test(navigator.userAgent);
}

export interface SaveBytesResult {
  readonly didSave: boolean;
  readonly path: string | null;
}

export async function readDroppedPathAsFile(path: string): Promise<File | null> {
  try {
    const bytes = await readFile(path);
    const name = path.split(/[/\\]/).pop() || "arquivo";
    return new File([bytesToArrayBuffer(bytes)], name);
  } catch {
    return null;
  }
}

async function saveBytesToDownloads(params: {
  bytes: Uint8Array;
  defaultName: string;
}): Promise<SaveBytesResult> {
  await writeFile(params.defaultName, params.bytes, { baseDir: BaseDirectory.Download, create: true });
  const folder = await downloadDir();
  const path = await join(folder, params.defaultName);
  return { didSave: true, path };
}

async function shareConvertedFile(params: {
  bytes: Uint8Array;
  defaultName: string;
  mimeType: string;
}): Promise<SaveBytesResult> {
  const file = new File([bytesToArrayBuffer(params.bytes)], params.defaultName, { type: params.mimeType });
  const canShare = typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
  if (!canShare || typeof navigator.share !== "function") {
    throw new Error("Não foi possível salvar o arquivo neste celular.");
  }
  await navigator.share({ files: [file], title: params.defaultName });
  return { didSave: true, path: null };
}

async function saveBytesWithDialog(params: {
  bytes: Uint8Array;
  defaultName: string;
}): Promise<SaveBytesResult> {
  const path = await save({
    defaultPath: params.defaultName,
    filters: [{ name: "Arquivo", extensions: [extensionOf(params.defaultName) || "*"] }],
  });
  if (!path) return { didSave: false, path: null };
  await writeFile(path, params.bytes);
  return { didSave: true, path };
}

export async function saveBytes(params: {
  bytes: Uint8Array;
  defaultName: string;
  mimeType: string;
}): Promise<SaveBytesResult> {
  if (isAndroidRuntime()) {
    try {
      return await saveBytesToDownloads(params);
    } catch {
      return await shareConvertedFile(params);
    }
  }
  if (isTauriRuntime()) return saveBytesWithDialog(params);
  const blob = createBlob(params.bytes, params.mimeType);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = params.defaultName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return { didSave: true, path: null };
}
