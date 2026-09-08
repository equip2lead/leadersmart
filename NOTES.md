# Operational notes

Things that are true about the deployed system but are not visible from the
code alone. Short-lived entries; delete them once they stop being true.

## Before the first real customer

- [ ] **Set up the `support@leadersmart.app` mailbox.**
      Google Workspace, Cloudflare Email Routing, or Vercel domain forwarding —
      any of the three is fine.

      The address does not currently receive mail. It is referenced by
      `src/app/settings/transfer-ownership/page.tsx`, which is the only route
      an owner has to request an ownership transfer; the page builds a
      `mailto:` link, so a request sent today reaches nobody and the owner gets
      no bounce and no reply.

      Deferred deliberately: the platform has no real customers yet, so nobody
      can hit it. This stops being acceptable the moment one signs up.

      Not to be confused with the `https://leadersmart.app` fallbacks in
      `admin/users/actions.ts` and `onboarding/actions.ts` — those are the
      last-resort base URL for invite redirect links when `NEXT_PUBLIC_APP_URL`
      and friends are unset. That domain does resolve and serves the app, so
      those are fine as they stand.
