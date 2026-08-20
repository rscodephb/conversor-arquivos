import { detectFileFormat, isRasterFormat, type FileFormat } from "@/lib/formats";

function batchKindOf(format: FileFormat): string {
  return isRasterFormat(format) ? "raster" : format;
}

function fileBatchKind(file: File): string | null {
  const format = detectFileFormat(file);
  return format ? batchKindOf(format) : null;
}

/**
 * Keeps a batch of the same kind (images together, or several files of one document type).
 */
export function mergeIncomingFiles(params: {
  readonly currentFiles: File[];
  readonly incomingFiles: File[];
}): File[] {
  const incoming = params.incomingFiles.filter((file) => fileBatchKind(file) !== null);
  if (incoming.length === 0) return params.currentFiles;
  const incomingKind = fileBatchKind(incoming[0]);
  const sameIncoming = incoming.every((file) => fileBatchKind(file) === incomingKind);
  if (!sameIncoming) return [incoming[incoming.length - 1]];
  const currentCompatible =
    params.currentFiles.length === 0 ||
    params.currentFiles.every((file) => fileBatchKind(file) === incomingKind);
  const base = currentCompatible ? [...params.currentFiles] : [];
  incoming.forEach((file) => {
    if (!base.some((existing) => existing.name === file.name && existing.size === file.size)) {
      base.push(file);
    }
  });
  return base;
}
