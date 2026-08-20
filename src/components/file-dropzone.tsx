import { useMemo, useRef, useState } from "react";
import { FileUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTauriFileDrop } from "@/hooks/use-tauri-file-drop";
import { detectFileFormat, formatLabel } from "@/lib/formats";
import { mergeIncomingFiles } from "@/lib/merge-incoming-files";
import { cn } from "@/lib/utils";

const ACCEPT = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".bmp",
  ".docx",
  ".odt",
  ".doc",
  ".txt",
  ".md",
  ".html",
  ".htm",
  ".csv",
  ".xlsx",
].join(",");

export interface FileDropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export function FileDropzone({ files, onFilesChange }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef(files);
  const onFilesChangeRef = useRef(onFilesChange);
  const [isDragging, setIsDragging] = useState(false);
  filesRef.current = files;
  onFilesChangeRef.current = onFilesChange;
  const items = useMemo(
    () =>
      files.map((file) => ({
        file,
        format: detectFileFormat(file),
      })),
    [files],
  );

  function addFiles(list: FileList | File[]): void {
    const next = mergeIncomingFiles({
      currentFiles: filesRef.current,
      incomingFiles: Array.from(list),
    });
    onFilesChangeRef.current(next);
  }

  useTauriFileDrop({
    onDrop: addFiles,
    onDraggingChange: setIsDragging,
  });

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-colors",
          isDragging ? "border-accent bg-teal-50" : "border-line bg-paper/60 hover:border-accent",
        )}
      >
        <FileUp className="mb-3 h-8 w-8 text-accent" />
        <p className="text-base font-semibold">Arraste arquivos ou toque para escolher</p>
        <p className="mt-1 max-w-md text-sm text-muted">
          PDF, imagens, DOCX, ODT, DOC, TXT, MD, HTML, CSV e XLSX. Vários arquivos do mesmo tipo entram em lote; tipos mistos ficam só o último.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </button>
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map(({ file, format }) => (
            <li
              key={`${file.name}-${file.size}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{format ? formatLabel(format) : "Desconhecido"}</Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remover ${file.name}`}
                  onClick={() => onFilesChange(files.filter((item) => item !== file))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
