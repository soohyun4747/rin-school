import { ReactNode } from "react";

type SectionProps = {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function Section({ id, title, description, children }: SectionProps) {
  return (
    <section id={id} className="section-anchor space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-600">
          {id.replaceAll("-", " ")}
        </p>
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-semibold text-slate-900">{title}</h2>
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        {description ? (
          <p className="text-base text-slate-600">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
