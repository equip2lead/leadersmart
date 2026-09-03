'use client';

import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';

// The dashboard is a server component, so a greeting computed during
// render reads the *server's* hour — iad1, roughly five hours behind
// Douala. Only the browser knows the viewer's local time, so the bucket
// has to be chosen after hydration.
//
// The first render deliberately shows the name without a greeting word,
// on both the server and the client, so the two agree and React reports
// no hydration mismatch. The effect then swaps in the real greeting. The
// alternative — server-rendering a guess and suppressing the warning —
// would briefly show a greeting that is simply wrong, which is worse
// than showing none.

function greetingKey(hour: number): string {
  if (hour < 12) return 'dashboard.ministry.greeting_morning';
  if (hour < 18) return 'dashboard.ministry.greeting_afternoon';
  return 'dashboard.ministry.greeting_evening';
}

export function TimeAwareGreeting({
  name,
  lang,
}: {
  name: string;
  lang: AppLanguage;
}) {
  const [hour, setHour] = useState<number | null>(null);

  useEffect(() => {
    setHour(new Date().getHours());
  }, []);

  const key =
    hour === null ? 'dashboard.ministry.greeting_neutral' : greetingKey(hour);

  return <>{t(key, lang).replace('{name}', name)}</>;
}
