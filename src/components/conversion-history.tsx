import { Download } from "lucide-react";
import type { ConversionResult } from "@/lib/formats";
import { Button } from "@/components/ui/button";

export interface ConversionHistoryProps {
  result: ConversionResult;
  isWorking: boolean;
  onOpen: () => void;
  onDownload: () => void;
}

export function ConversionHistory({ result, isWorking, onOpen, onDownload }: ConversionHistoryProps) {
  return (
    <div className="space-y-2 rounded-xl border border-line bg-paper/70 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Histórico</p>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={isWorking}
          onClick={onOpen}
          className="min-w-0 truncate text-left text-sm font-medium text-accent-dark underline-offset-2 hover:underline disabled:no-underline disabled:opacity-50"
        >
          {result.filename}
        </button>
        <Button type="button" variant="outline" size="sm" disabled={isWorking} onClick={onDownload}>
          <Download className="h-4 w-4" />
          Baixar de novo
        </Button>
      </div>
    </div>
  );
}
