import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

interface Props {
  variant?: "info" | "success" | "warning" | "danger";
  className?: string;
}

const variants = {
  info: "bg-rose-50 text-rose-700 border border-rose-200",
  success: "bg-green-50 text-green-700 border border-green-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-red-100 text-red-800 border border-red-200",
};

export function Badge({ children, variant = "info", className }: PropsWithChildren<Props>) {
  return <span className={cn("rounded-full px-2 py-1 text-xs font-medium", variants[variant], className)}>{children}</span>;
}
