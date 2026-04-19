import Link from 'next/link';
import {
  Users,
  DollarSign,
  UserPlus,
  Star,
  Calendar,
  type LucideIcon,
} from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { PerformanceTrendChart } from './_components/performance-trend-chart';
import { DepartmentStatusCard } from './_components/department-status-card';

export const dynamic = 'force-dynamic';

type PastorRow = { full_name: string | null } | null;
type ActiveAssignment = {
  id: string;
  assignment_month: string;
  pastor: PastorRow;
} | null;

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted">
            {label}
          </p>
          <p className="mt-0.5 truncate text-xl font-bold text-ink">{value}</p>
        </div>
      </div>
    </div>
  );
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.max(
    0,
    Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

export default async function AdminDashboard() {
  const { user, church } = await requireRole(['senior_pastor', 'admin']);
  const lang = user.preferred_language;
  const supabase = await createClient();

  const [deptsRes, activeRes, lastChecklistRes] = await Promise.all([
    supabase
      .from('departments')
      .select('id, name, icon')
      .eq('church_id', church.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabase
      .from('pastor_assignments')
      .select('id, assignment_month, pastor:users!pastor_user_id(full_name)')
      .eq('church_id', church.id)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('sunday_checklists')
      .select('attendance_count, offering_total, new_visitors_count, service_date')
      .order('service_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const departments = deptsRes.data ?? [];
  const active = (activeRes.data as ActiveAssignment) ?? null;
  const last = lastChecklistRes.data;

  // Handover = first day of the month AFTER assignment_month
  let handoverDays: string = '—';
  if (active?.assignment_month) {
    const [y, m] = active.assignment_month.split('-').map(Number);
    if (y && m) {
      const nextMonth = new Date(y, m, 1); // month is 0-indexed; m gives next month's first day
      handoverDays = String(
        daysUntil(nextMonth.toISOString().slice(0, 10)),
      );
    }
  }

  const currency = church.currency || 'XAF';
  const offeringValue =
    last?.offering_total != null
      ? new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
          style: 'currency',
          currency,
          maximumFractionDigits: 0,
        }).format(Number(last.offering_total))
      : '—';

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('admin.title', lang)}
        subtitle={church.name}
      />

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label={t('admin.stat.attendance', lang)}
          value={last?.attendance_count != null ? String(last.attendance_count) : '—'}
          icon={Users}
        />
        <StatCard
          label={t('admin.stat.offering', lang)}
          value={offeringValue}
          icon={DollarSign}
        />
        <StatCard
          label={t('admin.stat.visitors', lang)}
          value={
            last?.new_visitors_count != null
              ? String(last.new_visitors_count)
              : '—'
          }
          icon={UserPlus}
        />
        <StatCard
          label={t('admin.stat.currentPastor', lang)}
          value={active?.pastor?.full_name ?? '—'}
          icon={Star}
        />
        <StatCard
          label={t('admin.stat.daysToHandover', lang)}
          value={handoverDays}
          icon={Calendar}
        />
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">
            {t('admin.departments.title', lang)}
          </h2>
          <Link
            href="/admin/departments"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            {t('common.edit', lang)}
          </Link>
        </div>
        {departments.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-gray-200 bg-white px-6 py-8 text-center text-sm text-muted">
            {t('common.empty', lang)}
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((d) => (
              <DepartmentStatusCard
                key={d.id}
                id={d.id}
                name={d.name}
                icon={d.icon}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold text-ink">
            {t('admin.trend.title', lang)}
          </h2>
          <div className="mt-4">
            <PerformanceTrendChart churchId={church.id} />
          </div>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-ink">
            {t('admin.alerts.title', lang)}
          </h2>
          <p className="mt-4 text-sm text-muted">
            {t('admin.alerts.none', lang)}
          </p>
        </div>
      </section>
    </div>
  );
}
