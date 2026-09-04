-- Default leadership development content, applied to every tenant
-- (churches and ministries alike).
--
-- Source: FIRE Bible Institute "Spiritual Leadership" (Yaounde, Cameroon),
-- which teaches John Maxwell's Five Levels of Leadership. Mapped onto the
-- existing Foundation / Growing / Leading / Multiplying / Mentoring level
-- names; titles are NOT overwritten, only descriptions and the French
-- title translation are set.
--
-- Idempotent: descriptions are set unconditionally (they are ours to own),
-- while every child row is guarded by NOT EXISTS on
-- (level_definition_id, name|title) so a re-run inserts nothing and a
-- church's own additions are never touched.

BEGIN;

-- ── Level 1 ──────────────────────────────────────────────────────
UPDATE level_definitions
   SET description    = 'Learning the basics of faith, character, and what it means to serve. New volunteers begin here — knowing their role, showing up faithfully, and doing small things with excellence.',
       description_fr = 'Apprendre les bases de la foi, du caractère et de ce que signifie servir. Les nouveaux bénévoles commencent ici — connaître leur rôle, être présents fidèlement, et faire les petites choses avec excellence.',
       title_fr       = 'Fondation',
       updated_at     = now()
 WHERE level = 1;
INSERT INTO level_competencies (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Know your role and responsibilities thoroughly', 'Connaissez votre rôle et vos responsabilités en profondeur', 1
  FROM level_definitions ld
 WHERE ld.level = 1
   AND NOT EXISTS (SELECT 1 FROM level_competencies lc
                    WHERE lc.level_definition_id = ld.id AND lc.name = 'Know your role and responsibilities thoroughly');
INSERT INTO level_competencies (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Understand how your role connects to the church or ministry''s mission', 'Comprenez comment votre rôle est lié à la mission de l''église ou du ministère', 2
  FROM level_definitions ld
 WHERE ld.level = 1
   AND NOT EXISTS (SELECT 1 FROM level_competencies lc
                    WHERE lc.level_definition_id = ld.id AND lc.name = 'Understand how your role connects to the church or ministry''s mission');
INSERT INTO level_competencies (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Serve with consistent excellence — even in small things', 'Servez avec une excellence constante — même dans les petites choses', 3
  FROM level_definitions ld
 WHERE ld.level = 1
   AND NOT EXISTS (SELECT 1 FROM level_competencies lc
                    WHERE lc.level_definition_id = ld.id AND lc.name = 'Serve with consistent excellence — even in small things');
INSERT INTO level_competencies (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Accept responsibility willingly, without excuses', 'Acceptez la responsabilité volontiers, sans excuses', 4
  FROM level_definitions ld
 WHERE ld.level = 1
   AND NOT EXISTS (SELECT 1 FROM level_competencies lc
                    WHERE lc.level_definition_id = ld.id AND lc.name = 'Accept responsibility willingly, without excuses');
INSERT INTO level_materials (level_definition_id, title, title_fr, material_type, sort_order)
SELECT ld.id, 'Spiritual Leadership (FIRE Bible Institute) — Lesson 1: Introductory Leadership Concepts', 'Leadership Spirituel (FIRE Bible Institute) — Leçon 1: Concepts introductifs du leadership', 'book', 1
  FROM level_definitions ld
 WHERE ld.level = 1
   AND NOT EXISTS (SELECT 1 FROM level_materials lm
                    WHERE lm.level_definition_id = ld.id AND lm.title = 'Spiritual Leadership (FIRE Bible Institute) — Lesson 1: Introductory Leadership Concepts');
INSERT INTO level_materials (level_definition_id, title, title_fr, material_type, sort_order)
SELECT ld.id, 'Spiritual Leadership — Lesson 2: Five Levels of Leadership', 'Leadership Spirituel — Leçon 2: Les cinq niveaux du leadership', 'book', 2
  FROM level_definitions ld
 WHERE ld.level = 1
   AND NOT EXISTS (SELECT 1 FROM level_materials lm
                    WHERE lm.level_definition_id = ld.id AND lm.title = 'Spiritual Leadership — Lesson 2: Five Levels of Leadership');
INSERT INTO level_materials (level_definition_id, title, title_fr, material_type, sort_order)
SELECT ld.id, 'Scripture study: Romans 12:8 — the gift of leadership', 'Étude biblique: Romains 12:8 — le don du leadership', 'article', 3
  FROM level_definitions ld
 WHERE ld.level = 1
   AND NOT EXISTS (SELECT 1 FROM level_materials lm
                    WHERE lm.level_definition_id = ld.id AND lm.title = 'Scripture study: Romans 12:8 — the gift of leadership');
INSERT INTO level_materials (level_definition_id, title, title_fr, material_type, sort_order)
SELECT ld.id, 'Maxwell''s 21 Laws — Law 1 (The Law of the Lid) and Law 3 (The Law of Process)', 'Les 21 Lois de Maxwell — Loi 1 (La loi du couvercle) et Loi 3 (La loi du processus)', 'book', 4
  FROM level_definitions ld
 WHERE ld.level = 1
   AND NOT EXISTS (SELECT 1 FROM level_materials lm
                    WHERE lm.level_definition_id = ld.id AND lm.title = 'Maxwell''s 21 Laws — Law 1 (The Law of the Lid) and Law 3 (The Law of Process)');
INSERT INTO level_milestones (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Complete a personal leadership inventory (identify your strengths and weaknesses)', 'Complétez un inventaire personnel de leadership (identifiez vos forces et faiblesses)', 1
  FROM level_definitions ld
 WHERE ld.level = 1
   AND NOT EXISTS (SELECT 1 FROM level_milestones lm
                    WHERE lm.level_definition_id = ld.id AND lm.name = 'Complete a personal leadership inventory (identify your strengths and weaknesses)');
INSERT INTO level_milestones (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Serve faithfully in your assigned role for 3 consecutive months', 'Servez fidèlement dans votre rôle assigné pendant 3 mois consécutifs', 2
  FROM level_definitions ld
 WHERE ld.level = 1
   AND NOT EXISTS (SELECT 1 FROM level_milestones lm
                    WHERE lm.level_definition_id = ld.id AND lm.name = 'Serve faithfully in your assigned role for 3 consecutive months');
INSERT INTO level_milestones (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Own a mistake publicly — no blame-shifting', 'Assumez publiquement une erreur — sans rejeter la faute', 3
  FROM level_definitions ld
 WHERE ld.level = 1
   AND NOT EXISTS (SELECT 1 FROM level_milestones lm
                    WHERE lm.level_definition_id = ld.id AND lm.name = 'Own a mistake publicly — no blame-shifting');

-- ── Level 2 ──────────────────────────────────────────────────────
UPDATE level_definitions
   SET description    = 'Actively participating and being discipled. You are building genuine relationships with those you serve alongside, learning empathy, and leading by relationship rather than by title.',
       description_fr = 'Participation active et formation en tant que disciple. Vous construisez de véritables relations avec ceux qui servent à vos côtés, apprenez l''empathie et dirigez par la relation plutôt que par le titre.',
       title_fr       = 'Croissance',
       updated_at     = now()
 WHERE level = 2;
INSERT INTO level_competencies (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Genuinely love the people you serve alongside', 'Aimez véritablement les personnes avec qui vous servez', 1
  FROM level_definitions ld
 WHERE ld.level = 2
   AND NOT EXISTS (SELECT 1 FROM level_competencies lc
                    WHERE lc.level_definition_id = ld.id AND lc.name = 'Genuinely love the people you serve alongside');
INSERT INTO level_competencies (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'See through other people''s eyes (empathy)', 'Voyez à travers les yeux des autres (empathie)', 2
  FROM level_definitions ld
 WHERE ld.level = 2
   AND NOT EXISTS (SELECT 1 FROM level_competencies lc
                    WHERE lc.level_definition_id = ld.id AND lc.name = 'See through other people''s eyes (empathy)');
INSERT INTO level_competencies (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Make those around you more successful', 'Faites en sorte que ceux qui vous entourent réussissent', 3
  FROM level_definitions ld
 WHERE ld.level = 2
   AND NOT EXISTS (SELECT 1 FROM level_competencies lc
                    WHERE lc.level_definition_id = ld.id AND lc.name = 'Make those around you more successful');
INSERT INTO level_competencies (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Practice win-win solutions in conflict', 'Pratiquez des solutions gagnant-gagnant dans les conflits', 4
  FROM level_definitions ld
 WHERE ld.level = 2
   AND NOT EXISTS (SELECT 1 FROM level_competencies lc
                    WHERE lc.level_definition_id = ld.id AND lc.name = 'Practice win-win solutions in conflict');
INSERT INTO level_competencies (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Include others in your journey — don''t grow alone', 'Incluez les autres dans votre parcours — ne grandissez pas seul', 5
  FROM level_definitions ld
 WHERE ld.level = 2
   AND NOT EXISTS (SELECT 1 FROM level_competencies lc
                    WHERE lc.level_definition_id = ld.id AND lc.name = 'Include others in your journey — don''t grow alone');
INSERT INTO level_materials (level_definition_id, title, title_fr, material_type, sort_order)
SELECT ld.id, 'Spiritual Leadership — Lesson 6: Biblical Leadership (servanthood)', 'Leadership Spirituel — Leçon 6: Leadership biblique (service)', 'book', 1
  FROM level_definitions ld
 WHERE ld.level = 2
   AND NOT EXISTS (SELECT 1 FROM level_materials lm
                    WHERE lm.level_definition_id = ld.id AND lm.title = 'Spiritual Leadership — Lesson 6: Biblical Leadership (servanthood)');
INSERT INTO level_materials (level_definition_id, title, title_fr, material_type, sort_order)
SELECT ld.id, 'Spiritual Leadership — Lesson 11: Communication and Motivation', 'Leadership Spirituel — Leçon 11: Communication et motivation', 'book', 2
  FROM level_definitions ld
 WHERE ld.level = 2
   AND NOT EXISTS (SELECT 1 FROM level_materials lm
                    WHERE lm.level_definition_id = ld.id AND lm.title = 'Spiritual Leadership — Lesson 11: Communication and Motivation');
INSERT INTO level_materials (level_definition_id, title, title_fr, material_type, sort_order)
SELECT ld.id, 'Maxwell''s 21 Laws — Law 4 (Navigation) and Law 10 (Connection)', 'Les 21 Lois de Maxwell — Loi 4 (Navigation) et Loi 10 (Connexion)', 'book', 3
  FROM level_definitions ld
 WHERE ld.level = 2
   AND NOT EXISTS (SELECT 1 FROM level_materials lm
                    WHERE lm.level_definition_id = ld.id AND lm.title = 'Maxwell''s 21 Laws — Law 4 (Navigation) and Law 10 (Connection)');
INSERT INTO level_materials (level_definition_id, title, title_fr, material_type, sort_order)
SELECT ld.id, 'Scripture study: Philippians 2:3-4 — consider others better than yourselves', 'Étude biblique: Philippiens 2:3-4 — considérez les autres comme supérieurs à vous-mêmes', 'article', 4
  FROM level_definitions ld
 WHERE ld.level = 2
   AND NOT EXISTS (SELECT 1 FROM level_materials lm
                    WHERE lm.level_definition_id = ld.id AND lm.title = 'Scripture study: Philippians 2:3-4 — consider others better than yourselves');
INSERT INTO level_milestones (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Have meaningful 1-on-1 conversations with everyone you serve alongside this month', 'Ayez des conversations personnelles significatives avec chaque personne avec qui vous servez ce mois-ci', 1
  FROM level_definitions ld
 WHERE ld.level = 2
   AND NOT EXISTS (SELECT 1 FROM level_milestones lm
                    WHERE lm.level_definition_id = ld.id AND lm.name = 'Have meaningful 1-on-1 conversations with everyone you serve alongside this month');
INSERT INTO level_milestones (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Resolve one conflict using a win-win approach', 'Résolvez un conflit en utilisant une approche gagnant-gagnant', 2
  FROM level_definitions ld
 WHERE ld.level = 2
   AND NOT EXISTS (SELECT 1 FROM level_milestones lm
                    WHERE lm.level_definition_id = ld.id AND lm.name = 'Resolve one conflict using a win-win approach');
INSERT INTO level_milestones (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Give credit publicly to someone you serve alongside', 'Reconnaissez publiquement le mérite de quelqu''un avec qui vous servez', 3
  FROM level_definitions ld
 WHERE ld.level = 2
   AND NOT EXISTS (SELECT 1 FROM level_milestones lm
                    WHERE lm.level_definition_id = ld.id AND lm.name = 'Give credit publicly to someone you serve alongside');
INSERT INTO level_milestones (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Ask 3 people: How can I serve you better?', 'Demandez à 3 personnes: Comment puis-je mieux vous servir?', 4
  FROM level_definitions ld
 WHERE ld.level = 2
   AND NOT EXISTS (SELECT 1 FROM level_milestones lm
                    WHERE lm.level_definition_id = ld.id AND lm.name = 'Ask 3 people: How can I serve you better?');

-- ── Level 3 ──────────────────────────────────────────────────────
UPDATE level_definitions
   SET description    = 'Leading a small team or ministry area. You cast a clear vision, set measurable goals, align resources under a purpose, and take accountability for results — starting with yourself.',
       description_fr = 'Diriger une petite équipe ou un domaine ministériel. Vous portez une vision claire, fixez des objectifs mesurables, alignez les ressources sous un objectif et prenez la responsabilité des résultats — en commençant par vous-même.',
       title_fr       = 'Diriger',
       updated_at     = now()
 WHERE level = 3;
INSERT INTO level_competencies (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Develop a clear Statement of Purpose that calls for growth', 'Développez une déclaration d''objectifs claire qui appelle à la croissance', 1
  FROM level_definitions ld
 WHERE ld.level = 3
   AND NOT EXISTS (SELECT 1 FROM level_competencies lc
                    WHERE lc.level_definition_id = ld.id AND lc.name = 'Develop a clear Statement of Purpose that calls for growth');
INSERT INTO level_competencies (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Align your team''s resources under that purpose', 'Alignez les ressources de votre équipe sous cet objectif', 2
  FROM level_definitions ld
 WHERE ld.level = 3
   AND NOT EXISTS (SELECT 1 FROM level_competencies lc
                    WHERE lc.level_definition_id = ld.id AND lc.name = 'Align your team''s resources under that purpose');
INSERT INTO level_competencies (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Establish accountability for results — starting with yourself', 'Établissez la responsabilité des résultats — en commençant par vous-même', 3
  FROM level_definitions ld
 WHERE ld.level = 3
   AND NOT EXISTS (SELECT 1 FROM level_competencies lc
                    WHERE lc.level_definition_id = ld.id AND lc.name = 'Establish accountability for results — starting with yourself');
INSERT INTO level_competencies (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Know and do the high-return activities (80/20 principle)', 'Connaissez et faites les activités à haut rendement (principe 80/20)', 4
  FROM level_definitions ld
 WHERE ld.level = 3
   AND NOT EXISTS (SELECT 1 FROM level_competencies lc
                    WHERE lc.level_definition_id = ld.id AND lc.name = 'Know and do the high-return activities (80/20 principle)');
INSERT INTO level_competencies (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Become a change agent with a sense of timing', 'Devenez un agent de changement avec le sens du timing', 5
  FROM level_definitions ld
 WHERE ld.level = 3
   AND NOT EXISTS (SELECT 1 FROM level_competencies lc
                    WHERE lc.level_definition_id = ld.id AND lc.name = 'Become a change agent with a sense of timing');
INSERT INTO level_materials (level_definition_id, title, title_fr, material_type, sort_order)
SELECT ld.id, 'Spiritual Leadership — Lesson 4: Visionary Leadership', 'Leadership Spirituel — Leçon 4: Leadership visionnaire', 'book', 1
  FROM level_definitions ld
 WHERE ld.level = 3
   AND NOT EXISTS (SELECT 1 FROM level_materials lm
                    WHERE lm.level_definition_id = ld.id AND lm.title = 'Spiritual Leadership — Lesson 4: Visionary Leadership');
INSERT INTO level_materials (level_definition_id, title, title_fr, material_type, sort_order)
SELECT ld.id, 'Spiritual Leadership — Lesson 30: The Law of Priorities', 'Leadership Spirituel — Leçon 30: La loi des priorités', 'book', 2
  FROM level_definitions ld
 WHERE ld.level = 3
   AND NOT EXISTS (SELECT 1 FROM level_materials lm
                    WHERE lm.level_definition_id = ld.id AND lm.title = 'Spiritual Leadership — Lesson 30: The Law of Priorities');
INSERT INTO level_materials (level_definition_id, title, title_fr, material_type, sort_order)
SELECT ld.id, 'Spiritual Leadership — Lesson 36: Budgets and Financial Matters', 'Leadership Spirituel — Leçon 36: Budgets et questions financières', 'book', 3
  FROM level_definitions ld
 WHERE ld.level = 3
   AND NOT EXISTS (SELECT 1 FROM level_materials lm
                    WHERE lm.level_definition_id = ld.id AND lm.title = 'Spiritual Leadership — Lesson 36: Budgets and Financial Matters');
INSERT INTO level_materials (level_definition_id, title, title_fr, material_type, sort_order)
SELECT ld.id, 'Scripture study: Nehemiah 2:17-18 — casting vision and rallying action', 'Étude biblique: Néhémie 2:17-18 — proclamer la vision et mobiliser l''action', 'article', 4
  FROM level_definitions ld
 WHERE ld.level = 3
   AND NOT EXISTS (SELECT 1 FROM level_materials lm
                    WHERE lm.level_definition_id = ld.id AND lm.title = 'Scripture study: Nehemiah 2:17-18 — casting vision and rallying action');
INSERT INTO level_milestones (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Set a measurable ministry goal and achieve it within one quarter', 'Fixez un objectif ministériel mesurable et atteignez-le dans un trimestre', 1
  FROM level_definitions ld
 WHERE ld.level = 3
   AND NOT EXISTS (SELECT 1 FROM level_milestones lm
                    WHERE lm.level_definition_id = ld.id AND lm.name = 'Set a measurable ministry goal and achieve it within one quarter');
INSERT INTO level_milestones (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Complete a personal priorities audit (80/20 analysis)', 'Effectuez un audit personnel des priorités (analyse 80/20)', 2
  FROM level_definitions ld
 WHERE ld.level = 3
   AND NOT EXISTS (SELECT 1 FROM level_milestones lm
                    WHERE lm.level_definition_id = ld.id AND lm.name = 'Complete a personal priorities audit (80/20 analysis)');
INSERT INTO level_milestones (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Lead a change initiative that produced visible results', 'Dirigez une initiative de changement qui a produit des résultats visibles', 3
  FROM level_definitions ld
 WHERE ld.level = 3
   AND NOT EXISTS (SELECT 1 FROM level_milestones lm
                    WHERE lm.level_definition_id = ld.id AND lm.name = 'Lead a change initiative that produced visible results');
INSERT INTO level_milestones (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Manage a budget successfully from proposal to execution', 'Gérez un budget avec succès, de la proposition à l''exécution', 4
  FROM level_definitions ld
 WHERE ld.level = 3
   AND NOT EXISTS (SELECT 1 FROM level_milestones lm
                    WHERE lm.level_definition_id = ld.id AND lm.name = 'Manage a budget successfully from proposal to execution');

-- ── Level 4 ──────────────────────────────────────────────────────
UPDATE level_definitions
   SET description    = 'Developing other leaders under you. Your top priority shifts from doing the work to reproducing yourself in others. You invest deeply in the top 20% of potential leaders around you.',
       description_fr = 'Développer d''autres leaders sous votre direction. Votre priorité passe de faire le travail à vous reproduire chez les autres. Vous investissez profondément dans les 20% de leaders potentiels autour de vous.',
       title_fr       = 'Multiplication',
       updated_at     = now()
 WHERE level = 4;
INSERT INTO level_competencies (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Place top priority on developing people (your most valuable asset)', 'Placez la priorité absolue sur le développement des personnes (votre atout le plus précieux)', 1
  FROM level_definitions ld
 WHERE ld.level = 4
   AND NOT EXISTS (SELECT 1 FROM level_competencies lc
                    WHERE lc.level_definition_id = ld.id AND lc.name = 'Place top priority on developing people (your most valuable asset)');
INSERT INTO level_competencies (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Model what you want to see reproduced', 'Modélisez ce que vous voulez voir reproduit', 2
  FROM level_definitions ld
 WHERE ld.level = 4
   AND NOT EXISTS (SELECT 1 FROM level_competencies lc
                    WHERE lc.level_definition_id = ld.id AND lc.name = 'Model what you want to see reproduced');
INSERT INTO level_competencies (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Pour leadership efforts into your top 20% of potential leaders', 'Investissez vos efforts de leadership dans vos 20% de leaders potentiels', 3
  FROM level_definitions ld
 WHERE ld.level = 4
   AND NOT EXISTS (SELECT 1 FROM level_competencies lc
                    WHERE lc.level_definition_id = ld.id AND lc.name = 'Pour leadership efforts into your top 20% of potential leaders');
INSERT INTO level_competencies (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Practice the 5-step equipping process (I do it, we do it, they do it, they do it with someone)', 'Pratiquez le processus d''équipement en 5 étapes (Je le fais, Nous le faisons, Ils le font, Ils le font avec quelqu''un)', 4
  FROM level_definitions ld
 WHERE ld.level = 4
   AND NOT EXISTS (SELECT 1 FROM level_competencies lc
                    WHERE lc.level_definition_id = ld.id AND lc.name = 'Practice the 5-step equipping process (I do it, we do it, they do it, they do it with someone)');
INSERT INTO level_competencies (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Surround yourself with those who complement your leadership', 'Entourez-vous de personnes qui complètent votre leadership', 5
  FROM level_definitions ld
 WHERE ld.level = 4
   AND NOT EXISTS (SELECT 1 FROM level_competencies lc
                    WHERE lc.level_definition_id = ld.id AND lc.name = 'Surround yourself with those who complement your leadership');
INSERT INTO level_materials (level_definition_id, title, title_fr, material_type, sort_order)
SELECT ld.id, 'Spiritual Leadership — Lesson 5: Leadership Development', 'Leadership Spirituel — Leçon 5: Développement du leadership', 'book', 1
  FROM level_definitions ld
 WHERE ld.level = 4
   AND NOT EXISTS (SELECT 1 FROM level_materials lm
                    WHERE lm.level_definition_id = ld.id AND lm.title = 'Spiritual Leadership — Lesson 5: Leadership Development');
INSERT INTO level_materials (level_definition_id, title, title_fr, material_type, sort_order)
SELECT ld.id, 'Spiritual Leadership — Lesson 25: The Law of Empowerment', 'Leadership Spirituel — Leçon 25: La loi de l''autonomisation', 'book', 2
  FROM level_definitions ld
 WHERE ld.level = 4
   AND NOT EXISTS (SELECT 1 FROM level_materials lm
                    WHERE lm.level_definition_id = ld.id AND lm.title = 'Spiritual Leadership — Lesson 25: The Law of Empowerment');
INSERT INTO level_materials (level_definition_id, title, title_fr, material_type, sort_order)
SELECT ld.id, 'Spiritual Leadership — Lesson 26: The Law of Reproduction', 'Leadership Spirituel — Leçon 26: La loi de la reproduction', 'book', 3
  FROM level_definitions ld
 WHERE ld.level = 4
   AND NOT EXISTS (SELECT 1 FROM level_materials lm
                    WHERE lm.level_definition_id = ld.id AND lm.title = 'Spiritual Leadership — Lesson 26: The Law of Reproduction');
INSERT INTO level_materials (level_definition_id, title, title_fr, material_type, sort_order)
SELECT ld.id, 'Scripture study: 2 Timothy 2:2 — entrust to reliable people who will teach others', 'Étude biblique: 2 Timothée 2:2 — confiez à des personnes fidèles capables d''enseigner les autres', 'article', 4
  FROM level_definitions ld
 WHERE ld.level = 4
   AND NOT EXISTS (SELECT 1 FROM level_materials lm
                    WHERE lm.level_definition_id = ld.id AND lm.title = 'Scripture study: 2 Timothy 2:2 — entrust to reliable people who will teach others');
INSERT INTO level_milestones (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Identify 3 potential leaders and begin actively mentoring them', 'Identifiez 3 leaders potentiels et commencez à les mentorer activement', 1
  FROM level_definitions ld
 WHERE ld.level = 4
   AND NOT EXISTS (SELECT 1 FROM level_milestones lm
                    WHERE lm.level_definition_id = ld.id AND lm.name = 'Identify 3 potential leaders and begin actively mentoring them');
INSERT INTO level_milestones (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Reproduce yourself in at least 1 person who can now do what you do', 'Reproduisez-vous en au moins 1 personne qui peut maintenant faire ce que vous faites', 2
  FROM level_definitions ld
 WHERE ld.level = 4
   AND NOT EXISTS (SELECT 1 FROM level_milestones lm
                    WHERE lm.level_definition_id = ld.id AND lm.name = 'Reproduce yourself in at least 1 person who can now do what you do');
INSERT INTO level_milestones (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Delegate a significant responsibility fully — no rescue', 'Déléguez pleinement une responsabilité importante — sans intervenir', 3
  FROM level_definitions ld
 WHERE ld.level = 4
   AND NOT EXISTS (SELECT 1 FROM level_milestones lm
                    WHERE lm.level_definition_id = ld.id AND lm.name = 'Delegate a significant responsibility fully — no rescue');
INSERT INTO level_milestones (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'See one of your mentees advance to Level 2 or higher', 'Voyez l''un de vos mentorés progresser au Niveau 2 ou plus', 4
  FROM level_definitions ld
 WHERE ld.level = 4
   AND NOT EXISTS (SELECT 1 FROM level_milestones lm
                    WHERE lm.level_definition_id = ld.id AND lm.name = 'See one of your mentees advance to Level 2 or higher');

-- ── Level 5 ──────────────────────────────────────────────────────
UPDATE level_definitions
   SET description    = 'Coaching multiple leaders across ministries. Your character and reputation now precede you. You are producing generations of leaders. Reserved for those who have spent years growing people — few reach this level.',
       description_fr = 'Coacher plusieurs leaders à travers les ministères. Votre caractère et votre réputation vous précèdent. Vous produisez des générations de leaders. Réservé à ceux qui ont passé des années à développer les gens — peu atteignent ce niveau.',
       title_fr       = 'Mentorat',
       updated_at     = now()
 WHERE level = 5;
INSERT INTO level_competencies (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Live as a faithful servant of the Lord', 'Vivez comme un serviteur fidèle du Seigneur', 1
  FROM level_definitions ld
 WHERE ld.level = 5
   AND NOT EXISTS (SELECT 1 FROM level_competencies lc
                    WHERE lc.level_definition_id = ld.id AND lc.name = 'Live as a faithful servant of the Lord');
INSERT INTO level_competencies (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Model a life of consistent integrity', 'Modélisez une vie d''intégrité constante', 2
  FROM level_definitions ld
 WHERE ld.level = 5
   AND NOT EXISTS (SELECT 1 FROM level_competencies lc
                    WHERE lc.level_definition_id = ld.id AND lc.name = 'Model a life of consistent integrity');
INSERT INTO level_competencies (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Be a consistent producer of leaders over the years', 'Soyez un producteur constant de leaders au fil des années', 3
  FROM level_definitions ld
 WHERE ld.level = 5
   AND NOT EXISTS (SELECT 1 FROM level_competencies lc
                    WHERE lc.level_definition_id = ld.id AND lc.name = 'Be a consistent producer of leaders over the years');
INSERT INTO level_competencies (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Carry spiritual and moral authority earned over time', 'Portez une autorité spirituelle et morale gagnée avec le temps', 4
  FROM level_definitions ld
 WHERE ld.level = 5
   AND NOT EXISTS (SELECT 1 FROM level_competencies lc
                    WHERE lc.level_definition_id = ld.id AND lc.name = 'Carry spiritual and moral authority earned over time');
INSERT INTO level_materials (level_definition_id, title, title_fr, material_type, sort_order)
SELECT ld.id, 'Spiritual Leadership — Lesson 34: The Law of Legacy', 'Leadership Spirituel — Leçon 34: La loi de l''héritage', 'book', 1
  FROM level_definitions ld
 WHERE ld.level = 5
   AND NOT EXISTS (SELECT 1 FROM level_materials lm
                    WHERE lm.level_definition_id = ld.id AND lm.title = 'Spiritual Leadership — Lesson 34: The Law of Legacy');
INSERT INTO level_materials (level_definition_id, title, title_fr, material_type, sort_order)
SELECT ld.id, 'Spiritual Leadership — Lesson 37: Conclusion', 'Leadership Spirituel — Leçon 37: Conclusion', 'book', 2
  FROM level_definitions ld
 WHERE ld.level = 5
   AND NOT EXISTS (SELECT 1 FROM level_materials lm
                    WHERE lm.level_definition_id = ld.id AND lm.title = 'Spiritual Leadership — Lesson 37: Conclusion');
INSERT INTO level_materials (level_definition_id, title, title_fr, material_type, sort_order)
SELECT ld.id, 'Scripture study: 2 Timothy 4:7 — I have fought the good fight, finished the race, kept the faith', 'Étude biblique: 2 Timothée 4:7 — j''ai combattu le bon combat, j''ai achevé la course, j''ai gardé la foi', 'article', 3
  FROM level_definitions ld
 WHERE ld.level = 5
   AND NOT EXISTS (SELECT 1 FROM level_materials lm
                    WHERE lm.level_definition_id = ld.id AND lm.title = 'Scripture study: 2 Timothy 4:7 — I have fought the good fight, finished the race, kept the faith');
INSERT INTO level_materials (level_definition_id, title, title_fr, material_type, sort_order)
SELECT ld.id, 'Life study: Paul the Apostle as a legacy-tier leader', 'Étude de vie: Paul l''Apôtre comme leader de niveau héritage', 'article', 4
  FROM level_definitions ld
 WHERE ld.level = 5
   AND NOT EXISTS (SELECT 1 FROM level_materials lm
                    WHERE lm.level_definition_id = ld.id AND lm.title = 'Life study: Paul the Apostle as a legacy-tier leader');
INSERT INTO level_milestones (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Multiple generations of leaders trace their development to you', 'Plusieurs générations de leaders retracent leur développement jusqu''à vous', 1
  FROM level_definitions ld
 WHERE ld.level = 5
   AND NOT EXISTS (SELECT 1 FROM level_milestones lm
                    WHERE lm.level_definition_id = ld.id AND lm.name = 'Multiple generations of leaders trace their development to you');
INSERT INTO level_milestones (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Your character is publicly recognized as your greatest asset', 'Votre caractère est publiquement reconnu comme votre plus grand atout', 2
  FROM level_definitions ld
 WHERE ld.level = 5
   AND NOT EXISTS (SELECT 1 FROM level_milestones lm
                    WHERE lm.level_definition_id = ld.id AND lm.name = 'Your character is publicly recognized as your greatest asset');
INSERT INTO level_milestones (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'Your ministry has expanded beyond your direct involvement', 'Votre ministère s''est étendu au-delà de votre implication directe', 3
  FROM level_definitions ld
 WHERE ld.level = 5
   AND NOT EXISTS (SELECT 1 FROM level_milestones lm
                    WHERE lm.level_definition_id = ld.id AND lm.name = 'Your ministry has expanded beyond your direct involvement');
INSERT INTO level_milestones (level_definition_id, name, name_fr, sort_order)
SELECT ld.id, 'You have mentored leaders who are now mentoring leaders', 'Vous avez mentoré des leaders qui mentorent maintenant d''autres leaders', 4
  FROM level_definitions ld
 WHERE ld.level = 5
   AND NOT EXISTS (SELECT 1 FROM level_milestones lm
                    WHERE lm.level_definition_id = ld.id AND lm.name = 'You have mentored leaders who are now mentoring leaders');

COMMIT;
