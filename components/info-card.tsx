import { ReactNode } from "react";

type InfoCardProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  badge?: string;
};

export function InfoCard({ title, description, icon, badge }: InfoCardProps) {
  return (
    <div className="card-shadow rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-700">
            {icon}
          </div>
        ) : null}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {badge ? (
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}
