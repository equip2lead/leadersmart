'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';

type Point = { month: string; score: number };

export function PerformanceTrendChart({ churchId }: { churchId: string }) {
  const [data, setData] = useState<Point[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: rows } = await supabase
        .from('evaluations')
        .select(
          'overall_score, pastor_assignment:pastor_assignments!inner(assignment_month, church_id)',
        )
        .not('signed_at', 'is', null)
        .not('overall_score', 'is', null)
        .eq('pastor_assignment.church_id', churchId)
        .order('signed_at', { ascending: true })
        .limit(24);

      if (cancelled) return;

      const points: Point[] = (rows ?? [])
        .map((r) => {
          const pa = (r as { pastor_assignment?: { assignment_month?: string } })
            .pastor_assignment;
          const month = pa?.assignment_month;
          const score = (r as { overall_score?: number | null }).overall_score;
          return month && score != null ? { month, score: Number(score) } : null;
        })
        .filter((p): p is Point => p !== null);

      setData(points);
    })();
    return () => {
      cancelled = true;
    };
  }, [churchId]);

  if (data === null) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-gray-200 px-6 text-center text-sm text-muted">
        No signed evaluations yet. The trend will appear here once pastor evaluations are completed.
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
          <YAxis domain={[0, 5]} stroke="#6b7280" fontSize={12} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#1e3a8a"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#1e3a8a' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
