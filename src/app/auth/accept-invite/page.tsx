import { AcceptInviteFlow } from './_flow';

// Middleware whitelists /auth/*, so this page is reachable without a session.
// The interesting work happens on the client so verifyOtp's cookies persist
// to the browser (Server Components in Next 15 can't reliably set cookies).
export const dynamic = 'force-dynamic';

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const first = (v: string | string[] | undefined): string | null => {
    if (Array.isArray(v)) return v[0] ?? null;
    return v ?? null;
  };

  return (
    <AcceptInviteFlow
      tokenHash={first(sp.token_hash)}
      type={first(sp.type)}
      // Legacy fallbacks for older link formats.
      code={first(sp.code)}
      error={first(sp.error) ?? first(sp.error_code)}
      errorDescription={first(sp.error_description)}
    />
  );
}
