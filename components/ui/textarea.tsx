import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-[var(--primary)] focus:outline-none",
        className
      )}
      {...props}
    />
  );
}
