import type { PropsWithChildren } from "react";
import { requireSession } from "@/lib/auth";

export default async function DashboardLayout({ children }: PropsWithChildren) {
  await requireSession();
  return <div className="mx-auto max-w-6xl px-4 py-10">{children}</div>;
}
