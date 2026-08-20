import { Input } from "@/components/ui/input";

export interface OutputNameFieldProps {
  readonly stem: string;
  readonly extension: string;
  readonly isDisabled: boolean;
  readonly onStemChange: (stem: string) => void;
}

export function OutputNameField({ stem, extension, isDisabled, onStemChange }: OutputNameFieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">
        {extension === "zip" ? "Nome do ZIP" : "Nome do arquivo convertido"}
      </span>
      <div className="flex items-center gap-2">
        <Input
          value={stem}
          disabled={isDisabled}
          autoComplete="off"
          spellCheck={false}
          placeholder="nome-do-arquivo"
          aria-label={extension === "zip" ? "Nome do ZIP" : "Nome do arquivo convertido"}
          onChange={(event) => onStemChange(event.target.value)}
        />
        <span className="shrink-0 rounded-xl border border-line bg-paper px-3 py-2 text-sm font-semibold text-muted">
          .{extension}
        </span>
      </div>
    </label>
  );
}
