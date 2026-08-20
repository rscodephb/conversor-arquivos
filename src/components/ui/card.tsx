import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-line bg-card shadow-[0_12px_40px_rgba(28,25,23,0.06)]", className)}
      {...props}
    />
  );
}
