-- Seed the Faithmin inter ministry tenant with pan-African demo data.
--
-- Idempotent and guarded: it refuses a tenant that does not exist, refuses one
-- with rotation enabled (rotation is church-only, so a ministry fixture that
-- carried rotation data would be demonstrating something the product does not
-- offer), and returns without writing if the fixture is already present.
--
-- Every row it writes carries is_test_data = TRUE. That is the whole point:
-- "Esther Mballa, Yaoundé branch" is indistinguishable from a real record by
-- inspection, so the flag — not a name match — is what a purge keys on.
--
-- The eight auth.users exist because leader_development.user_id is NOT NULL and
-- FKs users, which FKs auth.users. They are deliberately unusable as logins:
-- encrypted_password and email_confirmed_at are both left NULL, and the
-- addresses sit on .test, which RFC 2606 reserves and no mail can reach.
--
-- NOTE ON HEADQUARTERS: branches_hq_uniq allows one is_headquarters row per
-- church, so Yaoundé takes that slot only when it is free. If the tenant
-- already has a headquarters of its own, Yaoundé is seeded as a regular branch
-- and the existing row is left alone — seeding does not rewrite data the tenant
-- created itself. Retiring such a placeholder is a decision for whoever owns
-- the tenant, not a side effect of running a seed.

DO $seed$
DECLARE
  v_church UUID; v_owner UUID;
  v_yao UUID; v_dla UUID; v_lag UUID; v_abj UUID; v_acc UUID;
  v_mat2 UUID; v_mat3 UUID; v_ld UUID; v_uid UUID; r RECORD;
  v_hq_free BOOLEAN;
BEGIN
  SELECT id INTO v_church FROM churches
   WHERE name = 'Faithmin inter' AND organization_type = 'ministry';
  IF v_church IS NULL THEN
    RAISE EXCEPTION 'Faithmin inter (ministry) not found — nothing to seed.';
  END IF;

  IF (SELECT rotation_enabled FROM churches WHERE id = v_church) THEN
    RAISE EXCEPTION 'rotation_enabled is TRUE on a ministry tenant — stopping before any write.';
  END IF;

  -- The owner stands in as author and reviewer. Fixture rows still need a real
  -- actor on reviewed_by, or the review surfaces render an empty reviewer.
  SELECT id INTO v_owner FROM users
   WHERE church_id = v_church AND role = 'owner' ORDER BY created_at LIMIT 1;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'No owner on Faithmin inter — reviewed_by would be null.';
  END IF;

  IF EXISTS (SELECT 1 FROM branches WHERE church_id = v_church AND is_test_data) THEN
    RAISE NOTICE 'Fixture already present — skipping.';
    RETURN;
  END IF;

  ---------------------------------------------------------------- accounts
  FOR r IN SELECT * FROM (VALUES
      ('Esther Mballa','esther.mballa'),('Jean-Pierre Fouda','jeanpierre.fouda'),
      ('Christelle Ngassa','christelle.ngassa'),('Chidinma Adeyemi','chidinma.adeyemi'),
      ('Olumide Balogun','olumide.balogun'),('Konan Yao','konan.yao'),
      ('Aya Kouame','aya.kouame'),('Kwame Mensah','kwame.mensah')
    ) AS x(full_name, slug)
  LOOP
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (instance_id,id,aud,role,email,
                            raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    VALUES ('00000000-0000-0000-0000-000000000000', v_uid,'authenticated','authenticated',
            'seed+'||r.slug||'@faithmin.test',
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', r.full_name), NOW(), NOW());
    INSERT INTO users (id,church_id,full_name,email,role,is_active,is_test_data)
    VALUES (v_uid, v_church, r.full_name, 'seed+'||r.slug||'@faithmin.test',
            'department_head', TRUE, TRUE);
  END LOOP;

  ---------------------------------------------------------------- branches
  -- See the headquarters note above.
  SELECT NOT EXISTS (
    SELECT 1 FROM branches WHERE church_id = v_church AND is_headquarters
  ) INTO v_hq_free;

  INSERT INTO branches (church_id,name,country_code,city,is_headquarters,is_test_data) VALUES
    (v_church,'Yaoundé','CM','Yaoundé',v_hq_free,TRUE) RETURNING id INTO v_yao;
  IF NOT v_hq_free THEN
    RAISE NOTICE 'Tenant already has a headquarters — Yaoundé seeded as a regular branch.';
  END IF;
  INSERT INTO branches (church_id,name,country_code,city,is_headquarters,is_test_data) VALUES
    (v_church,'Douala','CM','Douala',FALSE,TRUE) RETURNING id INTO v_dla;
  INSERT INTO branches (church_id,name,country_code,city,is_headquarters,is_test_data) VALUES
    (v_church,'Lagos','NG','Lagos',FALSE,TRUE) RETURNING id INTO v_lag;
  INSERT INTO branches (church_id,name,country_code,city,is_headquarters,is_test_data) VALUES
    (v_church,'Abidjan','CI','Abidjan',FALSE,TRUE) RETURNING id INTO v_abj;
  INSERT INTO branches (church_id,name,country_code,city,is_headquarters,is_test_data) VALUES
    (v_church,'Accra','GH','Accra',FALSE,TRUE) RETURNING id INTO v_acc;

  INSERT INTO zones (branch_id,name,is_test_data) VALUES
    (v_yao,'Nkomkana',TRUE),(v_yao,'Bastos',TRUE),(v_yao,'Mvan',TRUE),
    (v_dla,'Bonapriso',TRUE),(v_dla,'Akwa',TRUE),
    (v_lag,'Ikeja',TRUE),(v_lag,'Lekki',TRUE),(v_lag,'Yaba',TRUE),
    (v_abj,'Cocody',TRUE),(v_abj,'Yopougon',TRUE),
    (v_acc,'East Legon',TRUE),(v_acc,'Osu',TRUE);

  ------------------------------------------------------- leader development
  -- Levels 1–5 are all represented so each level badge has a real occupant.
  -- The branch goes in notes: leader_development has no branch_id.
  FOR r IN SELECT * FROM (VALUES
      ('Esther Mballa',3,'Yaoundé'),('Jean-Pierre Fouda',1,'Yaoundé'),
      ('Christelle Ngassa',2,'Douala'),('Chidinma Adeyemi',4,'Lagos'),
      ('Olumide Balogun',2,'Lagos'),('Konan Yao',3,'Abidjan'),
      ('Aya Kouame',1,'Abidjan'),('Kwame Mensah',5,'Accra')
    ) AS x(full_name, level, branch)
  LOOP
    INSERT INTO leader_development (church_id,user_id,current_level,started_at,
                                    last_level_change_at,is_active,notes,is_test_data)
    SELECT v_church, u.id, r.level,
           NOW() - (r.level * 90 || ' days')::interval,
           NOW() - (r.level * 20 || ' days')::interval,
           TRUE, 'Serving at '||r.branch||' branch.', TRUE
      FROM users u WHERE u.church_id = v_church AND u.full_name = r.full_name;
  END LOOP;

  ------------------------------------------------------------------ events
  -- Three past, three ahead, straddling the seed date so the dashboard's
  -- "upcoming" panel and the completed-event detail view both have rows.
  INSERT INTO events (church_id,branch_id,title,event_type,event_date,start_time,end_time,
                      location,description,coordinator_user_id,status,post_event_notes,
                      completed_at,created_by,is_test_data)
  SELECT v_church, e.branch, e.title, e.etype, e.edate, e.t1, e.t2, e.loc, e.descr,
         u.id, e.status, e.notes, e.done_at, v_owner, TRUE
    FROM (VALUES
      (v_yao,'Pan-African Leaders Summit','conference',DATE '2026-06-12','09:00'::time,'17:00'::time,
       'Palais des Congrès, Yaoundé',
       'Three days with branch leaders from all five national teams. Teaching track in the mornings, zone-by-zone planning in the afternoons.',
       'Esther Mballa','completed',
       'Strong turnout from the francophone branches. The zone planning sessions ran long and the Lagos team asked for the same format locally — see the October workshop.',
       TIMESTAMPTZ '2026-06-14 19:00+01'),
      (v_lag,'West Africa Zone Training','training',DATE '2026-07-18','10:00'::time,'15:00'::time,
       'Ikeja zone hall, Lagos',
       'Zone coordinator training for the Ikeja, Lekki and Yaba teams. Focus on monthly reporting and follow-up.',
       'Chidinma Adeyemi','completed',
       'Reporting walkthrough landed well. Two zones still submit late — raised with the branch lead rather than in the session.',
       TIMESTAMPTZ '2026-07-18 18:00+01'),
      (v_abj,'Francophone Pastors Retreat','retreat',DATE '2026-08-21','08:00'::time,'20:00'::time,
       'Cocody, Abidjan',
       'Two nights away for pastors from the Cameroon and Côte d''Ivoire branches. Rest, prayer and peer review of development plans.',
       'Konan Yao','completed',
       'Quieter than planned — a travel problem kept part of the Douala group away. Worth repeating with earlier notice.',
       TIMESTAMPTZ '2026-08-23 12:00+00'),
      (v_acc,'Accra Leadership Workshop','workshop',DATE '2026-10-24','09:30'::time,'14:00'::time,
       'East Legon, Accra',
       'One-day workshop for the East Legon and Osu zone teams, following the Lagos format requested at the summit.',
       'Kwame Mensah','published',NULL,NULL),
      (v_dla,'Douala Church Planting Campaign','campaign',DATE '2026-11-14','07:00'::time,'18:00'::time,
       'Bonapriso and Akwa, Douala',
       'Two-week outreach across both Douala zones, closing with a joint gathering.',
       'Christelle Ngassa','published',NULL,NULL),
      (v_yao,'Annual Vision Conference','conference',DATE '2026-12-05','09:00'::time,'16:00'::time,
       'Nkomkana, Yaoundé',
       'Year-end gathering: review of the development levels across branches and the plan for the coming year.',
       'Esther Mballa','published',NULL,NULL)
    ) AS e(branch,title,etype,edate,t1,t2,loc,descr,coord,status,notes,done_at)
    JOIN users u ON u.church_id = v_church AND u.full_name = e.coord AND u.is_test_data;

  ---------------------------------------------------------- branch reports
  -- Three months across five branches, with review states spread so the
  -- pending queue, the approved history and a returned report all exist.
  FOR r IN SELECT * FROM (VALUES
    (DATE '2026-07-01','Yaoundé','approved'),(DATE '2026-07-01','Douala','approved'),
    (DATE '2026-07-01','Lagos','approved'),(DATE '2026-07-01','Abidjan','approved'),
    (DATE '2026-07-01','Accra','approved'),
    (DATE '2026-08-01','Yaoundé','approved'),(DATE '2026-08-01','Douala','approved'),
    (DATE '2026-08-01','Lagos','approved'),(DATE '2026-08-01','Abidjan','needs_review'),
    (DATE '2026-08-01','Accra','approved'),
    (DATE '2026-09-01','Yaoundé','approved'),(DATE '2026-09-01','Douala','submitted'),
    (DATE '2026-09-01','Lagos','submitted'),(DATE '2026-09-01','Abidjan','submitted'),
    (DATE '2026-09-01','Accra','draft')
  ) AS x(month, branch, status)
  LOOP
    INSERT INTO branch_reports (branch_id, report_month, status, activities, leadership_updates,
                                wins, challenges, prayer_requests, reviewer_comment,
                                submitted_at, reviewed_at, reviewed_by, created_by, is_test_data)
    SELECT b.id, r.month, r.status,
           'Weekly zone gatherings held as scheduled. Midweek prayer continued in every zone, with one combined service during the month.',
           'Zone leaders met twice. One assistant leader began the next development level; mentoring pairs reviewed at the second meeting.',
           'Attendance steady to slightly up across zones. Several new families followed up after the last outreach.',
           CASE WHEN r.status = 'needs_review'
                THEN 'Transport costs are limiting zone visits, and this report was put together without the Yopougon numbers.'
                ELSE 'Venue capacity is tight in the larger zone on Sundays. Follow-up visits still depend on a few people.' END,
           'For the zone leaders carrying heavy workloads, and for a venue solution in the growing zone.',
           CASE r.status
             WHEN 'approved' THEN 'Received with thanks — clear and on time.'
             WHEN 'needs_review' THEN 'Please add the missing zone before this is approved, and note what the transport shortfall actually blocked.'
             ELSE NULL END,
           -- A draft was never submitted, so it has no submitted_at to claim.
           CASE WHEN r.status = 'draft' THEN NULL ELSE (r.month + INTERVAL '1 month 3 days') END,
           CASE WHEN r.status IN ('approved','needs_review') THEN (r.month + INTERVAL '1 month 6 days') ELSE NULL END,
           CASE WHEN r.status IN ('approved','needs_review') THEN v_owner ELSE NULL END,
           v_owner, TRUE
      FROM branches b
     WHERE b.church_id = v_church AND b.name = r.branch AND b.is_test_data;
  END LOOP;

  ------------------------------------------------------------ submissions
  -- Two, so the mentor queue shows both of its states: one waiting, one
  -- answered. Materials are looked up per tenant — level_materials is
  -- church-scoped, so a hardcoded id would belong to someone else's copy.
  SELECT m.id INTO v_mat2
    FROM level_materials m JOIN level_definitions d ON d.id = m.level_definition_id
   WHERE d.church_id = v_church AND d.level = 2 AND m.assignment_prompt IS NOT NULL
   ORDER BY m.sort_order LIMIT 1;
  SELECT m.id INTO v_mat3
    FROM level_materials m JOIN level_definitions d ON d.id = m.level_definition_id
   WHERE d.church_id = v_church AND d.level = 3 AND m.assignment_prompt IS NOT NULL
   ORDER BY m.sort_order LIMIT 1;

  SELECT l.id INTO v_ld FROM leader_development l JOIN users u ON u.id = l.user_id
   WHERE l.church_id = v_church AND u.full_name = 'Christelle Ngassa' AND l.is_test_data;
  IF v_mat2 IS NOT NULL THEN
    INSERT INTO assignment_responses (leader_development_id, material_id, response_text,
                                      status, submitted_at, is_test_data)
    VALUES (v_ld, v_mat2,
      'Servanthood changed how I run the Bonapriso zone meeting. I used to open with what I needed from the team; now I start by asking what each leader is carrying. The practical change is small — ten minutes at the top of the meeting — but two leaders have since told me about pressures at home I would never have heard about otherwise. Where I still struggle is holding people to a commitment after I have listened to why it is hard. I do not yet know how to be gentle and clear in the same sentence.',
      'submitted', TIMESTAMPTZ '2026-09-22 20:15+01', TRUE);
  END IF;

  SELECT l.id INTO v_ld FROM leader_development l JOIN users u ON u.id = l.user_id
   WHERE l.church_id = v_church AND u.full_name = 'Konan Yao' AND l.is_test_data;
  IF v_mat3 IS NOT NULL THEN
    INSERT INTO assignment_responses (leader_development_id, material_id, response_text, status,
                                      reviewer_comment, reviewed_by, reviewed_at,
                                      submitted_at, is_test_data)
    VALUES (v_ld, v_mat3,
      'The hardest part of delegation for me was accepting that the first attempt would be worse than if I had done it myself. I handed the Yopougon follow-up list to an assistant leader in July. Two families were missed in the first week. My instinct was to take it back. Instead we sat down, looked at how he was tracking the list, and changed it. By August nothing was being missed and he was training someone else. I would not have got that outcome by keeping the list.',
      'reviewed',
      'This is the right lesson and you paid for it properly. Keep the part where you fixed the system with him rather than for him — that is what made it stick. For the next level, think about how you would hand over something you care about more than a follow-up list.',
      v_owner, TIMESTAMPTZ '2026-09-02 09:40+00', TIMESTAMPTZ '2026-08-28 18:30+00', TRUE);
  END IF;

  RAISE NOTICE 'Faithmin inter seeded: 8 accounts, 5 branches, 12 zones, 8 leaders, 6 events, 15 reports, 2 submissions.';
END
$seed$;

-- Confirm what landed, per table.
--
-- Counted inline rather than through a view. test_data_summary was dropped as
-- a SECURITY DEFINER view that reported every tenant, and test_data_counts()
-- is no substitute here: it scopes to auth.uid(), which is NULL when this
-- script runs on a service-role connection, so it would report zeros.
WITH ch AS (
  SELECT id FROM churches
   WHERE name = 'Faithmin inter' AND organization_type = 'ministry'
)
SELECT 'users' AS table_name, count(*) AS test_rows
  FROM users WHERE church_id = (SELECT id FROM ch) AND is_test_data
UNION ALL
SELECT 'branches', count(*)
  FROM branches WHERE church_id = (SELECT id FROM ch) AND is_test_data
UNION ALL
SELECT 'zones', count(*)
  FROM zones z JOIN branches b ON b.id = z.branch_id
 WHERE b.church_id = (SELECT id FROM ch) AND z.is_test_data
UNION ALL
SELECT 'leader_development', count(*)
  FROM leader_development WHERE church_id = (SELECT id FROM ch) AND is_test_data
UNION ALL
SELECT 'events', count(*)
  FROM events WHERE church_id = (SELECT id FROM ch) AND is_test_data
UNION ALL
SELECT 'branch_reports', count(*)
  FROM branch_reports r JOIN branches b ON b.id = r.branch_id
 WHERE b.church_id = (SELECT id FROM ch) AND r.is_test_data
UNION ALL
SELECT 'assignment_responses', count(*)
  FROM assignment_responses a
       JOIN leader_development l ON l.id = a.leader_development_id
 WHERE l.church_id = (SELECT id FROM ch) AND a.is_test_data
ORDER BY table_name;
