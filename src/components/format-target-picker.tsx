import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { ConversionOption, FileFormat } from "@/lib/formats";
import { formatLabel, OUTPUT_FORMAT_ORDER } from "@/lib/formats";
import { cn } from "@/lib/utils";

export interface FormatTargetPickerProps {
  options: ConversionOption[];
  selected: ConversionOption | null;
  isWorking: boolean;
  onSelect: (format: FileFormat) => void;
}

function FormatButtons({
  options,
  selected,
  isWorking,
  onSelect,
  compact,
}: FormatTargetPickerProps & { compact?: boolean }) {
  return (
    <>
      {OUTPUT_FORMAT_ORDER.map((format) => {
        const option = options.find((item) => item.target === format);
        const isSelected = selected?.target === format;
        return (
          <button
            key={format}
            type="button"
            disabled={!option || isWorking}
            onClick={() => option && onSelect(format)}
            className={cn(
              "rounded-full border text-sm font-semibold transition-colors",
              compact ? "w-full px-4 py-3 text-left" : "px-4 py-2",
              isSelected
                ? "border-accent bg-accent text-white"
                : option
                  ? "border-line bg-paper text-ink hover:border-accent"
                  : "cursor-not-allowed border-line/70 bg-paper/50 text-muted/50",
            )}
          >
            <span className="flex items-center justify-between gap-3">
              {option?.label ?? formatLabel(format)}
              {compact && isSelected ? <Check className="h-4 w-4" /> : null}
            </span>
          </button>
        );
      })}
    </>
  );
}

export function FormatTargetPicker({ options, selected, isWorking, onSelect }: FormatTargetPickerProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent): void {
      if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
    }
    if (!isMenuOpen) return;
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isMenuOpen]);
  useEffect(() => {
    if (isWorking) setIsMenuOpen(false);
  }, [isWorking]);

  function handleMobileSelect(format: FileFormat): void {
    onSelect(format);
    setIsMenuOpen(false);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">Converter para</p>
      <div className="hidden flex-wrap gap-2 md:flex">
        <FormatButtons options={options} selected={selected} isWorking={isWorking} onSelect={onSelect} />
      </div>
      <div className="relative md:hidden" ref={menuRef}>
        <button
          type="button"
          disabled={isWorking}
          aria-expanded={isMenuOpen}
          aria-haspopup="listbox"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="flex h-12 w-full items-center justify-between rounded-xl border border-line bg-paper px-4 text-sm font-semibold"
        >
          <span>{selected ? selected.label : "Escolher formato"}</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isMenuOpen && "rotate-180")} />
        </button>
        {isMenuOpen && (
          <div
            role="listbox"
            className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-line bg-card p-2 shadow-[0_12px_40px_rgba(28,25,23,0.12)]"
          >
            <div className="flex flex-col gap-1">
              <FormatButtons
                options={options}
                selected={selected}
                isWorking={isWorking}
                onSelect={handleMobileSelect}
                compact
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
