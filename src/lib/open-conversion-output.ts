import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import { createBlob } from "@/lib/bytes";
import { isTauriRuntime } from "@/lib/file-io";

function normalizeOpenPath(path: string): string {
  return path.replace(/\\/g, "/");
}

async function openSavedPath(path: string): Promise<void> {
  try {
    await openPath(normalizeOpenPath(path));
  } catch {
    await revealItemInDir(path);
  }
}

/**
 * Opens a converted file with the system viewer, or in a new tab on the web.
 */
export async function openConversionOutput(params: {
  readonly path: string | null;
  readonly bytes: Uint8Array;
  readonly mimeType: string;
}): Promise<void> {
  if (isTauriRuntime() && params.path) {
    await openSavedPath(params.path);
    return;
  }
  const blob = createBlob(params.bytes, params.mimeType);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
