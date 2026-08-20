import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { createBlob } from "@/lib/bytes";
import { isTauriRuntime } from "@/lib/file-io";

/**
 * Opens a converted file with the system viewer, or in a new tab on the web.
 */
export async function openConversionOutput(params: {
  readonly path: string | null;
  readonly bytes: Uint8Array;
  readonly mimeType: string;
}): Promise<void> {
  if (isTauriRuntime() && params.path) {
    try {
      await openPath(params.path);
      return;
    } catch {
      await openUrl(params.path);
      return;
    }
  }
  const blob = createBlob(params.bytes, params.mimeType);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
