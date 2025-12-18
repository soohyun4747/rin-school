import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-[var(--primary)] focus:outline-none",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
