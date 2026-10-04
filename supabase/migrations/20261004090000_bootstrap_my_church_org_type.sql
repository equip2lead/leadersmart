-- Let bootstrap_my_church record the organization type at creation.
--
-- WHY: the function never touched organization_type, so every tenant it
-- created took the column default ('church') and the type was only ever
-- corrected later, at onboarding step 0. A Google-first owner therefore typed
-- a name before anything had asked what kind of organisation it was — which is
-- how "Love of God ministry" came to exist as organization_type = 'church'.
--
-- Also stamps user_onboarding_progress.org_type_selected_at, so a type chosen
-- at /welcome is not asked again fifteen seconds later by the wizard's step 0.
-- Without this the owner answers the same question twice, and the second
-- answer silently overrides the first.
--
-- DROP then CREATE, not CREATE OR REPLACE: a fourth parameter changes the
-- signature, so replace would leave the 3-argument version in place as an
-- overload and every existing 3-argument call would become ambiguous. Both
-- current call sites (the dashboard recovery path and /welcome) pass named
-- arguments and keep working against the new default.

DROP FUNCTION IF EXISTS public.bootstrap_my_church(text, text, text);

CREATE OR REPLACE FUNCTION public.bootstrap_my_church(
  p_church_name text,
  p_full_name   text,
  p_language    text DEFAULT 'en',
  p_org_type    text DEFAULT 'church'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_user_id      uuid := auth.uid();
  v_email        text;
  v_church_id    uuid;
  v_app_meta     jsonb;
  v_invite_church uuid;
  v_invite_role  text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_org_type NOT IN ('church', 'ministry') THEN
    RAISE EXCEPTION 'Invalid organization type: %', p_org_type;
  END IF;

  SELECT email, raw_app_meta_data
    INTO v_email, v_app_meta
    FROM auth.users
    WHERE id = v_user_id;

  -- Idempotent: already provisioned.
  SELECT church_id INTO v_church_id FROM public.users WHERE id = v_user_id;
  IF v_church_id IS NOT NULL THEN
    RETURN v_church_id;
  END IF;

  -- Invited-user path: link to the inviting church, honour the invited role.
  -- organization_type is untouched here — the church already exists and is
  -- not this user's to reclassify.
  IF v_app_meta ? 'inviting_church_id' THEN
    v_invite_church := (v_app_meta->>'inviting_church_id')::uuid;
    v_invite_role   := coalesce(v_app_meta->>'invited_role', 'department_leader');

    -- Sanity check: church must exist.
    IF NOT EXISTS (SELECT 1 FROM public.churches WHERE id = v_invite_church) THEN
      RAISE EXCEPTION 'Inviting church not found';
    END IF;

    INSERT INTO public.users (id, church_id, full_name, email, role, preferred_language)
    VALUES (
      v_user_id,
      v_invite_church,
      coalesce(p_full_name, v_app_meta->>'invited_full_name', v_email),
      v_email,
      v_invite_role::public.user_role,
      p_language::public.app_language
    );

    RETURN v_invite_church;
  END IF;

  -- Self-signup path: brand-new church.
  IF p_church_name IS NULL OR btrim(p_church_name) = '' THEN
    RAISE EXCEPTION 'Church name required';
  END IF;

  INSERT INTO public.churches (name, language, organization_type)
    VALUES (
      p_church_name,
      p_language::public.app_language,
      p_org_type::public.organization_type
    )
    RETURNING id INTO v_church_id;

  -- 'owner', not the legacy 'senior_pastor'. The Phase 2 role rename
  -- converted existing rows but left this function minting the old value,
  -- so every self-signup since then failed the owner-only gates: the
  -- dashboard never routed them into the wizard, and /onboarding's layout
  -- bounced them straight back out. 'senior_pastor' cannot simply be added
  -- to OWNER_ROLES instead — pre-migration it meant either owner or
  -- admin_pastor, so it is ambiguous by design.
  INSERT INTO public.users (id, church_id, full_name, email, role, preferred_language)
    VALUES (
      v_user_id,
      v_church_id,
      p_full_name,
      v_email,
      'owner'::public.user_role,
      p_language::public.app_language
    );

  -- Record that the type question is answered, so the wizard skips step 0.
  -- The progress row would otherwise be created on the first /onboarding hit
  -- with a null stamp, and the decision page would ask again.
  INSERT INTO public.user_onboarding_progress (user_id, church_id, org_type_selected_at)
    VALUES (v_user_id, v_church_id, now())
  ON CONFLICT (user_id) DO UPDATE
    SET org_type_selected_at = coalesce(
          public.user_onboarding_progress.org_type_selected_at, now()
        );

  RETURN v_church_id;
END;
$function$;

COMMENT ON FUNCTION public.bootstrap_my_church(text, text, text, text) IS
  'Creates a tenant and its owner row, or links an invited user to the inviting church. p_org_type applies to the self-signup path only and marks onboarding step 0 as answered.';

REVOKE ALL ON FUNCTION public.bootstrap_my_church(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_my_church(text, text, text, text) TO authenticated;
