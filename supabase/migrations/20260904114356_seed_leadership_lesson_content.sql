-- ============================================================================
-- Equip2Lead Coach: In-app leadership lesson content
-- Seeds full lesson content from FIRE Bible Institute "Spiritual Leadership"
-- course into the level_materials table, adds assignment prompts,
-- and creates the assignment_responses table for leader submissions.
--
-- Idempotent: safe to re-run. UPDATEs match on (level, material title).
-- Amended before first apply: each UPDATE originally ended with
-- `updated_at = NOW()`, but level_materials has no updated_at column
-- (only created_at), so every statement aborted. The line is dropped
-- rather than the column added — the spec for this change lists five
-- new columns and updated_at is not one of them.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Schema changes on level_materials
-- ----------------------------------------------------------------------------
ALTER TABLE level_materials
  ADD COLUMN IF NOT EXISTS lesson_content TEXT,
  ADD COLUMN IF NOT EXISTS lesson_content_fr TEXT,
  ADD COLUMN IF NOT EXISTS assignment_prompt TEXT,
  ADD COLUMN IF NOT EXISTS assignment_prompt_fr TEXT,
  ADD COLUMN IF NOT EXISTS has_lesson BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN level_materials.lesson_content IS 'Full lesson body in English, rendered by the in-app lesson viewer';
COMMENT ON COLUMN level_materials.lesson_content_fr IS 'French translation of the lesson body (nullable, falls back to EN)';
COMMENT ON COLUMN level_materials.assignment_prompt IS 'Assignment question the leader responds to after reading the lesson';
COMMENT ON COLUMN level_materials.assignment_prompt_fr IS 'French translation of the assignment prompt';
COMMENT ON COLUMN level_materials.has_lesson IS 'TRUE if this material has embedded lesson content (drives UI: "Read lesson" vs external link)';

-- ----------------------------------------------------------------------------
-- 2. New table: assignment_responses (leader submissions per material)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assignment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_development_id UUID NOT NULL REFERENCES leader_development(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES level_materials(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('draft', 'submitted', 'reviewed')),
  reviewer_comment TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (leader_development_id, material_id)
);

CREATE INDEX IF NOT EXISTS assignment_responses_leader_idx
  ON assignment_responses(leader_development_id);
CREATE INDEX IF NOT EXISTS assignment_responses_material_idx
  ON assignment_responses(material_id);
CREATE INDEX IF NOT EXISTS assignment_responses_status_idx
  ON assignment_responses(status);

-- ----------------------------------------------------------------------------
-- 3. RLS on assignment_responses (mirroring leader_development discipline)
-- ----------------------------------------------------------------------------
ALTER TABLE assignment_responses ENABLE ROW LEVEL SECURITY;

-- SELECT: anyone in the same church can see responses (mentor/admin oversight)
DROP POLICY IF EXISTS "assignment_responses_select" ON assignment_responses;
CREATE POLICY "assignment_responses_select" ON assignment_responses FOR SELECT
  USING (
    leader_development_id IN (
      SELECT id FROM leader_development
      WHERE church_id = get_my_church_id()
    )
  );

-- INSERT: leader themselves (writing about themselves), OR admins on any leader
DROP POLICY IF EXISTS "assignment_responses_insert" ON assignment_responses;
CREATE POLICY "assignment_responses_insert" ON assignment_responses FOR INSERT
  WITH CHECK (
    leader_development_id IN (
      SELECT ld.id FROM leader_development ld
      WHERE ld.church_id = get_my_church_id()
        AND (ld.user_id = auth.uid() OR has_admin_rights())
    )
  );

-- UPDATE: leader can edit own drafts; admins can review any
DROP POLICY IF EXISTS "assignment_responses_update" ON assignment_responses;
CREATE POLICY "assignment_responses_update" ON assignment_responses FOR UPDATE
  USING (
    leader_development_id IN (
      SELECT ld.id FROM leader_development ld
      WHERE ld.church_id = get_my_church_id()
        AND (ld.user_id = auth.uid() OR has_admin_rights())
    )
  );

-- DELETE: owner only
DROP POLICY IF EXISTS "assignment_responses_delete" ON assignment_responses;
CREATE POLICY "assignment_responses_delete" ON assignment_responses FOR DELETE
  USING (
    leader_development_id IN (
      SELECT id FROM leader_development
      WHERE church_id = get_my_church_id()
    )
    AND is_owner()
  );

-- ----------------------------------------------------------------------------
-- 4. Seed lesson content into level_materials
--    Matches by (level, exact material title). Idempotent (UPDATE).
-- ----------------------------------------------------------------------------

-- Level 1: Spiritual Leadership (FIRE Bible Institute) — Lesson 1: Introductory Leadership 
UPDATE level_materials lm
SET
  lesson_content = 'LESSON 1: INTRODUCTORY LEADERSHIP
THOUGHTS/CONCEPTS
Welcome to this vital course in leadership. Much has been written about leadership
and it is my prayer and desire that the concepts and principles you learn via this course
will be a huge step in the ongoing process of developing your leadership skills.
The resources used in the compilation of this course have mostly been written from a
Christian perspective, so you need to keep it in the forefront of your mind that this course
is about Christian Leadership, a selfless style of leadership that will also take one far in
the secular world.
At the commencement of this course, I wish to touch on some key understandings
that I believe are vital to a successful leadership legacy.

LEADERSHIP IS NOT MANAGEMENT
In theory as well as in practice, there is a profound difference between
management and leadership. To manage means to bring about, to accomplish, to have
responsibility for, and to conduct. To lead means to influence, to guide in direction,
course, action, or opinion. The distinction is crucial. The difference may be summarized as
activities of communication and coordination among people, which facilitate effectiveness
as a leader, versus activities of controlling resources, and mastering procedures and routines, which facilitate
efficiency as a manager.
One clear distinction could provide the following definition:
Management involves power by position.
Leadership involves power by influence.
Abraham Zaleznik (1977), for example, delineated differences between leadership
and management. He saw leaders as inspiring visionaries, concerned about substance;
while managers he views as planners who have concerns with process. Warren Bennis
(1989) further explicated a dichotomy between managers and leaders. He drew twelve
distinctions between the two groups:
- Managers administer, leaders innovate
- Managers ask how and when, leaders ask what and why
- Managers focus on systems, leaders focus on people
- Managers do things right, leaders do the right things
- Managers maintain, leaders develop
- Managers rely on control, leaders inspire trust
- Managers have a short-term perspective, leaders have a longer-term perspective
- Managers accept the status-quo, leaders challenge the status-quo
- Managers have an eye on the bottom line, leaders have an eye on the horizon
- Managers imitate, leaders originate
- Managers emulate the classic good soldier, leaders are their own person
- Managers copy, leaders show originality

Paul Birch (1999) also sees a distinction between leadership and management. He
observed that, as a broad generalization, managers concerned themselves with tasks
while leaders concerned themselves with people.
In today''s business and organizational operations, people want to be led - not managed!
To be successful, managers must therefore also develop and nurture leadership

skills that are congruent with the perspective of organizations as human-based systems
that are fundamentally unpredictable, interactive, living systems, rather than stable,
mechanistic-like operations.
Leadership Defined
Leadership is a process by which a person influences others to accomplish an
objective and directs the organization in a way that makes it more cohesive and coherent.
Leaders carry out this process by applying their leadership attributes, such as beliefs, values,
ethics, character, knowledge, and skills. Although your position as a manager, supervisor,
lead, etc. gives you the authority to accomplish certain tasks and objectives in the
organization, this power does not make you a leader, it simply makes you the boss.
Leadership differs in that it makes the followers want to achieve high goals, rather than
simply bossing people around.
Five facts about leadership in the church
The church is the most leadership intensive enterprise in society.
- Every life needs to be custom molded
- The church is utterly voluntary
- The church is utterly altruistic (selfless)
2.
There is a spiritual gift of leadership (Rom. 12:8)
- Spiritual leaders cast a God-honoring vision
- They gather and align people for the achievement of the vision
- They can motivate their co-workers
- They sense the need for positive change and then constructively bring it
about
- They establish core values
- They allocate resources effectively
- They identify entropy (internal disorder)
- They create a leadership culture in their organization.

Most churches unintentionally undermine the expression of the leadership gift by
failing to teach on it and by implementing church governance systems that frustrate gifted
leaders into oblivion.
4.
Almost everybody wants to be led.
5.
The church is the hope of the world and its renewal rests in the hands of its
leaders.
1.

Important facts regarding the uniqueness of leadership (LJ 54)
•
•
•
•

Good News: There is no one leadership personality
Leadership must and can be learned
Leadership personality, style and traits do not exist
Four things all true leaders know:
a. The only definition of a leader is someone who has followers
b. Popularity is not leadership, results are.
c. Leaders are highly visible and set examples
d. Leadership is not rank, privileges, titles or money, it is responsibility.

•

Six important things leaders do:
a. They ask what needs to be done?

b. They ask what can and should I do to make a difference?
c. They ask what are the organizations mission and goals and what constitutes

performance and results in this organization
d. They are extremely tolerant of diversity in people.
e. They are not afraid of strength in their associates.
f. They submit themselves to the mirror test.

Ten things about leadership from the book of Nehemiah (Blue)
You are a leader. This means the primary responsibility (under God) for the church
rests with you. So often, we make the mistake of thinking that the more spiritual we are, the
more we will be able to lead the church to growth. This is not true. Some of the most mature,
deeply spiritual Christians are not the best leaders. No doubt we want them to be both
spiritually mature and effective leaders. But, we must recognize spirituality has little to do
with leading.
The following list contains principles for leadership from Nehemiah. In this world
of constant change, these principles are time-tested, proven and universal. Let’s begin our
journey into leadership training with this simple, but profound list of truths on leadership.
Leadership is influence (Neh. 2:5-8, 16-18/Acts 27)
Everything rises and falls on leadership (Neh. 4:9-15/2 Sam 24:10-17)
Leadership should be in the hands of the few (Neh. 5:1-7/Acts 6:1-4/James 3:1)
Leadership takes responsibility for every area of the task (Neh. 6:1-14/2
Cor. 11:24-28)
5. The most important ingredient to good leadership is integrity (Neh. 5:14-19/1
Cor. 11:1-2)
6. Leaders possess tremendous faith in people (Neh. 3:1-32/Phil. 1:3-8)
7. Leadership can be taught (Neh. 4:21-23/2 Tim. 2:2)
8. Great leaders are effective communicators of vision (Neh. 2:17-18/Acts 26:26-28)
9. Problem solving is the quickest way to gain leadership (Neh. 4:7-23/Acts 27:21-32)
10. Great leadership is always assisted by other people (Neh. 3:1-32/1 The. 1:2-8/
Titus 1:5)
1.
2.
3.
4.

LESSON 2: FIVE LEVELS OF LEADERSHIP',
  assignment_prompt = 'Reflect on this: ''Leadership involves power by influence, not by position.'' Write about a time you exercised leadership WITHOUT a formal title. What did you learn about influence? How does this shape your view of your own leadership potential?',
  assignment_prompt_fr = 'Réfléchissez à ceci : « Le leadership implique le pouvoir par l''influence, pas par la position. » Écrivez sur une occasion où vous avez exercé un leadership SANS titre formel. Qu''avez-vous appris sur l''influence ? Comment cela façonne-t-il votre vision de votre propre potentiel de leadership ?',
  has_lesson = TRUE
FROM level_definitions ld
WHERE lm.level_definition_id = ld.id
  AND ld.level = 1
  AND lm.title = 'Spiritual Leadership (FIRE Bible Institute) — Lesson 1: Introductory Leadership Concepts';

-- Level 1: Spiritual Leadership — Lesson 2: Five Levels of Leadership
UPDATE level_materials lm
SET
  lesson_content = 'LESSON 2: FIVE LEVELS OF LEADERSHIP
Many people often confuse position and title with leadership. While this does
constitute a position of leadership in a formal hierarchical system, the reality of leadership
practice is that position is the lowest level of leadership. Once a person has a position or
title, it becomes their responsibility to get the “followers” to follow. Let’s take a brief look
at the five levels of leadership and why people follow leaders.
People follow leaders for a variety of reasons. As leaders increase their influence
with people, they expand the reasons for others to follow them. The leader’s effectiveness
must increase with time if new people are to be attracted and present followers retained. The
goal of this lesson is to help you understand what level you’re on with your people and to
deepen your influence.
PERSONSHOOD
Respect
People follow because of who you are and what you represent.
Note: This step is reserved for leaders who have spent years growing people and organizations.
Few make it. Those who do are bigger than life.
PEOPLE DEVELOPMENT
Reproduction
People follow because of what you have done for them.
Note: this is where long-range growth occurs. Your commitment to developing leaders
will ensure ongoing growth to the organization and to people. Do whatever you can to
achieve and stay on this level.
PRODUCTION
Results
People follow because of what you have done for the organization.
Note: This is where success is sensed by most people. They like you and what you are
doing. Problems are fixed with little effort because of momentum.
PERMISSION
Relationships
People follow because they want to.
Note: People follow you beyond your stated authority. This level allows work to be fun.
Caution: staying too long on this level without rising to the third level will cause highly
motivated people to become restless.

POSITION
“Rights”
People follow because they have to.
Note: Your influence will not extend beyond the lines of your job description. The longer
you stay here, the higher the turnover and the lower the morale.

LEVEL #1 – POSITION – (You have certain rights because of your position)
The following are successful characteristics of this level that will help you improve your
leadership influence.
- Know your job description thoroughly.
- Relate it to the organization.
- Relate it to the people of the organization.
- Do it with consistent excellence.
- Accept responsibility.
- Do more than is expected.
LEVEL #2 – PERMISSION – (This is because of the relationships
established)
Successful characteristics of this level:
- Be positive.
- Possess a genuine love for people.
- See through other people’s eyes.
- Make those who work around you more successful.
- Do win-win or don’t do it. (Find ways to make solutions acceptable to all parties)
- Include others in your journey.
15% of your success is product knowledge and 85% of your success is people
knowledge
LEVEL #3 – PRODUCTION – (This is because of the results you’ve achieved)
Successful characteristics of this level:
- Develop a Statement of Purpose that calls for growth through rapid
multiplication (CPM).
- Place the organization’s resources under that Statement of Purpose.
- Develop accountability for results…begin with yourself.
- Know and do the things that give a high return.
- Become a change-agent…understand timing.
- Change from a shepherd to a rancher.
LEVEL #4 – PERSONNEL DEVELOPMENT – (This is because you
reproduce yourself in others).
Successful characteristics of this level:
- Place top priority on developing people - the most valuable asset you have.
- Be a model for others to follow.

-

Pour your leadership efforts into the top 20%.
Expose your leaders to growth opportunities.
Equip leaders to equip others.
Five-Step Equipping Process:
I do it.
I do it and they are with me.
They do it and I am with them.
They do it.
They do it and someone is with them.

-

Surround yourself with those who compliment your leadership.

LEVEL #5 – PERSONHOOD – (This is because of who you are.)
Successful characteristics of this level:
- Live as a faithful servant of the Lord
- Be an example of a life lived with integrity
- Be a consistent producer of leaders over the years.
Observations about the levels of leadership: The following truths will help you
better understand the “Steps of leadership”.
The higher the levels are…
- The longer it takes to get there
- The higher the level of commitment (both yours and theirs).
- The greater the growth
- The easier to lead (others help you because they believe in you).
- The wider the level of influence you will have.
- The larger the reservoir of reserves.
Four questions need to be asked to determine the health of a leader’s
influence.
- What level am I on at this time?
- Are the leaders (influencers) on the same level with me?
- Am I going upward toward the next level?
- Is the number growing at the level I am on?
How do we climb the leadership steps?
- Consistently ask God to build you into a more effective leader.
- Develop confidence in your people skills.
- See every relationship you have as a chance to develop that person.
- Walk slowly through the crowd.
- Constantly keep a list of potential leaders you can invest in.
- Prioritize discipleship: find systematic ways to train people.
- Select and develop (mentor) key leaders.
- Live a model life that others want to imitate.
- Recognize that people are your most valuable asset.
ASSESSMENT: As you consider these principles, think about what level you are on with the
people you lead. List what it will take to move to the next level.
APPLICATION: What do you struggle with most in climbing the leadership steps? How can
you begin to implement these steps?

LESSON 3: VITAL CONCEPTS',
  assignment_prompt = 'Honestly assess which of the 5 levels (Position, Permission, Production, People Development, Personhood) you are currently operating at with the people you lead. What specific evidence supports your assessment? What is one concrete step you will take this month to grow toward the next level?',
  assignment_prompt_fr = 'Évaluez honnêtement lequel des 5 niveaux (Position, Permission, Production, Développement des personnes, Personhood) vous exercez actuellement avec les personnes que vous dirigez. Quelles preuves concrètes soutiennent votre évaluation ? Quelle est une étape concrète que vous prendrez ce mois-ci pour progresser vers le niveau suivant ?',
  has_lesson = TRUE
FROM level_definitions ld
WHERE lm.level_definition_id = ld.id
  AND ld.level = 1
  AND lm.title = 'Spiritual Leadership — Lesson 2: Five Levels of Leadership';

-- Level 2: Spiritual Leadership — Lesson 6: Biblical Leadership (servanthood)
UPDATE level_materials lm
SET
  lesson_content = 'LESSON 6: Biblical Leadership
The following are leadership characteristics as viewed by the world and Christ:
By the World

By Christ

Self-confidence
Political savvy
Ambitious
Originates methods
Commands others
Independent
Aggressive
Puts self first
Acting in self-interest
Trust in self

Confidence in God
Spiritual savvy
Humble
Finds God’s methods
Serves others
God-dependent
Meek
Puts others first
Acting in love
Trust in God

Biblical principles of leadership to consider leadership in a church:
Principle # 1: Jesus Christ is the leader of His Church (Eph. 1:22-23)
Question: How is the leadership of Christ played out practically in your church?
Principle # 2: Earthly leaders serve under Christ’s authority (1 Pet. 5:1-4)
Question: How do the leaders in your church demonstrate their submission to the
authority of Christ?
Principle # 3: Leaders are servants of the people (Matt. 20:25-28)
Question: How do your leaders model a servant attitude in their exercise of
leadership authority?
Principle # 4: There are various degrees of leadership (Ex. 18:25)
Question: Are there numerous opportunities for people to serve (lead) in your
church that offer different levels of responsibility and oversight?
Principle # 5:There are different styles of leadership (Barnabas and Paul in Acts 15:36-41)
Question: Is there an expectation that people all use a similar style of leadership in your
church or are people allowed to lead in their God-given styles?
Principle # 6: Leaders are to be obeyed (Heb. 13:17)
Question: How well do members of your church obey and submit to Christ’s
leadership through their godly leaders?
Principle # 7: The potential for faithful ministry depends on leaders leading and followers
following (Jn. 10:27)
Question: How well are your leaders communicating the will of Christ to your
members and are your people listening?
Principle # 8: Every leader is to develop other leaders (Eph. 4:12)
Question: Are new leaders being developed in your church?

The Qualities and Traits of Grace-Full Leadership (GFL)
Mark 10: 42-44, is a biblical leadership paradox. Explain the paradox and contrasts found in this passage of
scripture that spells out the leadership philosophy of Christ.

The qualities of Grace-Full Leaders:
Grace-full leaders . . .
- Are more concerned with spirit than style (Phil. 2:5)
Grace-full leaders are more concerned with spirit than with style. Leading
from the inside out is an expression of grace-full leadership. A grace-full leader has
the right combination of confidence and humility to recognize strengths and
weaknesses and to consciously seek to build character, competency, and the
confidence of those who are led. This formula is a key component of leadership.
Leadership is the tapestry of integrity of heart and life, words and deeds, thoughts and
actions.
•

Are covenantal rather than contractual (2 Cor. 3:6)
Grace-full leaders are more concerned with covenantal rather than
contractual relationships. Contracts take the place of trust; covenants express it, for
trust is at the heart of a covenantal relationship. While most relationships have
some elements of both, at some point all relationships become essentially one or
the other. Contractual relationships exist because of what people do for each other.
Covenantal relationships exist because of what people are or mean to each other.

•

View people as ends-not means (Mark 10:45)
Grace-full leaders view people as ends—not means. While occasionally within
organizational life things do change and people are displaced, nonetheless, the gracefull leader seeks to foster an environment where people can flourish.
Leadership that does not promote the overall welfare of the people involved might
appear to be efficient and powerful, but it is not Christian. Grace-full leaders
recognize the dignity of others and affirm the diversity of their gifts. Everyone
comes with certain gifts—but not the same gifts. A polar bear is as unique as a
stingray, but don’t ask a polar bear to survive under water or a stingray on polar ice.
The challenge is to match the person to the position and need at any given time.

•

Recognize the changeable from the changeless (Isa 43: 18-19)
Grace-full leaders recognize the changeable from the changeless. Change
can be a genuine opportunity for renewal, but the problem is the “change has no
constituency.” That is to say, most people do not like change. Change often means
letting go of things that are familiar and moving into unknown territory. Even when
a person does not like things as they are, he or she may still find it hard to venture into
the unknown. In order to successfully determine what should change and what should
not, and then to effectively manage those things, you must first be comfortable with
the realities of change in your own life. If the followers are to respond positively, the
leader must first accept the pace and necessity of change.

•

Seek significance, not just success (Col 3:23)
Grace-full leaders seek significance, not just success. In the New Testament
it becomes clear that although we must work, our primary calling (vocation) is to
repentance, faith, fellowship, and service. Men and women are called to be new
creations in Christ. This call to be precedes the call to do. The Bible doesn’t indicate
that God calls us to an earthly profession or trade. Paul, for example, is called by God
to be an apostle; he is not “called” to be a tentmaker as shared by Elton Trueblood in
Your Other Vocation.i So faith makes a difference in how one views

work and how one works. Bringing the gospel to all of life can flood a person’s
working hours with new meaning and new potential. The hours spent at work can
become “Kingdom hours” that provide a powerful witness to the world of the grace
and glory of God. It is vital to the church, the individual, and the world at large that a
true integration of faith and work take place in the life of every believer. As this
happens, success gives way to significance.
•

Are responsive as well as responsible (1 Chron. 29:9)
Grace-full leaders are responsive as well as responsible. Being responsive
allows an organization to discontinue practices no longer effective. Most good ideas
and effective methods run their course in time and need to be replaced with other
good ideas and effective methods. The “we’ve always done it that way” attitude is
often hard to overcome because the weight of tradition and organizational history
supports the tried-and-true ways of the past. The responsive leader has the ability to
recognize when new outcomes are needed and when old methods may not be
sufficient.

•

Are high-touch (Matt. 28:20)
Grace-full leadership is “high-touch” in at least four dimensions. You must
stay in touch with
1. yourself,
2. the internal and external environment in which you must function,
3. those whom you lead, and
4. God.

•

Maximize influence and minimize authority (1 Cor. 11:1)
Grace-full leaders maximize influence and minimize authority. Whenever
possible, grace-full leaders seek to lead through influence rather than authority.
The difference between the two approaches strikes at the heart of why and how
employees/ members/followers choose to respond to leadership initiatives. If the
only method of motivation is the authority of the leaders, the response of the
follower will no doubt be a minimal commitment. The follower may comply with
his hands, but not his head or heart.

•

Are passionate (Rom. 12:11)
Grace-full leaders are passionate. We would like for all our work to be
exciting and immediately rewarding, but it isn’t always that way; much of life and
labor is tough and boring and routine, and therein lies the challenge to excellence.
For grace-full leaders merely to repeat Jesus’ words is not to continue His work;
they must be intent on reproducing His life and passion. Such leaders are not
building their kingdoms, but His; grace-full leaders are passionate people, set
aflame by the Spirit.

•

Focus primarily on the body (organization), not the head. (Luke 22:27)
Grace-full leaders focus primarily on the body, not the head. A spirit of
community doesn’t just happen; it must be fashioned and fostered, nourished and
maintained. Community can be a fragile thing in many ways. Relationships can be
broken; isolation can set in; and communication can dissipate. Employees and
coworkers can drift apart, living in their own little worlds, almost untouched by the
others.

The Traits of Grace-Full Leaders:
Grace-Full leaders . . .
- Understand accountability (Luke 16: 1-2)
Grace-full leaders understand accountability. Accountability means that
leaders take responsibility for their words and actions. And just as one is
accountable to others, the grace-full leader is also accountable for others. Leaders
must bear a sense of responsibility for the individuals with whom and for whom
they work. Leaders often are called upon to balance the needs of people and of the
institution.
•

Interact rather than react (Prov. 27:12)
Grace-full leaders interact rather than react. Interactive leadership is a
recognition that we may legitimately act in different ways at different times,
depending on the interaction we have with the circumstances confronting us.
Management is both a science and an art. This is the art part. It is a way to
maximize our timing and to learn from the environment as we plan our proactive
and reactive responses.

•

Follow their “knows” (Eccles. 9:17)
Grace-full leaders get the right information, talk with the right people, and
balance that input with their instincts and inner compass—but there is more.
Ultimately, for the Christian leader, knowing must also include the spiritual
dimension. God has promised wisdom and guidance, protection and empowerment.
The grace-full leader knows he or she must stay in tune with God and follow His
leadership. Of all the things there is to know, knowing God is most important.

•

Are willing to follow as well as lead (Matt. 16:24)
Grace-full leaders are willing to follow as well as lead. I suppose that “a
leader who follows” might, at first glance, appear to be an oxymoron as well.
However, the grace-full leader knows that learning to follow is one of the first great
lessons of leadership. This idea of leaders as followers may take some getting used to
for some. It seems just the opposite of the normal role of leadership, which is
commonly understood as being out front, pointing the way, and giving the orders.

•

Maintain their balance (Prov. 3:6)
Grace-full leaders maintain their balance. Balance in life prevents becoming
an extremist or being eccentric in beliefs, attitudes, and actions. It keeps the
pressures of success and failure in proper balance. Dealing with adversity and
prosperity are two extreme tests. Both challenge your ability to remain steady and
focused and to keep spiritual equilibrium. And of the two, perhaps success is the
hardest.

•

Have double vision (Prov. 29: 1) ****
Grace-full leaders have double vision. Leadership demands that you see both
what is and what can be. This “double-vision” helps enable us to keep our sights
set on the future as we deal with the daily demands of leadership.

•

“Go deep” (Luke 5:4)
Grace-full leaders “go deep.” Grace-full leaders know that having wet feet
rather than cold feet means they must start—must be willing to take those first
steps of leadership. No matter how unlikely the timing or difficult the circumstances
or impossible the task, it falls to the leader to lead.

•

Are skilled meteorologists/climate readers (Isa 32:2)
Grace-full leaders are skilled meteorologists. Every organization has a
“climate.” A skilled leader knows how to react to various organizational weather
patterns—storms, calm, high pressure, thunder, and lightning. Leadership is, in
many ways, a foul-weather job because that’s when a leader is most severely tested.
One cannot always avoid the winds, the snow, and the sleet, but a leader can prepare
for them. Anticipating the storm is one key responsibility of a leader.

•

Anticipate through planning, path finding, planting, and prospecting (Ps 18: 36)
Grace-full leaders anticipate through planning, path finding, planting, and
prospecting. Good leaders create positive energy that helps people overcome
obstacles, break free from inertia, and rise to new challenges and levels of
performance. They act in the present with the future in mind—they anticipate.

•

Take care (Matt 9:36)
Grace-full leaders take care. Grace-full leaders learn to take care of their
organizations, themselves, and their relationship to God. Unless care is consistently
given to each aspect of life, a person’s leadership can be eroded. Grace-full leaders
are aware that an organization is held together by shared values, beliefs, and
commitments. This is what gives it fiber, integrity, and the capacity to endure
cyclical hardships. Since organizations are people, the first way to care for the
organization is to hire the right people—individuals who are committed to the core
values of the organization. One of leadership’s classic axioms is to “hire for attitude
and train for skills.”

Learning to lead is a lifelong process. It doesn’t happen by reading a book or taking a
course or wishing it were so. We all learn to lead by leading. And learning to lead is also a
part of learning to live with purpose and meaning beyond our own interests and abilities.
The world is waiting for a new generation of leaders—men and women whose mission is
more than profit, whose morality is not contextual, and whose very life is an expression of
grace; leaders who will manage themselves, inspire others, and forge the future.

LESSON 7: SMALL GROUP ACTIVITY',
  assignment_prompt = 'Jesus modeled servant leadership by washing His disciples'' feet. Identify one person on your team whose life would be blessed by an act of genuine service from you this week. What will you do? How will you serve without seeking recognition?',
  assignment_prompt_fr = 'Jésus a modelé le leadership serviteur en lavant les pieds de ses disciples. Identifiez une personne de votre équipe dont la vie serait bénie par un acte de service authentique de votre part cette semaine. Que ferez-vous ? Comment servirez-vous sans chercher la reconnaissance ?',
  has_lesson = TRUE
FROM level_definitions ld
WHERE lm.level_definition_id = ld.id
  AND ld.level = 2
  AND lm.title = 'Spiritual Leadership — Lesson 6: Biblical Leadership (servanthood)';

-- Level 2: Spiritual Leadership — Lesson 11: Communication and Motivation
UPDATE level_materials lm
SET
  lesson_content = 'LESSON 11: COMMUNICATION: MOTIVATION
To be an effective leader, you have to become a master at motivating people.
Those you work with can testify that you need a special understanding and a special kind of
leadership. Volunteers don’t receive a paycheck, so they need to be motivated in other ways.
We can find many good motivational ideas in secular bookstores and workshops.
We can learn a lot from these tools about recognizing and appreciating people, plus
finding out what turns them on.
Followers of Jesus have an additional edge. We have the privilege of motivating
people from a spiritual basis. Here are seven tips on motivating church workers:
1. Rely on the Holy Spirit

Jesus taught that the Holy Spirit is the great Teacher and motivator. “How
much more will the ministry of the Spirit come in glory?” (2 Cor. 3:8). When leaders
preach and teach about the Holy Spirit, people respond and begin to experience the
Spirit personally. They become filled with the Spirit, they learn to fellowship with
the Spirit in their prayer life, and they learn how to flow with the Spirit. This walk
with the Holy Spirit becomes a continuing motivation to do God’s will, to serve
others in love, to reach out to people different from them, and to take risks of faith.
The person of the Holy Spirit in our lives is the most positive, compelling, powerful
motivation in existence.
I once heard a little girl who prays, “O God, if you’re really there and hearing
me, would you please touch me?” She feels touch and becomes excited. When she
says “Amen” and opens her eyes, she notices her sister in the room and becomes
suspicious. “Did you just touch me?” she asks.
“Yes,” replies the sister.
“Why?”
“Because God told me to!”
Many times I’ve heard people say they were motivated by the Holy Spirit to
phone someone or go to the hospital to see someone, and their action was exactly what
the other person needed. The timing was just right because the Holy Spirit brought the
two together. How important it is to have the Holy Spirit to do God’s ministry!
2. Cast the Vision
Most people volunteer for ministry only after they catch a vision for it. They drop
out when they lose vision. As leaders, we must not only have a clear vision ourselves but also communicate the vision so the people we’re working with catch it.
Vision motivates people to go above and beyond the mediocre and routine.
It lifts their sight to new places. It helps them see that they’re living life for
something greater than themselves. This is a strong motivation!
A good leader continually casts vision as while painting a picture of what
God wants to do next through the congregation. People want to be part of
something that’s going somewhere and making a difference, so they’re ready to say
“yes” when asked.
3. Always Use Love Motivation, Not Guilt
I’ve experienced the benefits of motivating people with things that are positive
and avoiding fear, negativity, and guilt. Positive motivation is durable, but a sense of
duty/shame starts dying off as soon as your words fade from memory.

Positive motivations include, “Do you want to do something great for God?
Do you want to make your life count? Do you want to find significance?”
4. Dramatize the Need
As pastor I often emphasized the importance of giving ministry workers the
“Triple A” treatment: Affirmation, Appreciation, and Attention. For example, each
year we gave an appreciation dinner for those doing significant things in ministry.
We designated each November an “Attitude of Gratitude” month so that unsung
heroes could be recognized. They’d come forward in the service and share what
they did. Then everyone would applaud. When you recognize people in public and
appreciate them, the impact is multiplied many times over. That motivates existing
workers, and it spurs new people to get involved.
5. Explain How You Help Yourself by Helping Others
After Jimmy Carter served as U.S. President, he made a priority of going
back to his Plains, Georgia, church to teach his Sunday school class. He would
unashamedly tell reporters that no matter where he was in the world, he’d try to get
back Saturday night so he could get up Sunday to study his outline and teach his
class.
What reason did he give? He said he got more out of teaching the class than
the participants received from what he taught.
Likewise, at one conference a lady told me about her daughter’s death six
months previously. She said she’d never have made it through that experience
without her small group standing by, loving and praying for her.
Then she became a trainer of small-group leaders. “I never would have
believed it, but I’ve received even more help by teaching others about what was
done for me,” she said.
People enjoy discovering that they can’t out give God. When they reach out
to others, they receive a greater blessing themselves.
6. Invite People to Be on the Inside
Jesus spent two-thirds or his time with the disciples. They knew they were
inside their master’s mind and heart. That’s a strong motivation.
If I had something to get across to the church, I’d communicate it to the lay
pastors, and they’d “sell it” to others because they had ownership.
7. Remember the Call of God
When times get tough, pastors always look back to that call. It becomes an
anchor and a lifetime motivation.
Pastors aren’t the only ones who minister out of a sense of calling. All God’s
people can have a sense of his leading. You can create a climate where people
experience the call of God in ministry, both to full-time service and as volunteers.
Once people connect with God’s call for ministry in their lives, it becomes
motivation for them. Their “daytime” jobs pay the bills while their real passion is
ministry. As they discover and work out of their spiritual gifts, they come to develop
a delightful sense of spiritual vocation.
These seven motivators all tap into the spiritual resources available to each
follower of Christ. It is one thing to rise to the stature of a great philanthropist like
Andrew Carnegie, whose tombstone is said to read: “Here lies a man who knew
how to enlist the service of better men than himself.” Christ-motivations can take
someone even further; they can provide the transference of an enlarged heart. If you
let people see your heart for God, then God will use that to enlarge their heartfelt
motivation for ministry.

LESSON 12: COMMUNICATION - PASSION',
  assignment_prompt = 'Think about someone on your team who needs encouragement right now. Write a specific plan: what will you say to them? When? In what setting? Focus on affirming their value BEFORE addressing any performance concerns.',
  assignment_prompt_fr = 'Pensez à quelqu''un dans votre équipe qui a besoin d''encouragement en ce moment. Écrivez un plan spécifique : que leur direz-vous ? Quand ? Dans quel cadre ? Concentrez-vous sur l''affirmation de leur valeur AVANT d''aborder toute préoccupation de performance.',
  has_lesson = TRUE
FROM level_definitions ld
WHERE lm.level_definition_id = ld.id
  AND ld.level = 2
  AND lm.title = 'Spiritual Leadership — Lesson 11: Communication and Motivation';

-- Level 3: Spiritual Leadership — Lesson 4: Visionary Leadership
UPDATE level_materials lm
SET
  lesson_content = 'LESSON 4: VISIONARY LEADERSHIP
Insights regarding vision and leadership
“Leaders exist so that there may be better organization, better adaptation, or greater
individuals. They are viewed as essential in that they formulate theories, policies, and ideals
that give direction and character to an age; and their presence and character help to define the
character of society. The quality of their contribution is such that history is substantially changed.”
LEADERSHIP IS THE ACT OF LEADING. The leader must stay in front, but not so
far in front that contact with followers is lost.
The successful leader must plan the work, and work the plan. A leader who moves
by guesswork, without a practical, definite plan, is like the proverbial ship without a
rudder. Sooner or later the ship will be found on the rocks.
We will do well to consider what Dr. Eugene Jennings has to say in his book, The
Anatomy of Leadership. “Leadership may well emanate from an executive position, but it
thrives largely on the personal resources that the individual himself brings to bear upon
the event.”
Many persons have failed to become leaders, not because they did not have dreams
or bright ideas, but because they did not have enough willpower to provide the necessary
energy and determination – and to make the necessary sacrifices.
“Visionary leadership is…” the ability to get people to do what you want donewhen you want it done- in a way you want it done- because they want to do it.”
Five Key Lessons for Visionary Leaders
1.

Focus the majority of your efforts on the future. Followers are concerned
about the present, but a leader’s primary responsibility is to find, recognize and
secure the future. KEY: Build on the foundations of our history, but focus on your
future.

2.

Understand the nature of fundamental change. Change is given in
today’s world. “What works today won’t work tomorrow.” Today’s culture is a
“change-or- be-changed” world. KEY: Reinvent yourself for the 21st century or
die.

3.

Appreciate the complex systems and how they work. Don’t take for
granted the systems or procedures you now use. How can the system be altered or
tweaked for more effectiveness.

4.

Examine your leadership style to see how it affects productivity.
Your leadership style has a dramatic effect on those around you. KEY:
followers of positive leaders are up to twenty times more effective.

5.

Create shared vision to build bridges to the future. People expect to
have a voice in their future and leaders build bridges and encourage followers to
join them on the journey across. A leader is someone you choose to follow to a
place you wouldn’t go by yourself. This is the capacity to create a compelling
picture of what could be.

“One of the greatest tragedies in Christian leadership
is when those in leadership have no vision of the future.
And if vision is not in the heart of the leaders, it certainly won’t be in the followers.
Effective Christian leaders will never be satisfied with the status quo
for either themselves or their church.”
Ten Commitments of Visionary Leadership
If you are to be a visionary leader, you must develop a lifestyle that will:
Challenge the Process
1.
Search out challenging opportunities to change, grow, innovate and improve.
2.
Experiment, take risks, and learn from the inevitable accompanying mistakes.
Inspire a Shared Vision
3.
Envision an uplifting and exciting (ennobling) future.
4.
Enlist others in a common vision by appealing to their values, interests, hopes
and dreams.
Enable Others to Act
5.
Foster collaboration by promoting cooperative goals and building trust.
6.
Strengthen people by giving power away, by providing choice, developing
competence, assigning critical tasks, and offering visible support.
Model the Way
7.
Set the example by behaving in ways that are consistent with shared values.
8.
Achieve small wins that promote consistent progress and build commitment.
Encourage the Heart
9.
Recognize individual contributions to the success of every project.
10.
Celebrate team accomplishments regularly
Vision and Mission
In a nutshell, vision leads to a Mission Statement and Action Plans that provide direction
and strategy for your followers. While some may consider these items to be unnecessary, the
truth is that without them you will flounder and your people will perceive you to be
directionless. A mission statement tells us what the organization is all about and what it
intends to be. The mission always leads us to the discussion of the vision of the
organization. The vision should complete the mission statement. Basically, the vision is the
blueprint for a successful mission statement
The following are the benefits of a good mission statement.
a. It clarifies focus (what you do and why you do it)
b. It fosters a sense of unity
c. It enhances creativity
d. It streamlines your effort and energy
e. It simplifies decision-making
f. It serves as a solid promotional platform
g. It bolsters team spirit

A good mission statement is:
a. Short and to the point (one sentence is best)
b. Easy to understand
c. Easy to memorize
d. Printed and referred to often
e. Something that matters to people.
Seven tests of a great mission statement:
a. Does the Bible affirm it?
b. Does your budget reveal it?
c. Does your staff reflect it?
d. Do your ministries match it?
e. Does your congregation live it?
f. Does your pastor stick to it?
g. Are your plans to build in alignment with it?
Four “Invitational” Questions Visionary/Missional Leaders Live:
1.
2.

3.
4.

Where are we headed? The WRONG question is, “Where have we been?” PTL we
can head toward the future that God has promised and prepared.
What kind of future are we building for our families, community, world and
church? Note: The church that puts itself first is already dead. We need a “Theology of
Service and Ministry to Others,” not a “Theology of Survival.”
What are our strengths, gifts and competencies?
What is God inviting us to accomplish in mission?
(What about spending some time with your leadership team and other leaders wrestling with
these vital questions?)
MISSIONAL LEADERS keep these four questions before them and their leaders!
NEVER, NEVER, NEVER give in to maintenance, self-preservation, or survival
mentality. Spend a good portion of your leadership (board) meetings with questions like
these, dealing with the future, planning, strategy, vision casting, dreaming, etc.
What Effective Leaders Do to Motivate People
If you are going to get people to buy into your vision and mission statements and
follow you into the unknown, you need to motivate your people. There will always be
those who fight change or are hesitant to start the process of transformation. To do this,
leaders need to inspire and motivate their people in the following ways:
1. Captivate their hearts and minds by addressing things that matter to them.
2. Earn their respect by demonstrating godly character.
3. Win their trust by delivering on your promises.
4. Clearly and convincingly communicate your purpose: to serve them.
5. Facilitate their enduring focus on a compelling vision.
6. Offer them a concise, significant, and challenging ROLE in the fulfillment of the
vision.
7. Support them with resources, guidance, encouragement, and rewards.
8. Describe your reasonable performance expectations of them.
9. Lead by offering captivating ideas, persuasive words, and an inspiring example.
10. Always place the needs of the people above the needs of the program.

11. Provide generous praise; selflessly and genuinely deflect credit to the entire team.
12. Celebrate each small win along the path to ultimate victory.

For the vision to become reality, leaders need to:
1.
Prioritize their people (Equip the top 20% for 80% of the time…minister to
everyone 20% of the time)
2.
Prioritize their development
- Spend 70% of your time developing your strengths
- Spend 25% of your time learning new things
- Spend 5% of your time working on your weaknesses
3.
Prioritize their life (Know what is most important)
4.
Prioritize their thinking
- Spend 80% of your time thinking about tomorrow
- Spend 20% of your time thinking about today
5.
Prioritize their resources
VISION AND VALUE CASTING
Sharing the vision and marshalling action are essential for making the
organizational vision stick in an organization.
Leaders must teach and coach followers to both accept and apply the vision and
values of the organization into the work they do.
In a leadership context, teaching and coaching are focused on a very few goals:
help followers understand the vision and its values context;
accept as their own these values and the implications of the vision; and
apply the principles inherent in the vision as they perform their organizational work.
In this way, the inherent field of the organization becomes more explicit and the
order, productivity, and unity that emerge from the attractor become a practical extension
of a shared values context.
If a leader does not teach his or her values and vision, other values and a
different vision will guide the organization and may work against the leader''s purposes.
Teaching and coaching both help strengthen the attraction power of the vision and
values. Teaching and coaching activities reinforce the power of trusting relationships and the
power of vision as the basis for organizational action (Fairholm, 2004).

LESSON 5: LEADERSHIP DEVELOPMENT',
  assignment_prompt = 'Write out a clear Statement of Purpose for the ministry or team you lead. It should answer: WHY does this team exist? WHAT change do we want to see? WHO are we serving? Share it with your team and ask for their honest response.',
  assignment_prompt_fr = 'Rédigez une déclaration d''objectifs claire pour le ministère ou l''équipe que vous dirigez. Elle doit répondre à : POURQUOI cette équipe existe-t-elle ? QUEL changement voulons-nous voir ? QUI servons-nous ? Partagez-la avec votre équipe et demandez leur réponse honnête.',
  has_lesson = TRUE
FROM level_definitions ld
WHERE lm.level_definition_id = ld.id
  AND ld.level = 3
  AND lm.title = 'Spiritual Leadership — Lesson 4: Visionary Leadership';

-- Level 3: Spiritual Leadership — Lesson 30: The Law of Priorities
UPDATE level_materials lm
SET
  lesson_content = 'LESSON 30: LAW 17 - THE LAW OF PRIORITIES
Leaders understand that activity is not necessarily accomplishment.
EXAMPLE: PETER
TEXT: ACTS 6:1-7
As the early church grew, so did their problems. Peter and the other apostles
began to hear rumors of complaints that some women had against the other ethnic
groups. The complaints revolved around how the ministry was being done.
According to this passage, Peter didn’t even have to pray. He said, “It doesn’t
make sense that we should neglect our priorities to wait tables.” Peter was not
suggesting that serving tables was unimportant. He was only stating that he
understood what his priorities were (prayer and the word of God) and that the
tables should become the priority of a set of deacons. Peter knew that he was busy
enough without trying to do everything. He was not about to confuse activity
with accomplishment. He chose priorities for himself and for the deacons based
upon the giftedness of the person, the strategic importance of the task and his
ability to delegate activities to appropriate people.
OBSERVATIONS ON THIS LAW…
How did Peter remain focused on his strengths and priorities? When the need
arose…
1. He recognized the existence of a whole new leadership opportunity

(v.1)
“Now at this time while the disciples were increasing in number, a complaint
arose on the part of the Hellenistic Jews against the native Hebrews, because their
widows were being overlooked in the daily serving of food.”
2. He gathered the disciples together to discuss what steps needed to be

taken (v.2)
“And the twelve summoned the congregation of the disciples and said, ‘It is not
desirable for us to neglect the word of God in order to serve tables.”
3. He delegated the selection process to others so he would not

become diverted (v.3-4)

“But select from among you brethren (Christians), seven men (a team) of good
reputation (credibility among the people) full of the Spirit (God’s presence is
evident), and of wisdom (mature) that we may put in charge of this task. But we
will devote ourselves to prayer and to the ministry of the word.”
4. He took his hands off of the project and authorized them to fulfill

the task (v.5)

“And the statement found approval with the whole congregation; and they chose
Stephen, a man full of faith and of the Holy Spirit, and Philip, Prochorus, Nicanor,
Timon, Parmenus, and Nicolas, a proselyte from Antioch.”
5. He reviewed the disciples’ selections (v.6)

“And these they brought before the apostles…”
6. He took the time to publicly commission and authorize the lay

leaders (v.6)
“…and after praying, they laid their hands on them.”
THE LAW IN SCRIPTURE…
“Be very careful, then, how you live—not as unwise but as wise, making
the most of every opportunity, because the days are evil. Therefore, do not be
foolish, but understand what the will of the Lord is.” (Ephesians 5:15-16)
LIVING THE LAW…
THE 80 / 20 PRINCIPLE
Peter seemed to understand that waiting tables would not be the wisest use
of his time. As a leader, we, too must understand priorities the way Peter did.
The “80/20 Principle” teaches us that with the right priorities, 20% of our effort
will get us 80% of the results we desire. But, with the wrong priorities, 80% of
our effort will get us 20% of the results we desire. For example, if you spend your
time equipping your top 20% most influential people—you will multiply your
ability to minister, as you send them out to serve the other 80% of the people.
THE 10-80-10 PROCESS
This is an additional facet to the 80/20 Rule. Peter did what I commonly do with
tasks: It is the 10 – 80 – 10 process. I start the process, so that it gets off on the right
foot, (10% of the task) then I hand it off to an appropriately gifted person for the
bulk of the work (80% of the task). Finally, I come in at the end to polish the
finished product (the final 10% of the task).
THE THREE PRIORITY QUESTIONS:
-

REQUIREMENT: What is required of me?
RETURN: What give me the greatest return?
REWARD: What gives me the greatest reward?

QUESTIONS TO ASSIST YOU IN DETERMINING YOUR PRIORITIES:
1. Who are your top 20% most influential people that you should invest time in

and train?
2. What are the top 20% most productive activities or ministries that you should
focus on?
3. When is the top 20% most fruitful time of your day that you should spend on
your most important projects?
SELF-EVALUATION:
1. Do I understand precisely what my top priorities are? On what basis do I

make this judgment?
2. Which of my ministry activities provides the greatest results for our church?
3. If I were to invest in the top 20% of the influential people in my ministry,

who would I select? How would I equip them?
4. How do I say “no” to an opportunity? How do I delegate ministry
assignments? How do I manage projects without having to do them?
THE LAW OF PRIORITIES
1. What are the cultural barriers or areas of resistance I will face as I teach this law?
2. How will I contextualize this law for my culture?
3. What actions should my leaders take as a result of this law?

LESSON 31: LAW18 - THE LAW OF SACRIFICE',
  assignment_prompt = 'Apply the 80/20 principle to your week. List everything you did in the last 7 days. Identify the 20% of activities that produced 80% of your results. What will you STOP doing to protect time for what actually matters?',
  assignment_prompt_fr = 'Appliquez le principe 80/20 à votre semaine. Énumérez tout ce que vous avez fait au cours des 7 derniers jours. Identifiez les 20 % d''activités qui ont produit 80 % de vos résultats. Que ARRÊTEREZ-vous de faire pour protéger le temps consacré à ce qui compte vraiment ?',
  has_lesson = TRUE
FROM level_definitions ld
WHERE lm.level_definition_id = ld.id
  AND ld.level = 3
  AND lm.title = 'Spiritual Leadership — Lesson 30: The Law of Priorities';

-- Level 3: Spiritual Leadership — Lesson 36: Budgets and Financial Matters
UPDATE level_materials lm
SET
  lesson_content = 'LESSON 36: BUDGETS AND FINANCIAL MATTERS
A.

THE FINANCIAL RESPONSIBILITY OF A LEADER

The leader must have a good understanding of the finances of his organization. The
leader must understand the financial needs and the resources available. It is often said:
“SHOW ME YOUR BUDGET AND I’LL SHOW YOU YOUR PRIORITIES.”
As leader, you must guide and encourage the organization in raising funds and
in the use of those funds according to vision accomplishment and determined
priorities to accomplish vision. The following guidelines should help you fulfill these
financial responsibilities:
1.

You must guide the Board in formulating a ''Financial Policy''. The policy should
give specific instructions regarding how budgets are established, the source of
funds for each account, and the specific use of each account. The policy must be
accepted by the Board.

2.

You are to monitor the payment of all financial obligations.

3.

You must be sure that funds are only spent for the purpose for which they are
intended.

4.

You must check regularly (at least monthly) to see that the organization is
operating within the budget. No account should be allowed to be overdrawn
without your knowledge and consent.

5.

You must receive a monthly report from the treasurer. This report should
include the current balance of each account and a record of the month''s income.
The record of the month''s income must show the source and purpose of all
income. This report is to be reviewed at the Board meetings to ensure that the
finances are in order.

6.

You must be sure that the treasurer''s books are kept up-to-date and accurate.

7.

You must make a list of all office, building, land, evangelism, or other
equipment the organization owns and must update the list when items are bought
or sold. This includes the aforementioned items purchased at all levels in the
name of the Church of the Nazarene. The Board and Secretary should have a
copy of this list.

B.

HOW TO SET ANNUAL DISTRICT BUDGETS (SAMPLE)
1.

Calculate expected income for the coming year.

2.

List all possible sources of expense for the coming year (examples:
Leadership development and education, Care package, Travel related

114

expenes, Property and Contents Insurance, Office and administration,
Telephone, Contingency, Gatherings, Conference Travel, Pensions, Home
Missions, Evangelism, Denominational budgetry obligations, etc.)
3.

Decide how much can be spent in each category during the coming
year. Give CAREFUL consideration to these amounts — they should not
be more than the reasonably expected income for the year.
a.

b.
c.
d.
e.
f.

4.

The leader should present a report of actual expenses from the
previous year for travel, office, telephone, meetings and
contingency. This information will be given to the finance committee
who will use it as a guide in determining the need for the new year.
Gatherings should cover the cost of all Board meetings, assemblies,
and other official committee meetings.
Contingency should cover unexpected and unbudgeted expenses.
This amount is to be kept to a minimum.
When present, pensions budget must cover the current premium
and any possible increases for the year.
When present, insurance budget must cover the current premium
and any possible increases for the year.
Other established categories need to be based on vision and
mission, thereby reflecting the priority and purpose of the
organization.

Divide the desired annual budget for each category by 12 to determine
the required monthly budget. Remember, “projected Expense must NOT
exceed projected income and real expense must never exceed real income.”

KEYS TO DEVELOPING GENEROUS GIVING
1. Exercise faith.
- Believe that God is able to do anything including the fact that whenever

there is a need in the church, there is a prearranged supply to meet that
need through His people.
- Enlist the help of the leadership team to emphasize that apportionments
support ministries which help to fulfill the Great Commission.
- Encourage your church to adopt the ten-month payment plan. Challenge
churches to consider helping another church in payment of its’
allocation.
- Plan a prayer and fasting retreat for financial breakthrough for your
church.
2. Practice openness and accountability.
- Communicate freely and clearly with people how funds are used.
- Send a monthly letter from the treasurer highlighting key payments.
- Use designated funds for the intended purpose.

115
•

Praise members individually in writing for faithfulness in giving.
Appreciation and recognition promotes future giving.

3. Utilize available products and resources.
- Remind leaders of resources available for Stewardship Month emphasis
•

via the Stewardship Network.
Schedule a training event on personal financial management from a
biblical perspective.

IN THE END, IT’S ALL ABOUT STEWARDSHIP.
IF YOU’RE A GOOD STEWARD, YOU’LL BE ENTRUSTED
WITH MORE ACCORDING TO YOUR ABILITY

116

LESSON 37: CONCLUSION',
  assignment_prompt = 'Draft a simple budget for your ministry or team for the next quarter. Include: expected income, planned expenses, and one specific goal that requires financial planning. Bring it to your leader for review.',
  assignment_prompt_fr = 'Rédigez un budget simple pour votre ministère ou équipe pour le prochain trimestre. Incluez : les revenus attendus, les dépenses planifiées et un objectif spécifique qui nécessite une planification financière. Apportez-le à votre leader pour révision.',
  has_lesson = TRUE
FROM level_definitions ld
WHERE lm.level_definition_id = ld.id
  AND ld.level = 3
  AND lm.title = 'Spiritual Leadership — Lesson 36: Budgets and Financial Matters';

-- Level 4: Spiritual Leadership — Lesson 5: Leadership Development
UPDATE level_materials lm
SET
  lesson_content = 'LESSON 5: LEADERSHIP DEVELOPMENT
Leadership Development
The true leader is not only focused on where the organization s going, but is also
concerned about who will take it there and beyond. One of the key responsibilities of a
leader is the development of the leaders around him. The following are key considerations
for a leader:
The Leader’s key question: AM I RAISING UP POTENTIAL LEADERS?
The Leader’s toughest challenge: CREATING A CLIMATE FOR POTENTIAL
LEADERS
The Leader’s primary responsibility: INDENTIFYING POTENTIAL LEADERS
The Leader’s crucial task: NURTURING POTENTIAL LEADERS
The Leader’s daily requirement: EQUIPPING POTENTIAL LEADERS
The Leader’s lifelong commitment: DEVELOPING POTENTIAL LEADERS
The Leader’s highest return: FORMING A DREAM TEAM OF LEADERS
The Leader’s greatest joy: COACHING A DREAM TEAM OF LEADERS
The Leader’s finest hour: REALIZING VALUE TO AND FROM LEADERS
The Leader’s lasting contribution: REPRODUCING GENERATIONS OF
LEADERS

Turning followers into leaders
1.
2.
3.
4.

Leaders are hard to find, they don’t flock.
They are hard to gather, to come around you
They are hard to keep as they will only stay with you if you are better than they are.
You find leaders on purpose.

Ten ways to identify a promising new leader
1.
2.
3.
4.
5.
6.
7.
8.
9.
10.

Leadership in the past
The capacity to create or catch vision
A constructive spirit of discontent
Practical ideas
A willingness to take responsibility
A completion factor – finishing the given task
Mental toughness
Peer respect
Family respect
A quality that makes people listen to them

What an leader looks like
1.
2.
3.
4.

Leaders make things happen
Leaders have influence
Leaders see and seize opportunity
Leaders add value to people

Mentoring of Leaders.

1.

Knowledge combined with experience is the best mentoring process. “What you
heard from me, keep as the pattern of sound teaching, with faith and love in Chris Jesus” (2
Timothy 1:13). An effective mentor encourages potential leaders by patiently leading them
through ongoing, on-the-job learning experiences. Jesus learned in the Temple by listening to
the Jewish teachers and in the carpenter shop by watching his skilled adopted father, Joseph.
The most effective mix is a combination of formal training and informal learning experiences.

2.

A leader’s personal life is the greatest lesson. The development of exemplary
leaders comes by modeling exemplary leadership. The how is best taught by a trusted who!
Paul reminded Timothy, “I thank God, whom I serve, as my forefathers did” (2 Timothy
1:3). Someone modeled the lifestyle that Paul fleshed out in the lives of others.

3.

Mentors are lifters. Great leaders make everyone feel worthwhile. Timothy learned
about encouragement from Paul while on the job. “We sent Timothy, who is our brother and
God’s fellow worker in spreading the gospel of Christ, to strengthen and encourage you in
your faith” (1 Thessalonians 3:2). Encouragement is a vital ingredient in the mentoring
process. Send a note or E-mail. Make a quick phone call. Stop in. Let your student know
“out loud” that you appreciate his or her efforts.

4.

Mentors need strong shoulders and listening ears. Paul reminded the church at
Corinth about his constant and compassionate concern for them. “I face daily the pressure of
my concern for all the churches,” he wrote (2 Corinthians 11:28).

5.

The inspiring examples of other leaders inspire leadership. In his invitation to
Rome, Paul taught Timothy the importance of good resources. “When you come, bring the
cloak that I left with Carpus at Troas, and my scrolls, especially the parchments” (2
Timothy 4:13). Paul the teacher understood that the wisdom of God’s Word is exemplified
through the writings of its students. Now, mentors have the advantage of audio, video,
print, and internet resources that can, and must, be readily shared.

6.

Mentors are transparent. Paul wasn’t afraid to share his tragedies as well as his
triumphs. “You, however, know all about my teaching, my way of life, my purpose, faith,
patience, love, endurance, persecutions, sufferings…. Yet the Lord rescued me from all of
them” (2 Timothy 3:10, 11). Rose-colored glasses won’t help leader-recruits see better. They
need to understand that the fields “white unto harvest” have some weeds!

7.

Mentors are guardians. “Timothy guard what has been entrusted to your care” (1
Timothy 6:20). Even as Paul taught that truth he understood the weight of his own
guardianship. Mentors will do their share of groaning under the weight of possibilities for
their charges. They also delight in understanding the faithfulness of their Lord. They seek to
combine intercession with instruction in the power of the Holy Spirit.
Mentors influence those they are forming.
I- Inspirational in Style
N- Never-failing in its promises F- Forgives quickly
L- Loves God
U- Understands people
E- Encourages others with praise N- Never quits
C- Communicates the vision
E- Enthusiastic about the future

LESSON 6: Biblical Leadership',
  assignment_prompt = 'Identify 3 people you believe have leadership potential. For each, write: (1) what specific gift you see in them, (2) one growth area they need to develop, (3) how YOU will invest in their development over the next 90 days.',
  assignment_prompt_fr = 'Identifiez 3 personnes que vous croyez avoir un potentiel de leadership. Pour chacune, écrivez : (1) quel don spécifique vous voyez en elles, (2) un domaine de croissance qu''elles doivent développer, (3) comment VOUS investirez dans leur développement au cours des 90 prochains jours.',
  has_lesson = TRUE
FROM level_definitions ld
WHERE lm.level_definition_id = ld.id
  AND ld.level = 4
  AND lm.title = 'Spiritual Leadership — Lesson 5: Leadership Development';

-- Level 4: Spiritual Leadership — Lesson 25: The Law of Empowerment
UPDATE level_materials lm
SET
  lesson_content = 'LESSON 25: LAW 12- THE LAW OF EMPOWERMENT
Only secure leaders give power to others.
EXAMPLE: BARNABAS
TEXT: ACTS 9:26-31
When Saul of Tarsus was converted, all of the disciples in Jerusalem were afraid
of him. No one wanted to take the risk and support him. They were suspicious.
Barnabas received him, however, and brought him to the apostles, vouching for the
authenticity of his conversion. The Greek actually implies that “he took Saul by
the hand” and led him before the apostles. Barnabas, who might have been the
one who lost the vote to become the twelfth apostle (replacing Judas), was Paul’s
biggest cheerleader—and mentored him until they became peers as missionary
church planters. Even when Paul grew beyond him in favor and authority—
Barnabas continued empowering and encouraging him. What a vivid illustration of
the fact that only secure leaders can empower others. He went on to empower
other young emerging leaders from Antioch, as well as John Mark. As far as we
can tell from early church history, Barnabas empowered and prepared more
pastors and leaders for ministry than anyone except, perhaps, for Paul himself.
OBSERVATIONS ON THIS LAW…
How did Barnabas empower Paul? He performed the fundamentals well…
1. He believed in Paul prior to safe consensus. (Acts 9:26-27) Barnabas

did not wait until it was politically correct to trust Paul. He believed in him
before anyone else was willing to step forward and take the risk. He expressed
his acceptance and belief in his future directly to Paul, which gave Paul a
chance to break into the circle.
“And when he (Paul) had come to Jerusalem, he was trying to associate
with the disciples; and they were all afraid of him, not believing that he was a
disciple. But Barnabas took hold of him and brought him to the apostles…”
2. He represented Paul before significant contacts. (Acts 9:27)

One of the gifts he gave Paul was to introduce him and even represent him before
the Apostles. Barnabas lent him credibility when he hadn’t been around long
enough to earn it himself. He put Paul in touch with leaders who could help him
make it.
“Barnabas…brought him to the apostles and described to them how he
had seen the Lord on the road, and that he had talked to him, and how at
Damascus he had spoken out boldly in the name of Jesus.”
3. He defended Paul against sharp criticism. (Acts 9:26-27)

Barnabas was the only one who believed Paul’s report, and defended his
conversion to others in Jerusalem. When others were suspicious and critical, he

“described how Saul had seen the Lord…and how he had talked with him, and
how he had spoken boldly in Jesus’ name.”
“…they were all afraid of him, not believing he was a disciple…but
Barnabas…described how he had seen the Lord on the road…and how he had
spoken out boldly in the name of Jesus.”
4. He equipped Paul to function in his specific

capabilities. (Acts 9:28-29)
Barnabas enabled Paul to move freely among the Jews in Jerusalem, teaching
and debating the truths of the scripture. Paul’s gifts were discovered quickly and
he was released to use those gifts—prior to taking any formal course in Christian
theology. It is obvious that Barnabas was instrumental in Paul’s confidence to
speak so boldly, so quickly.
“And he was with them, moving about freely in Jerusalem, speaking out
boldly in the name of the Lord. And he was talking and arguing with the
Hellenistic Jews…”
5. He supported Paul amidst serious challenges. (Acts 9:29-30)

A fourth gift Barnabas gave Paul was amazing favor and support. He
became Paul’s biggest fan in Jerusalem! He helped Paul escape Jerusalem when
his life was endangered. He championed his call and ministry as they left Antioch
on their first missionary journey.
“And he (Paul) was talking and arguing with the Hellenistic Jews; but they
were attempting to put him to death. But when the brethren (Barnabas and other
disciples) learned of it, they brought him down to Caesarea and sent him away to
Tarsus.”
OBSERVATIONS ON BARNABAS’ MINISTRY OF EMPOWERMENT:
1. He empowered new believers, motivating them to keep the faith.

(Acts 11:23)
“Then when he (Barnabas) had come to Antioch and witnessed the grace
of God, he rejoiced and began to encourage them all with resolute heart to remain
true to the Lord.”
2. He empowered many people to come to faith in Jesus Christ. (Acts

11:24)
“…for he was a good man and full of the Holy Spirit and of faith. And
considerable numbers were brought to the Lord.”
3. He empowered John Mark, even after his missionary failure. (Acts

15:37-39)
“And Barnabas was desirous of taking John, called Mark, along with
them also. But
Paul kept insisting that they should not take him along who had deserted them…
And there arose such a sharp disagreement that they separated from one another,
and Barnabas took Mark with them and sailed away to Cyprus.”

4. He empowered Gentiles throughout Cyprus and Galatia to turn to

Christ. (Acts 13)
“
We had to speak the Word of God to you (Jews) first. Since you reject it
and do not consider yourselves worthy of eternal life, we now turn to the
Gentiles. For this is what the Lord commanded us: I have made you a light for
the Gentiles, that you may bring salvation to the ends of the earth.”
5. He empowered new churches by appointing elders to guide them.

(Acts 14:23)
“And when they had appointed elders for them in every church, having
prayed with fasting, they commended them to the Lord in whom they had
believed.”
6. He empowered his home church by reporting on their mission

efforts. (Acts 14:27)
“And when they had arrived and gathered the church together, they
began to report all things that God had done with them and how He had opened a
door of faith to the Gentiles.”
7. He empowered the first church council to understand what God was

doing among the Gentiles. (Acts 15:12, 22, 25)
“And all the multitude kept silent, and they were listening to Barnabas and
Paul as they were relating what signs and wonders God had done through them
among the Gentiles.”
THE LAW IN SCRIPTURE…
“And let us consider how to stimulate one another to love and good deeds,
not forsaking our own assembling together, as is the habit of some, but
encouraging one another; and all the more as you see the day drawing near.”
(Hebrews 10:24-25)
LIVING THE LAW…
•

WHY DO LEADERS FAIL TO EMPOWER OTHERS?
1.
2.
3.
4.

Insecurity
Desire for Job Security
Paradigm Shift
Ego
It’s amazing what can be accomplished
if the leader doesn’t care who gets the credit.

5. Co-Dependency

You can’t lead people if you need people.

The moment you get greater satisfaction out of seeing people grow and succeed than
in succeeding yourself… you will become an empowering leader.
SELF-EVALUATION:
a) How well do I empower others? How do I do it?
b) When I fail to empower others, how much does it have to do with my own

insecurities as a leader?
c) What have been empowering people and experiences in my life?
d) How can I better empower those who work beside me?

THE LAW OF EMPOWERMENT
1. What are the cultural barriers or areas of resistance I will face as I teach this law?
2. How will I contextualize this law for my culture?
3. What actions should my leaders take as a result of this law?

LESSON 26: LAW 13- THE LAW OF REPRODUCTION',
  assignment_prompt = 'What is one significant responsibility you are currently holding that you should delegate — completely — to someone you''re developing? Write down: what it is, who will receive it, and how you will resist the urge to rescue them.',
  assignment_prompt_fr = 'Quelle est une responsabilité importante que vous détenez actuellement et que vous devriez déléguer — complètement — à quelqu''un que vous développez ? Notez : ce que c''est, qui la recevra et comment vous résisterez à l''envie de les sauver.',
  has_lesson = TRUE
FROM level_definitions ld
WHERE lm.level_definition_id = ld.id
  AND ld.level = 4
  AND lm.title = 'Spiritual Leadership — Lesson 25: The Law of Empowerment';

-- Level 4: Spiritual Leadership — Lesson 26: The Law of Reproduction
UPDATE level_materials lm
SET
  lesson_content = 'LESSON 26: LAW 13- THE LAW OF REPRODUCTION
It takes a leader to raise up a leader.
EXAMPLE: MOSES AND JOSHUA
TEXT: NUMBERS 27:15-23
Of all the wonderful leadership functions Moses performed, his training of Joshua
was the most strategic. Joshua actually became the leader who would finish the task
of leading the people into the Promise Land. This successful “leadership
reproduction” was a result of both Moses’ example and equipping AND Joshua’s
hunger and giftedness. Moses passed on his authority, anointing and abilities to
Joshua. He gave Joshua his time, his insight, a learning environment, an opportunity
to prove himself and a strong belief in his future. Had he not been a leader himself,
each of these would have been inadequate for the task ahead of Joshua. Because
Moses gave time to reproducing himself in Joshua—his dream of the Promised
Land was realized even though he did not personally get to see it come to pass.
OBSERVATIONS ON THIS LAW…
1. Moses gave Joshua EMPOWERMENT and AUTHORITY.

(Numbers 27:20)
Moses laid his hands on Joshua and publicly commissioned him before the
people. He gave Joshua “part of his authority” (Numbers 27:15-23). Joshua
received positive recognition; a leader’s approval and acceptance; and he
received Moses’ expression of faith in him.
“So the Lord said to Moses, ‘Take Joshua, the son of Nun…and lay your
hand on him; and have him stand before Eleazar the priest and before all the
congregation; …And you shall put some of your authority on him, in order that all
the congregation of the sons of Israel may obey him.’”
2. Moses gave Joshua EXPERIENCE and APPLICATION.

(Numbers 27:21-22)
Joshua’s apprenticeship was not merely cerebral or passive; it didn’t simply
consist of the two of them talking over coffee. Mosses allowed Joshua to prove
his leadership as a spy, as a military commander and as his personal ministry
assistant.
“…At his command they shall go out and at his command they shall come
in, both he and the sons of Israel with him, even all the congregation.”
3. Moses gave Joshua ENCOURAGEMENT and AFFIRMATION.

(Numbers 27:23)
Moses affirmed his young protégé by allowing unusual companionship in
some rare places. They shared a unique intimacy, particularly when you consider
the differences in their ages. Moses communicated meaningful encouragement
through both his words and his time.

“Then he (the priest) laid his hands on him (Joshua) and commissioned
him, just as the Lord had spoken through Moses.
“Thus the Lord used to speak to Moses face to face, just as a man speaks to
his friend.
When Moses returned to the camp, his servant Joshua, the son of Nun, a young
man, would not depart from his tent.” (Exodus 33:11)
THE LAW IN SCRIPTURE…
“A disciple will not be greater than his teacher… it is enough for the
disciple to become like his teacher, and a slave his master.” (Matthew 10:24-25)
“But we proved to be gentle among you, as a nursing mother tenderly cares
for her own children. Having thus a fond affection for you, we were well- pleased
to impart to you not only the Gospel of God but also our own lives, because you
had become very dear to us… encouraging each one of you as a father would his
own children.” (I Thess. 5:7-11)
LIVING THE LAW…
As you practice this law, you become a PARENT. Good parents approach their
kids with…
P – Purpose
They don’t pass on truth accidentally. They are purposeful with their kids.
A – Assessment
They evaluate where their children need to grow and where they’re strong.
R – Relationship
They are warm and approachable. They furnish love and safe places.
E – Empowerment
They provide their kids the confidence and competence they need.
N – Navigation
They give direction to their kids and help get them to their destination.
T – Tools
They furnish the tools they need to win in life. They resource them as a mentor.
•

We teach what we know – We reproduce who we are!
It takes a leader to know a Leader. It
takes a leader to show a Leader. It
takes a leader to grow a Leader.

•

Why don’t all leaders develop other leaders?
1. They are insecure.
2. They spend too much time with followers.
3. Followers are easier to find and lead than leaders.
4. They don’t recognize the value of developing leaders.
5. Leadership has been viewed as a competitive effort, not a cooperative

one.

REPRODUCTION STRATEGY:
1.
2.
3.
4.

Make a personal commitment to reproduce leaders.
Create an atmosphere that attracts potential leaders.
Develop a system to find and assimilate potential leaders.
Provide Leadership training.

SELF-EVALUATION:
a) Who am I developing as a leader?
b) What am I doing intentionally to prepare them for leadership roles?
c) Knowing that I can only reproduce what I am, who else could be useful in

helping to thoroughly train these emerging leaders?
d) Based on my past, how effective am I at mentoring other leaders? What
could I do better to prepare tomorrow’s leader?
THE LAW OF REPRODUCTION
1. What are the cultural barriers or areas of resistance I will face as I teach this law?
2. How will I contextualize this law for my culture?
3. What actions should my leaders take as a result of this law?

LESSON 27: LAW 14- THE LAW OF ACCEPTANCE',
  assignment_prompt = 'Reflect: Who reproduced themselves in YOU as a leader? What did they do that shaped who you have become? Now write your plan to do the same for 2 emerging leaders in your ministry over the next year.',
  assignment_prompt_fr = 'Réfléchissez : Qui s''est reproduit en VOUS en tant que leader ? Qu''a-t-il fait qui a façonné qui vous êtes devenu ? Écrivez maintenant votre plan pour faire de même pour 2 leaders émergents dans votre ministère au cours de l''année prochaine.',
  has_lesson = TRUE
FROM level_definitions ld
WHERE lm.level_definition_id = ld.id
  AND ld.level = 4
  AND lm.title = 'Spiritual Leadership — Lesson 26: The Law of Reproduction';

-- Level 5: Spiritual Leadership — Lesson 34: The Law of Legacy
UPDATE level_materials lm
SET
  lesson_content = 'LESSON 34: LAW 21 - THE LAW OF LEGACY
A leader’s lasting value is measured by succession.
EXAMPLE: JESUS
TEXT: MATTHEW 4:19; MATTHEW 28:19
Jesus’ greatest miracle was not performed while he walked this earth. It was
the result of countless hours of training & modeling for his twelve disciples—and
performed once he left, and instructed them to go and practice this same art of
mentoring and leadership. The miracle was that he got those relative failures to
replicate his miraculous ministry in such a way that they reached all of Asia within
two years (Acts 19:10). Jesus spent the majority of his time with the twelve—not
with the masses. He was committed to developing men who would lead the church
into the next generation—men you and I might not have wasted our time on. Jesus
knew where his legacy would be found. His genius is not in his divine miracles, or
even in his direct ministry. It was found in his deliberate multiplication.
OBSERVATIONS ON THIS LAW…
Jesus’ IDEA of discipleship and leaving a legacy:
I – INSTRUCTION… in a life related context.
“And when he saw the multitudes, He went up on the mountain; and after He sat
down, His disciples came to Him. And opening His mouth, He began to teach
them…” (Matthew 5:1)
“And it came about that while He was praying in a certain place, after He finished,
one of His disciples said to Him, ‘Lord, teach us to pray…’” (Luke 11:1)
D – DEMONSTRATION… in a life related context.
“And when He had washed their feet…He said to them, ‘Do you know what I have
done to you? You call Me Teacher and Lord; and you are right, for so I am. If I, then,
the Lord and the Teacher washed your feet, you also ought to wash one another’s
feet. For I gave you an example that you also should do as I did to you.” (John 13:1215)
E – EXPERIENCE… in a life related context.
“And He summoned the twelve and began to send them out in pairs; and He was
giving them authority over the unclean spirits…” (Mark 6:7)
“And He took the five loaves and two fish, and looking up to heaven, He blessed
them, and broke them, and kept giving them to the disciples to set before the
multitude.” (Luke 9:16)
A – ASSESSMENT… in a life related context.
“And Jesus rebuked him and the demon came out of him, and the boy was cured at once.
Then the disciples came privately and said, ‘Why could we not cast it out?’ And

108

He said, ‘Because of your unbelief…but this kind does not go out except by prayer
and fasting.’” (Matthew 17:18-21)
JESUS EMPLOYED TWELVE FACTORS IN ORDER TO LEAVE HIS
LEGACY:
1. INITIATIVE (Luke 6:12-13)

“…He went off to the mountain to pray, and He spent the whole night in
prayer to God. And when the day came, He called His disciples to Him; and chose
twelve of them…”
2. PROXIMITY (Mark 3:14, Luke 8:1)

“And He appointed the twelve that they might be with Him…”
3. FRIENDSHIP (John 15:15)

“No longer do I call you slaves… but I have called you friends, for all things
that I have heard from My Father I have made known to you.”
4. EXAMPLE (John 13:15)

“For I gave you an example that you also should do as I did to you.”
5. COMMITMENT (Matthew 16:24, John 13:1)

“Jesus… having loved His own who were in the world, he loved them to the
end.”
“If anyone wishes to come after Me, let him deny himself, take up his cross
and follow Me.”
6. RESPONSIBILITY (Mark 6:7)

“And He summoned the twelve and began to send them out in pairs; and He was
giving them authority over the unclean spirits…”
7. KNOWLEDGE (Luke 8:9-10)

“And His disciples began questioning Him as to what this parable might be.
And He said, ‘To you it has been granted to know the mysteries of the Kingdom of
God…”
8. VISION (Matthew 4:19, John 4:35)

“Follow Me, and I will make you fishers of men.”
“Do you not say, ‘There are yet four months and then comes the harvest’?
Behold, I say to you, lift up your eyes, and look on the fields, that they are white for
harvest.”
9. TRUST (Matthew 10:1-8)

“And having summoned His twelve disciples, He gave them authority over unclean
spirits, to cast them out, and to heal every kind of disease and every kind of sickness.
And as you go, preach…heal the sick, raise the dead, cast out demons; freely you
received, freely give.”
10.
EVALUATION (Luke 10:17-24)
“And the seventy returned with joy, saying, ‘Lord, even the demons are

109

subject to us in Your name.’ And He said, ‘I was watching Satan fall from heaven

110

like lightning. Behold, I have given you authority to tread upon serpents and scorpions
and over all the power of the enemy, and nothing shall by any means injure you.
Nevertheless, do not rejoice in this…but rejoice that your names are recorded in
heaven.’”
11.

POWER (John 20:22, Acts 1:8)

“And when He had said this, He breathed on them, and said to them, ‘Receive
the Holy Spirit.’”
“But you will receive power when the Holy Spirit has come upon you, and you
shall be My witnesses both in Jerusalem, in all Judea and Samaria, and even to the
remotest part of the earth.”
12.

LAUNCH (Matthew 28:18-20)

“All authority has been given to Me in heaven and on earth. Go therefore, and make
disciples of all nations…”
THE LAW IN SCRIPTURE…
“Therefore, go and make disciples of all nations, baptizing them in the name of the
Father, the Son and the Holy Spirit, and teaching them to obey everything I have
commanded you. And surely I am with you always, to the very end of the age.”
(Matthew 28:19-20)
“Follow me and I will make you fishers of men.” (Matthew 4:19)
LIVING THE LAW…
•
•
•
•

Achievement comes when someone is able to do great things for Himself.
Success comes when he empowers followers to do great things with Him.
Significance comes when he develops leaders to do great things for Him.
Legacy comes when he raises his organization to do great things without Him.

SELF-EVALUATION:
1. When I think about leaving a legacy, what comes to my mind? What will be my

legacy?
2. How will I leave a legacy behind? What part do I have in what succeeds me?
3. In what ways am I imitating Jesus as He worked with His 12, and sought to leave a

movement when He left?
4. What steps can I take this week to insure the impact of my legacy?
The Law of Legacy
1. What are the cultural barriers or areas of resistance I will face as I teach this law?
2. How will I contextualize this law for my culture?
3. What actions should my leaders take as a result of this law?

111
LESSON 35: THE CHAIN PRINCIPLE OF LEADERSHIP',
  assignment_prompt = 'What legacy do you want to leave? Write your own leadership epitaph — the sentence you would want spoken about your leadership 20 years from now. Then write 3 things you must START doing today to make that epitaph true.',
  assignment_prompt_fr = 'Quel héritage voulez-vous laisser ? Écrivez votre propre épitaphe de leadership — la phrase que vous voudriez que l''on dise de votre leadership dans 20 ans. Puis écrivez 3 choses que vous devez COMMENCER à faire aujourd''hui pour que cette épitaphe soit vraie.',
  has_lesson = TRUE
FROM level_definitions ld
WHERE lm.level_definition_id = ld.id
  AND ld.level = 5
  AND lm.title = 'Spiritual Leadership — Lesson 34: The Law of Legacy';

-- Level 5: Spiritual Leadership — Lesson 37: Conclusion
UPDATE level_materials lm
SET
  lesson_content = 'LESSON 37: CONCLUSION
Developing the qualities of a servant leader: CHRISTIAN LEADERS ARE SERVANTS
Three temptations that correspond with the temptations of Jesus that any servant of
God faces (Matt 4: 1-11):
- The temptation to be self-sufficient
- The temptation to be spectacular
- The temptation to be powerful or in charge
Christ-like servant leaders who practice the art of the basin and the towel (John
13:1-20):
- Are motivated by love to serve others (v. 1-2)
- Possess a security that allows them to minister to others (v.3)
- Initiate servant ministry to others (v. 4-5)
- Receive servant ministry from others (v 6-7)
- Want nothing to interfere with their relationship with Jesus (v 8-9)
- Teach servanthood by their example (v 12-15)
- Live a blessed life (v. 16-17)
- Live their lives opposite to the philosophy of the world (v 18-19)
A Checklist for Leadership
As we conclude this course, I would like to leave you with a checklist that you
can daily use to ensure that your priorities and focus is correct. May you be blessed as
you strive by Faith to lead your people and His church to new heights and new
direction in new ways that He reveals to you.
1. Am I building God’s Word into my heart? Christian leadership begins and
ends at the same place: a passionate love for Jesus Christ. A leader’s ability to lead
and disciple others is directly proportionate to his own walk with the Lord (see Luke
6:50). Oswald Chambers said, “My worth to God in public is what I am in private.”
We need to nurture and protect our values and principles despite the winds of change.
As a Christian leader, this comes from meditating on God’s word and incorporating
it and His will into my life.
2. Am I becoming protective of my ministry turf? One of the primary tasks of
leaders is to rise up new leaders. If I’m becoming indispensable or irreplaceable, or
beginning to see myself in those terms, it’s a sign that I’m more concerned with my
future security and reputation than in empowering others for ministry.
3. Am I evaluating my ministry effectiveness? A personal evaluation of my
ministry along with genuine, constructive criticism by others is necessary to sharpen
and hone effectiveness. If you start avoiding hones evaluations of your programs or
accountability for your actions, be careful! Are you choosing ease over excellence?

117
4. Am I passionate in my ministry? Difficulties can wear even the strongest

individual down to the point that we just don’t care anymore. Ministry without
passion is a warning sign.
5. Am I opting for the familiar over the new? I’m not talking about embracing

the latest fad or newest ministry trick. What I am talking about is stretching to try
new things or new techniques to communicate and impact others more effectively.
Growth comes by seeking outside resources and a life long commitment to learning.
Doing what has always been done is comfortable, but is it effective? Is the impact of
my ministry eroding because I am not comfortable in embracing new technology or
methods? The old pyramid paradigm wanted no mistakes and therefore discouraged
innovation and experimentation. Leaders must encourage innovation, which requires
risk.
6. Am I willing to risk failure? It is most comfortable to attempt pursuits that are

a guaranteed success. Growing, flourishing ministries, however, have many
“failures” while pursuing excellence. Jake Welch, CEO of General Electric has said
“Risk is stepping outside your comfort zone to a place where you cannot predict with
any degree of certainty the outcome of you actions. Risk is taking on something that
holds and enormous chance of failure. Most importantly, risk is the only real key to
outrageous success.” True change is not without risk.
7. Am I associating with people whose leadership skills are less
developed? Are you surrounding yourself with those that will stretch you or those
that will make you feel secure? We grow by learning from people who are where we
need to be in the future. I’m choosing the comfortable when I must always be the big
fish in the little pond, surrounding myself with people who learn from me rather than
stretching me. Those closest to you will determine your level of your success. As
Proverbs 27:17 states: “Iron sharpens iron, and one man sharpens another”
8. Am I fulfilling the role the organization needs or simple the role I like?
Leaders recognize that certain roles must be filled in order for an organization to
remain healthy and avoid blind spots. A leader must ensure that those roles are in
place. But a leader also seeks to determine what role is needed, and either fills that
role personally or encourages another to fill it.
9. Am I giving away ministry responsibilities? Regularly I should seek to give
away some of what I am currently doing and pick up new responsibilities. Delegation
not only enables other to be entrusted with responsibilities that will cause their
growth and development, these potential leader also help carry the load. There is truth
in the adage, “There’s no success without a successor.”
10. Am I leading with true courage or with a cheap substitute? I’ve fought
with discouragement those times when my emotional and spiritual batteries
desperately need to be charged, but I’ve also fought discouragement or
dysfunctional courage. This sinful counterfeit of courage emerges when I inflate my
ego or become insensitive in order to rise above the circumstances of life or the
criticism of people.

118

Increasingly, pastors and church leaders are beginning to understand and
embrace their role as change agents. This mandates that leaders must model the
leadership, values and principles they desire to see in others. It also means that
occasional periods of evaluation are needed to determine if we are on course. The
ancient philosopher spoke truth when he said, “The unexamined life is not worth
living.” Honest evaluation, although somewhat painful, keeps the cutting edge on
your ministry, your leadership and your life. Aren’t you thankful the pilgrimage
allows for mid-course correction?

Yaounde, Cameroon II info@firebibleschool.org',
  assignment_prompt = 'Looking back at this entire leadership development journey: what has changed most in how you see yourself as a leader? What is the ONE commitment you make going forward that you will hold yourself accountable to for the next year?',
  assignment_prompt_fr = 'En regardant en arrière tout ce voyage de développement du leadership : qu''est-ce qui a le plus changé dans votre façon de vous voir en tant que leader ? Quel est le SEUL engagement que vous prenez à l''avenir et pour lequel vous vous rendrez responsable au cours de la prochaine année ?',
  has_lesson = TRUE
FROM level_definitions ld
WHERE lm.level_definition_id = ld.id
  AND ld.level = 5
  AND lm.title = 'Spiritual Leadership — Lesson 37: Conclusion';

-- ----------------------------------------------------------------------------
-- 5. Verification query (run manually to confirm)
-- ----------------------------------------------------------------------------
-- SELECT ld.level, COUNT(*) AS lessons_seeded
-- FROM level_materials lm
-- JOIN level_definitions ld ON ld.id = lm.level_definition_id
-- WHERE lm.has_lesson = TRUE
-- GROUP BY ld.level
-- ORDER BY ld.level;
--
-- Expected: Level 1: 2×N tenants, Level 2: 2×N, Level 3: 3×N, Level 4: 3×N, Level 5: 2×N
-- Total: 12 lesson updates × N tenants

COMMIT;
