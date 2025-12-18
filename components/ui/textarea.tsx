import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full rounded-md border border-rose-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-rose-500 focus:outline-none",
        className
      )}
      {...props}
    />
  );
}
