import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriRuntime, readDroppedPathAsFile } from "@/lib/file-io";

interface UseTauriFileDropParams {
  onDrop: (files: File[]) => void;
  onDraggingChange: (isDragging: boolean) => void;
}

export function useTauriFileDrop(params: UseTauriFileDropParams): void {
  const onDropRef = useRef(params.onDrop);
  const onDraggingChangeRef = useRef(params.onDraggingChange);
  onDropRef.current = params.onDrop;
  onDraggingChangeRef.current = params.onDraggingChange;
  useEffect(() => {
    if (!isTauriRuntime()) return;
    let isCancelled = false;
    let unlisten: (() => void) | undefined;
    void getCurrentWindow()
      .onDragDropEvent(async (event) => {
        const payload = event.payload;
        if (payload.type === "enter" || payload.type === "over") {
          onDraggingChangeRef.current(true);
          return;
        }
        if (payload.type === "leave") {
          onDraggingChangeRef.current(false);
          return;
        }
        if (payload.type !== "drop") return;
        onDraggingChangeRef.current(false);
        const files: File[] = [];
        for (const path of payload.paths) {
          const file = await readDroppedPathAsFile(path);
          if (file) files.push(file);
        }
        if (!isCancelled && files.length > 0) onDropRef.current(files);
      })
      .then((fn) => {
        if (isCancelled) {
          fn();
          return;
        }
        unlisten = fn;
      })
      .catch(() => undefined);
    return () => {
      isCancelled = true;
      unlisten?.();
    };
  }, []);
}
