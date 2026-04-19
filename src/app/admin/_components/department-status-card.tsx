import Link from 'next/link';
import { Building2 } from 'lucide-react';

export function DepartmentStatusCard({
  id,
  name,
  icon,
}: {
  id: string;
  name: string;
  icon: string | null;
}) {
  return (
    <Link
      href={`/admin/departments#${id}`}
      className="card flex items-center gap-4 transition hover:shadow-card-hover"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        {icon ? (
          <span className="text-xl" aria-hidden="true">
            {icon}
          </span>
        ) : (
          <Building2 className="h-5 w-5" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{name}</p>
        <p className="text-xs text-muted">Active</p>
      </div>
      <span
        className="h-2.5 w-2.5 rounded-full bg-emerald-500"
        aria-label="Status: on track"
      />
    </Link>
  );
}
