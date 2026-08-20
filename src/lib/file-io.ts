import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { createBlob, extensionOf } from "@/lib/bytes";

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export interface SaveBytesResult {
  readonly didSave: boolean;
  readonly path: string | null;
}

export async function saveBytes(params: {
  bytes: Uint8Array;
  defaultName: string;
  mimeType: string;
}): Promise<SaveBytesResult> {
  if (isTauriRuntime()) {
    const path = await save({
      defaultPath: params.defaultName,
      filters: [{ name: "Arquivo", extensions: [extensionOf(params.defaultName) || "*"] }],
    });
    if (!path) return { didSave: false, path: null };
    await writeFile(path, params.bytes);
    return { didSave: true, path };
  }
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
