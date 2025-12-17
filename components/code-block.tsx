import { ReactNode } from "react";

type CodeBlockProps = {
  title?: string;
  children: ReactNode;
};

export function CodeBlock({ title, children }: CodeBlockProps) {
  return (
    <div className="card-shadow overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      {title ? (
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
          <span>{title}</span>
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
            code
          </span>
        </div>
      ) : null}
      <pre className="overflow-x-auto bg-[var(--color-code)] px-4 py-5 text-xs leading-6 text-sky-100">
        <code>{children}</code>
      </pre>
    </div>
  );
}
