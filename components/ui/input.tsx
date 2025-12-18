import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-md border border-rose-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-rose-500 focus:outline-none",
        className
      )}
      {...props}
    />
  );
}
