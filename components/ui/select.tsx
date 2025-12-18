import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "w-full rounded-md border border-rose-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-rose-500 focus:outline-none",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
