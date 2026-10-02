# Lesson content fix report — proposed changes for review

**Nothing has been applied.** This is a proposal. `level_materials` is
unchanged; verified after writing this report.

Backup table `level_materials_backup_before_fix` created: **48 rows**, 12
distinct titles, 48 with English content, 48 with French content.

Source of every "BEFORE" quotation is `level_materials.lesson_content` as
stored on 2 October 2026. All 12 lessons exist in four tenants with
byte-identical English, so one fix per lesson covers all four copies.

---

## Summary

| Risk | Count | Meaning |
|---|---:|---|
| **HIGH** | 2 | May remove content that was deliberately included |
| **MEDIUM** | 15 | Correct target uncertain, or changes meaning |
| **LOW** | 55 | Mechanical: typos, OCR noise, formatting |
| **Total** | **72** | |

Plus **1 systematic change** (S1) applying to all 12 lessons.

### Bible reference verification — complete

I checked **every** scripture reference in all 12 lessons against chapter
verse counts. There are roughly 90 of them. Three are defective:

| Reference | Lesson | Problem |
|---|---|---|
| `Luke 6:50` | 37 | **Does not exist.** Luke 6 has 49 verses. |
| `I Thess. 5:7-11` | 26 | Reference exists but holds a **different passage**. The quoted text is 1 Thessalonians **2**:7-11. |
| `John 13:1215` | 34 | Malformed — missing hyphen, should be `13:12-15`. |

**Every other reference is valid**, including the ones most likely to be
wrong: `Numbers 27:15-23` (ch. 27 has exactly 23 verses), `Nehemiah 3:1-32`
(exactly 32), `Psalm 18:36` (50), `Ecclesiastes 9:17` (18),
`1 Chronicles 29:9` (30), `Acts 9:26-31` (43).

### Named-person verification

| Name as written | Verdict |
|---|---|
| Jake Welch | **Wrong** — Jack Welch (see 37.2) |
| Abraham Zaleznik (1977) | Correct — HBR, "Managers and Leaders: Are They Different?" |
| Warren Bennis (1989) | Correct — *On Becoming a Leader* |
| Oswald Chambers | Correct attribution, correct quote |
| Jimmy Carter / Plains, Georgia | Correct |
| Andrew Carnegie epitaph | Correctly hedged as "is said to read" |
| Dr. Eugene Jennings | Person correct; **book title wrong** (see 4.6) |
| Paul Birch (1999) | Plausible, not independently confirmed |
| Fairholm, 2004 | Plausible, not independently confirmed |
| Socrates (unnamed, "the ancient philosopher") | Quote accurate |

---

## S1 — Trailing next-lesson heading (all 12 lessons)

**BEFORE** (Lesson 1, final line):
```
10. Great leadership is always assisted by other people (Neh. 3:1-32/1 The. 1:2-8/
Titus 1:5)

LESSON 2: FIVE LEVELS OF LEADERSHIP
```

**AFTER:**
```
10. Great leadership is always assisted by other people (Neh. 3:1-32/1 The. 1:2-8/
Titus 1:5)
```

**WHY:** PDF page-break artifact. Every lesson ends with the *next* lesson's
title, which the lesson viewer renders as if it were part of the lesson. The 12
trailing lines are: `LESSON 2`, `LESSON 3: VITAL CONCEPTS`, `LESSON 5`,
`LESSON 6`, `LESSON 7: SMALL GROUP ACTIVITY`, `LESSON 12`, `LESSON 26`,
`LESSON 27`, `LESSON 31`, `LESSON 35`, `LESSON 37`, and Lesson 37's footer.

**RISK:** low — Lesson 37 is the exception: its trailing line is the school's
contact footer, not a heading, and should be kept (see 37.11).

---

## Lesson 1 — Introductory Leadership Concepts

### 1.1 "Five facts" list numbering scrambled

**BEFORE:**
```
Five facts about leadership in the church
The church is the most leadership intensive enterprise in society.
- Every life needs to be custom molded
...
2.
There is a spiritual gift of leadership (Rom. 12:8)
...
Most churches unintentionally undermine the expression of the leadership gift by
failing to teach on it ...
4.
Almost everybody wants to be led.
5.
The church is the hope of the world and its renewal rests in the hands of its
leaders.
1.
```

**AFTER:** Renumber in place — `1.` before "The church is the most leadership
intensive enterprise", `3.` before "Most churches unintentionally undermine",
and delete the orphaned `1.` at the end.

**WHY:** OCR moved the list markers. `1.` ended up at the bottom and `3.`
vanished entirely, so the list reads 2, 4, 5 with two unnumbered items.

**RISK:** low — the five items are intact and unambiguous; only the markers move.

### 1.2 Nehemiah list markers detached

**BEFORE:**
```
Leadership is influence (Neh. 2:5-8, 16-18/Acts 27)
Everything rises and falls on leadership (Neh. 4:9-15/2 Sam 24:10-17)
Leadership should be in the hands of the few (Neh. 5:1-7/Acts 6:1-4/James 3:1)
Leadership takes responsibility for every area of the task (Neh. 6:1-14/2
Cor. 11:24-28)
5. The most important ingredient to good leadership is integrity ...
...
1.
2.
3.
4.
```

**AFTER:** Attach `1.`–`4.` to their four items and remove the trailing block.

**WHY:** Same OCR failure as 1.1. Items 5–10 kept their numbers; 1–4 were
collected at the end.

**RISK:** low — order is unambiguous from the surrounding numbering.

### 1.3 Four orphaned bullet markers

**BEFORE:**
```
Important facts regarding the uniqueness of leadership (LJ 54)
•
•
•
•

Good News: There is no one leadership personality
```

**AFTER:** Attach each `•` to the item it belongs to.

**WHY:** OCR emitted the bullet column before the text column.

**RISK:** low.

### 1.4 "(LJ 54)" — unexplained citation

**BEFORE:** `Important facts regarding the uniqueness of leadership (LJ 54)`

**AFTER:** Expand to the full source, or delete the parenthetical.

**WHY:** `LJ 54` is an internal shorthand — possibly *Leadership Journal* p. 54,
possibly a course handbook. A student cannot resolve it.

**RISK:** **medium** — I don't know what it expands to. Needs Denis or FIRE
Bible Institute to supply it. Deleting it loses a real citation.

### 1.5 "(Blue)" — unexplained attribution

**BEFORE:** `Ten things about leadership from the book of Nehemiah (Blue)`

**AFTER:** Expand to the author's full name.

**WHY:** Surname-only attribution with no bibliography anywhere in the course.

**RISK:** **medium** — same reason as 1.4. Likely Ken Blue or J. Ronald Blue,
but I will not guess in teaching material.

---

## Lesson 2 — Five Levels of Leadership

### 2.1 "PERSONSHOOD" / "PERSONHOOD" inconsistency

**BEFORE:** Overview block reads `PERSONSHOOD`; the Level 5 section reads
`LEVEL #5 – PERSONHOOD – (This is because of who you are.)`

**AFTER:** `PERSONHOOD` in both places.

**WHY:** `PERSONSHOOD` is not a word. Same level, two spellings.

**RISK:** low.

### 2.2 "PERSONNEL DEVELOPMENT" / "PEOPLE DEVELOPMENT" inconsistency

**BEFORE:** Overview reads `PEOPLE DEVELOPMENT`; the section heading reads
`LEVEL #4 – PERSONNEL DEVELOPMENT`.

**AFTER:** `PEOPLE DEVELOPMENT` in both.

**WHY:** Maxwell's term is People Development, and the overview already uses it.
The two names for one level are confusing in a course that tests on the levels.

**RISK:** low.

### 2.3 "compliment" → "complement"

**BEFORE:** `Surround yourself with those who compliment your leadership.`

**AFTER:** `Surround yourself with those who complement your leadership.`

**WHY:** Wrong word. "Compliment" means praise; the point is filling gaps.

**RISK:** low.

### 2.4 Orphaned hyphens around the equipping process

**BEFORE:**
```
- Be a model for others to follow.

-

Pour your leadership efforts into the top 20%.
...
-

Surround yourself with those who compliment your leadership.
```

**AFTER:** Attach the hyphens to their items.

**WHY:** OCR bullet-column artifact. (Note: "Pour your leadership efforts" is
correct English — *pour*, not a typo for *four*.)

**RISK:** low.

---

## Lesson 6 — Biblical Leadership (servanthood)

### 6.1 Two-column comparison table flattened

**BEFORE:**
```
By the World

By Christ

Self-confidence
Political savvy
Ambitious
...
Trust in self

Confidence in God
Spiritual savvy
Humble
...
Trust in God
```

**AFTER:** Restore as pairs, e.g.
`Self-confidence  →  Confidence in God`, `Political savvy  →  Spiritual savvy`,
… so each worldly trait sits beside its Christlike counterpart.

**WHY:** The original is a two-column table. OCR emitted column 1 then column 2,
so the pairing — the entire pedagogical point — is invisible. A reader sees two
unrelated lists of ten.

**RISK:** **medium** — the pairing is inferable from order and is almost
certainly 1:1, but restoring it is interpretation, not transcription. Worth
checking against the original PDF.

### 6.2 "gracefull" → "grace-full"

**BEFORE:** `nonetheless, the gracefull leader seeks to foster an environment`

**AFTER:** `nonetheless, the grace-full leader seeks to foster an environment`

**WHY:** Line-wrap joined `grace-` and `full`. Every other instance in the
lesson is hyphenated.

**RISK:** low.

### 6.3 Stray asterisks

**BEFORE:** `Have double vision (Prov. 29: 1) ****`

**AFTER:** `Have double vision (Prov. 29:1)`

**WHY:** `****` is an editing marker left in the source.

**RISK:** low.

### 6.4 Inline footnote marker

**BEFORE:** `as shared by Elton Trueblood in Your Other Vocation.i So faith makes a difference`

**AFTER:** `as shared by Elton Trueblood in *Your Other Vocation*. So faith makes a difference`

**WHY:** The `i` is a footnote superscript flattened into the sentence. There is
no footnote text anywhere in the record.

**RISK:** low.

### 6.5 Mixed bullet markers

**BEFORE:** The qualities list opens with `- Are more concerned with spirit than style`
then switches to `•` for the remaining nine. Same in the traits list.

**AFTER:** One marker throughout each list.

**WHY:** Inconsistent rendering of a single list.

**RISK:** low.

### 6.6 Inconsistent reference spacing

**BEFORE:** `Mark 10: 42-44`, `Isa 43: 18-19`, `Ps 18: 36`, `Luke 16: 1-2`,
`Prov. 29: 1` — space after the colon; elsewhere `Phil. 2:5`, `Matt. 28:20` have none.

**AFTER:** No space after the colon, consistently.

**WHY:** Cosmetic consistency within one lesson.

**RISK:** low.

---

## Lesson 11 — Communication and Motivation

### 11.1 "or" → "of"

**BEFORE:** `Jesus spent two-thirds or his time with the disciples.`

**AFTER:** `Jesus spent two-thirds of his time with the disciples.`

**WHY:** Typo.

**RISK:** low.

### 11.2 Tense disagreement in the anecdote

**BEFORE:** `I once heard a little girl who prays, "O God, if you're really there…"`

**AFTER:** `I once heard a little girl pray, "O God, if you're really there…"`

**WHY:** "Once heard … who prays" mixes past and present. The rest of the
anecdote is present tense ("She feels touch and becomes excited"), so the
cleanest fix is to the framing verb only.

**RISK:** low.

### 11.3 Heading does not match its content

**BEFORE:**
```
4. Dramatize the Need
As pastor I often emphasized the importance of giving ministry workers the
"Triple A" treatment: Affirmation, Appreciation, and Attention.
```

**AFTER:** Retitle to something like `4. Affirm, Appreciate, Give Attention`.

**WHY:** The section is entirely about recognising and thanking workers. Nothing
in it dramatizes a need. The heading looks like it belongs to a different
section — possibly one that was cut.

**RISK:** **medium** — this may be the author's intended (if loose) framing, and
the seven tips are referenced by number elsewhere. Do not change the numbering.

### 11.4 Body heading disagrees with the record title

**BEFORE:** Body opens `LESSON 11: COMMUNICATION: MOTIVATION`; the
`level_materials.title` column reads `Lesson 11: Communication and Motivation`.

**AFTER:** Align the two.

**WHY:** The lesson viewer shows both, one above the other.

**RISK:** low.

---

## Lesson 4 — Visionary Leadership

### 4.1 Garbled conjunction

**BEFORE:** `A good leader continually casts vision as while painting a picture of what God wants to do next`

**AFTER:** `A good leader continually casts vision, painting a picture of what God wants to do next`

**WHY:** `as while` — two conjunctions collided.

**RISK:** low.

### 4.2 Mismatched quotation marks on the definition

**BEFORE:**
```
"Visionary leadership is…" the ability to get people to do what you want done-
when you want it done- in a way you want it done- because they want to do it."
```

**AFTER:**
```
"Visionary leadership is the ability to get people to do what you want done,
when you want it done, in a way you want it done, because they want to do it."
```

**WHY:** The quote closes after "is…" and then opens nothing, leaving a stray
closing quote at the end. The definition is one sentence.

**RISK:** low.

### 4.3 Hyphens used as commas

**BEFORE:** `what you want done- when you want it done- in a way you want it done-`

**AFTER:** Commas, as in 4.2.

**WHY:** OCR read the original's em-dashes or commas as hyphens pinned to the
preceding word.

**RISK:** low — same text as 4.2; listed separately because it also occurs
if 4.2 is declined.

### 4.4 "PTL" unexplained

**BEFORE:** `The WRONG question is, "Where have we been?" PTL we can head toward the future that God has promised`

**AFTER:** `… "Where have we been?" Praise the Lord, we can head toward the future that God has promised`

**WHY:** Abbreviation unexplained anywhere in the course, and opaque to a
second-language reader. (The French translation already expands it.)

**RISK:** low.

### 4.5 "Invitational" question numbers detached

**BEFORE:**
```
Four "Invitational" Questions Visionary/Missional Leaders Live:
1.
2.

3.
4.

Where are we headed? The WRONG question is …
```

**AFTER:** Attach `1.`–`4.` to the four questions.

**WHY:** OCR emitted the number column before the text column.

**RISK:** low.

### 4.6 Book title wrong

**BEFORE:** `Dr. Eugene Jennings has to say in his book, The Anatomy of Leadership.`

**AFTER:** `Dr. Eugene Jennings has to say in his book, An Anatomy of Leadership.`

**WHY:** Jennings's 1960 book is *An Anatomy of Leadership: Princes, Heroes, and
Supermen*. The author is correctly named; only the article is wrong.

**RISK:** low.

### 4.7 Opening block quote unattributed

**BEFORE:** The lesson opens with a four-line quotation
(`"Leaders exist so that there may be better organization…"`) with no source.

**AFTER:** Add the attribution, or mark it as the course author's own.

**WHY:** Quoted material with no source, in a course that attributes elsewhere.

**RISK:** **medium** — I could not identify the source. Needs FIRE Bible
Institute. Leaving it is defensible; guessing is not.

---

## Lesson 30 — The Law of Priorities

### 30.1 "give" → "gives"

**BEFORE:** `RETURN: What give me the greatest return?`

**AFTER:** `RETURN: What gives me the greatest return?`

**WHY:** Agreement. The neighbouring two questions use "gives".

**RISK:** low.

### 30.2 Stray hyphen before the three questions

**BEFORE:**
```
THE THREE PRIORITY QUESTIONS:
-

REQUIREMENT: What is required of me?
```

**AFTER:** Attach or remove.

**WHY:** Orphaned bullet.

**RISK:** low.

### 30.3 "LAW18" missing space

**BEFORE:** `LESSON 31: LAW18 - THE LAW OF SACRIFICE`

**AFTER:** `LESSON 31: LAW 18 - THE LAW OF SACRIFICE`

**WHY:** Typo. (Moot if S1 removes the line.)

**RISK:** low.

### 30.4 Paraphrase presented as a quotation

**BEFORE:**
```
According to this passage, Peter didn't even have to pray. He said, "It doesn't
make sense that we should neglect our priorities to wait tables."
```

**AFTER:** `He said, in effect, that it made no sense to neglect his priorities
to wait tables.`

**WHY:** The quotation marks assert Peter said these words. Acts 6:2 reads "It
is not desirable for us to neglect the word of God in order to serve tables" —
which the lesson quotes correctly two paragraphs later. The first version is the
author's paraphrase wearing quotation marks.

**RISK:** **medium** — changes authorial voice, and a student quoting the
paraphrase as scripture is exactly the harm, so I lean toward fixing it. Denis's
call.

### 30.5 Verse markers orphaned

**BEFORE:**
```
1. He recognized the existence of a whole new leadership opportunity

(v.1)
"Now at this time while the disciples were increasing in number…
```

**AFTER:** Move `(v.1)` onto the heading line.

**WHY:** OCR line-break; affects all six observation headings.

**RISK:** low.

---

## Lesson 36 — Budgets and Financial Matters

> **This lesson carries both HIGH-risk items. Read this section first.**

### 36.1 Church of the Nazarene attribution — HIGH RISK

**BEFORE:**
```
You must make a list of all office, building, land, evangelism, or other
equipment the organization owns and must update the list when items are bought
or sold. This includes the aforementioned items purchased at all levels in the
name of the Church of the Nazarene. The Board and Secretary should have a
copy of this list.
```

**AFTER:** Replace `the Church of the Nazarene` with `the church` or the
tenant's own name — or leave untouched.

**WHY:** FIRE Bible Institute is not the Church of the Nazarene. A LeaderSmart
tenant reading this is told to inventory property in another denomination's
name.

**RISK:** **HIGH.** Two readings, and I cannot tell them apart from the text:
either (a) the course adapted Nazarene material and failed to strip the
branding, which makes this a clear fix; or (b) FIRE Bible Institute has a
licensing or affiliation arrangement, which makes the reference *correct* and
removing it a misrepresentation. **Do not apply without confirming with FIRE
Bible Institute.**

### 36.2 Nazarene district-polity block — HIGH RISK

**BEFORE:** Section B in full, including:
```
B.    HOW TO SET ANNUAL DISTRICT BUDGETS (SAMPLE)
...
- Enlist the help of the leadership team to emphasize that apportionments
  support ministries which help to fulfill the Great Commission.
- Encourage your church to adopt the ten-month payment plan. Challenge
  churches to consider helping another church in payment of its' allocation.
...
- Remind leaders of resources available for Stewardship Month emphasis
  via the Stewardship Network.
```
plus the expense categories `Home Missions`, `Denominational budgetry
obligations`, `Pensions`.

**AFTER:** Either generalise the vocabulary (district → region, apportionments →
denominational contributions, drop Stewardship Network and the ten-month plan)
or keep as a labelled illustrative example.

**WHY:** "District budgets", "apportionments", "ten-month payment plan",
"Stewardship Network" and "Home Missions" are specific Nazarene denominational
machinery. A Cameroonian or Nigerian independent church has no district
apportionment and no Stewardship Network to consult, so the instructions are
unactionable — while the surrounding financial principles are sound and
genuinely useful.

**RISK:** **HIGH.** This is roughly **40% of the lesson**. Removing it guts the
lesson; generalising it is substantial rewriting that changes the author's
words. The safest middle path is a one-line framing note ("The following is a
sample from a denominational setting; adapt the categories to your own
structure") and no cuts. **Needs Denis's decision, not mine.**

### 36.3 Page numbers embedded mid-document

**BEFORE:**
```
List all possible sources of expense for the coming year (examples:
Leadership development and education, Care package, Travel related

114

expenes, Property and Contents Insurance, Office and administration,
```
Also `115` and `116`.

**AFTER:** Delete `114`, `115`, `116`.

**WHY:** PDF page numbers. `114` lands mid-phrase, splitting "Travel related
expenses" across a page number.

**RISK:** low.

### 36.4 "expenes" → "expenses"

**BEFORE:** `Travel related … expenes, Property and Contents Insurance`

**AFTER:** `Travel related expenses, Property and Contents Insurance`

**WHY:** Typo (compounded by the page break in 36.3).

**RISK:** low.

### 36.5 "budgetry" → "budgetary"

**BEFORE:** `Denominational budgetry obligations, etc.`

**AFTER:** `Denominational budgetary obligations, etc.`

**WHY:** Typo.

**RISK:** low — but note this line is also in scope for 36.2.

### 36.6 "its'" → "its"

**BEFORE:** `helping another church in payment of its' allocation.`

**AFTER:** `helping another church in payment of its allocation.`

**WHY:** `its'` is not a valid form.

**RISK:** low.

### 36.7 Mixed bullet markers

**BEFORE:** Under "Practice openness and accountability" the items use `-`, then
a `•` appears for "Praise members individually in writing". Same under
"Utilize available products and resources".

**AFTER:** One marker per list.

**WHY:** The `•` items also sit after a page number, suggesting OCR picked up a
different glyph across the page break.

**RISK:** low.

---

## Lesson 5 — Leadership Development

### 5.1 Missing verb

**BEFORE:** `The true leader is not only focused on where the organization s going`

**AFTER:** `The true leader is not only focused on where the organization is going`

**WHY:** Dropped character — first sentence of the lesson.

**RISK:** low.

### 5.2 "INDENTIFYING" → "IDENTIFYING"

**BEFORE:** `The Leader's primary responsibility: INDENTIFYING POTENTIAL LEADERS`

**AFTER:** `The Leader's primary responsibility: IDENTIFYING POTENTIAL LEADERS`

**WHY:** Typo in a headline list.

**RISK:** low.

### 5.3 "an leader" → "a leader"

**BEFORE:** `What an leader looks like`

**AFTER:** `What a leader looks like`

**WHY:** Typo in a section heading.

**RISK:** low.

### 5.4 "Chris Jesus" → "Christ Jesus"

**BEFORE:** `"What you heard from me, keep as the pattern of sound teaching, with faith and love in Chris Jesus" (2 Timothy 1:13)`

**AFTER:** `… with faith and love in Christ Jesus" (2 Timothy 1:13)`

**WHY:** Dropped letter **inside a scripture quotation**, which makes it a
misquotation of the text rather than a plain typo.

**RISK:** low — and I would treat this as the highest-priority low-risk fix.

### 5.5 INFLUENCE acrostic line-break damage

**BEFORE:**
```
I- Inspirational in Style
N- Never-failing in its promises F- Forgives quickly
L- Loves God
U- Understands people
E- Encourages others with praise N- Never quits
C- Communicates the vision
E- Enthusiastic about the future
```

**AFTER:** One letter per line, nine lines.

**WHY:** Two lines carry two acrostic entries each, so the device is unreadable
and `F` and the second `N` look like part of the preceding line.

**RISK:** low.

### 5.6 "adopted father, Joseph"

**BEFORE:** `in the carpenter shop by watching his skilled adopted father, Joseph`

**AFTER:** `… his skilled earthly father, Joseph` (or *legal father*,
*foster father*).

**WHY:** "Adopted father" is ambiguous — it reads as though Joseph was adopted.
Standard phrasing is earthly, legal, or foster father.

**RISK:** **medium** — touches Christology (Joseph's relationship to Jesus is
doctrinally loaded). Wording should be FIRE Bible Institute's choice, not mine.

---

## Lesson 26 — The Law of Reproduction

### 26.1 Wrong scripture reference — points to a real but different passage

**BEFORE:**
```
"But we proved to be gentle among you, as a nursing mother tenderly cares
for her own children… encouraging each one of you as a father would his
own children." (I Thess. 5:7-11)
```

**AFTER:** `(1 Thessalonians 2:7-11)`

**WHY:** The quoted text is 1 Thessalonians **2**:7-11. 1 Thessalonians 5:7-11
exists but says something else entirely ("those who sleep do so at night… God
has not destined us for wrath"). So this is worse than a broken link: a student
who looks it up finds real verses that do not match.

**RISK:** **medium** — the correction is certain, but it changes a citation in
teaching material and deserves a conscious sign-off. Also normalise `I Thess.`
to `1 Thess.` as used elsewhere.

### 26.2 "Promise Land" → "Promised Land"

**BEFORE:** `the leader who would finish the task of leading the people into the Promise Land`

**AFTER:** `… into the Promised Land`

**WHY:** Typo. Appears once; the second mention is correct.

**RISK:** low.

### 26.3 "Mosses" → "Moses"

**BEFORE:** `Mosses allowed Joshua to prove his leadership as a spy`

**AFTER:** `Moses allowed Joshua to prove his leadership as a spy`

**WHY:** Typo.

**RISK:** low.

### 26.4 Unclosed quotation marks

**BEFORE:**
```
"Then he (the priest) laid his hands on him (Joshua) and commissioned
him, just as the Lord had spoken through Moses.
"Thus the Lord used to speak to Moses face to face, just as a man speaks to
his friend.
When Moses returned to the camp, his servant Joshua… would not depart from his tent." (Exodus 33:11)
```

**AFTER:** Close the first quotation after "through Moses." and treat the
Exodus text as a separate quotation.

**WHY:** Three opening quotes, one closing quote.

**RISK:** low.

### 26.5 Two passages merged under one reference

**BEFORE:** The block above runs Numbers 27:23 straight into Exodus 33:11 and
labels the whole thing `(Exodus 33:11)`.

**AFTER:** Label each separately — `(Numbers 27:23)` then `(Exodus 33:11)`.

**WHY:** The first sentence ("Then he laid his hands on him and commissioned
him") is Numbers 27:23, the point's own proof text. As stored, it is attributed
to Exodus 33:11.

**RISK:** **medium** — requires splitting a quotation block, which is more than
a typo fix, and the intended boundary is my inference.

### 26.6 Triplet broken mid-sentence

**BEFORE:**
```
It takes a leader to know a Leader. It
takes a leader to show a Leader. It
takes a leader to grow a Leader.
```

**AFTER:** Three lines, one sentence each, consistent capitalisation of
"leader".

**WHY:** Line breaks land mid-sentence and the capitalisation alternates
within a single rhetorical device.

**RISK:** low.

---

## Lesson 25 — The Law of Empowerment

### 25.1 "A fourth gift" in the fifth point

**BEFORE:**
```
5. He supported Paul amidst serious challenges. (Acts 9:29-30)

A fourth gift Barnabas gave Paul was amazing favor and support.
```

**AFTER:** `A fifth gift Barnabas gave Paul was amazing favor and support.`

**WHY:** It is point 5 of 5. Point 2 also says "One of the gifts he gave Paul",
so the gift count was never maintained — but "fourth" under heading 5 is
plainly wrong either way.

**RISK:** **medium** — the author may have been counting gifts separately from
observations (points 1 and 3 describe belief and defence rather than gifts, so a
gift-count of four is arguable). Renumbering asserts an interpretation.

### 25.2 Barnabas conflated with Joseph Barsabbas

**BEFORE:**
```
Barnabas, who might have been the one who lost the vote to become the twelfth
apostle (replacing Judas), was Paul's biggest cheerleader
```

**AFTER:** Delete the parenthetical, or mark it explicitly as speculation.

**WHY:** Acts 1:23-26 names the two candidates as Joseph called Barsabbas
(Justus) and Matthias. Barnabas is a different man — also named Joseph
(Acts 4:36), which is where the confusion comes from, but mainstream
scholarship does not identify them.

**RISK:** **medium** — the text already hedges with "might have been", so it is
presented as conjecture rather than fact. But it is conjecture most
commentators reject, inside a course that students will quote. Flagging for a
theological reviewer rather than fixing silently.

### 25.3 Acts 13 quotation malformed

**BEFORE:**
```
4. He empowered Gentiles throughout Cyprus and Galatia to turn to

Christ. (Acts 13)
"
We had to speak the Word of God to you (Jews) first.
```

**AFTER:** `(Acts 13:46-47)` and the opening quote attached to the text.

**WHY:** Chapter-only reference where every sibling point gives verses, and a
quotation mark alone on its own line.

**RISK:** low.

### 25.4 Quotation interrupts a numbered list

**BEFORE:**
```
1.  Insecurity
2.  Desire for Job Security
3.  Paradigm Shift
4.  Ego
    It's amazing what can be accomplished
    if the leader doesn't care who gets the credit.

5. Co-Dependency
```

**AFTER:** Move the quotation below item 5, or set it off clearly.

**WHY:** As stored, the aphorism reads as the definition of "Ego".

**RISK:** low.

### 25.5 Aphorism unattributed

**BEFORE:** `It's amazing what can be accomplished if the leader doesn't care who gets the credit.`

**AFTER:** Add attribution.

**WHY:** Widely attributed to Harry S. Truman (and to Robert Yates). Presented
bare here while the lesson attributes elsewhere.

**RISK:** low — attribution is genuinely contested, so "commonly attributed to"
is the honest form.

---

## Lesson 34 — The Law of Legacy

### 34.1 Malformed reference

**BEFORE:** `For I gave you an example that you also should do as I did to you." (John 13:1215)`

**AFTER:** `(John 13:12-15)`

**WHY:** Missing hyphen produced a non-existent verse number. John 13 has 38
verses.

**RISK:** low — the intended range is certain from the quoted text.

### 34.2 Page numbers embedded mid-quotation

**BEFORE:**
```
"And the seventy returned with joy, saying, 'Lord, even the demons are

109

subject to us in Your name.' And He said, 'I was watching Satan fall from heaven

110

like lightning.
```
Also `108` and `111`.

**AFTER:** Delete `108`, `109`, `110`, `111`.

**WHY:** PDF page numbers, here splitting a scripture quotation in two places.
The Luke 10 quote is interrupted twice mid-sentence.

**RISK:** low.

### 34.3 "all of Asia" overstates Acts 19:10

**BEFORE:** `they reached all of Asia within two years (Acts 19:10)`

**AFTER:** `they reached all of the province of Asia within two years (Acts 19:10)`

**WHY:** Acts 19:10 describes the Roman province of Asia — western Asia Minor,
modern-day western Türkiye — not the continent. A modern reader hears
"Asia" as the continent, making the claim wildly larger than scripture supports.

**RISK:** **medium** — changes a factual claim the author made, though it only
sharpens what the cited verse actually says.

### 34.4 Quotation depends on a disputed verse

**BEFORE:**
```
He said, 'Because of your unbelief…but this kind does not go out except by prayer
and fasting.'" (Matthew 17:18-21)
```

**AFTER:** Keep, but note the textual variant — or quote Mark 9:29 instead.

**WHY:** Matthew 17:21 is absent from the earliest manuscripts and is omitted or
footnoted in most modern translations (NIV, ESV, NASB 2020). The "prayer and
fasting" clause the point rests on is the disputed part.

**RISK:** **medium** — a textual-criticism judgement, not a typo. Belongs to
FIRE Bible Institute's doctrinal position on manuscripts, not to me.

---

## Lesson 37 — Conclusion

### 37.1 "Luke 6:50" does not exist

**BEFORE:**
```
A leader's ability to lead and disciple others is directly proportionate to his
own walk with the Lord (see Luke 6:50).
```

**AFTER:** Most likely `(see Luke 6:40)` — "A disciple is not above his
teacher, but everyone when fully trained will be like his teacher" — which
matches the claim precisely.

**WHY:** **Luke 6 has 49 verses.** The reference is impossible.

**RISK:** **medium.** The error is certain; the correction is not. Luke 6:40
fits the argument almost exactly, but Luke 6:47-49 (building on rock) is a
plausible alternative if the author meant foundations. Needs confirmation
against the original handout rather than my inference.

### 37.2 "Jake Welch" → "Jack Welch"

**BEFORE:** `Jake Welch, CEO of General Electric has said`

**AFTER:** `Jack Welch, CEO of General Electric, has said`

**WHY:** GE's chairman and CEO 1981–2001 was **Jack** Welch. Also adds the
missing comma after the appositive.

**RISK:** low.

### 37.3 "hones" → "honest"

**BEFORE:** `If you start avoiding hones evaluations of your programs`

**AFTER:** `If you start avoiding honest evaluations of your programs`

**WHY:** Typo. (The same sentence correctly uses "hone" earlier — "sharpen and
hone effectiveness" — which is probably what confused the typist.)

**RISK:** low.

### 37.4 "and" → "an" inside the Welch quotation

**BEFORE:** `Risk is taking on something that holds and enormous chance of failure.`

**AFTER:** `… that holds an enormous chance of failure.`

**WHY:** Typo inside a quotation, so it misquotes a named person.

**RISK:** low.

### 37.5 "you" → "your" inside the Welch quotation

**BEFORE:** `you cannot predict with any degree of certainty the outcome of you actions`

**AFTER:** `… the outcome of your actions`

**WHY:** As 37.4 — same quotation.

**RISK:** low.

### 37.6 "simple" → "simply"

**BEFORE:** `Am I fulfilling the role the organization needs or simple the role I like?`

**AFTER:** `… or simply the role I like?`

**WHY:** Typo in a checklist heading.

**RISK:** low.

### 37.7 "other" → "others"

**BEFORE:** `Delegation not only enables other to be entrusted with responsibilities`

**AFTER:** `Delegation not only enables others to be entrusted with responsibilities`

**WHY:** Typo.

**RISK:** low.

### 37.8 "is" → "are"

**BEFORE:** `a checklist that you can daily use to ensure that your priorities and focus is correct`

**AFTER:** `… that your priorities and focus are correct`

**WHY:** Compound subject.

**RISK:** low.

### 37.9 Garbled sentence about courage

**BEFORE:**
```
I've fought with discouragement those times when my emotional and spiritual
batteries desperately need to be charged, but I've also fought discouragement or
dysfunctional courage.
```

**AFTER:** Probably `… but I've also fought a dysfunctional courage.` — the next
sentence defines exactly that: "This sinful counterfeit of courage emerges when
I inflate my ego".

**WHY:** As written the clause says the author fought "discouragement or
dysfunctional courage", which repeats "discouragement" from the same sentence
and does not parse.

**RISK:** **medium** — the intended wording is inferred from the following
sentence. Reasonably confident, not certain.

### 37.10 Page numbers embedded

**BEFORE:** `117` between checklist items 3 and 4; `118` between items 10 and
the closing paragraph.

**AFTER:** Delete both.

**WHY:** PDF page numbers.

**RISK:** low.

### 37.11 Footer separator and missing accent

**BEFORE:** `Yaounde, Cameroon II info@firebibleschool.org`

**AFTER:** `Yaoundé, Cameroon | info@firebibleschool.org`

**WHY:** `II` is OCR of a pipe or double bar, and Yaoundé carries an acute
accent — which matters in a course delivered in Cameroon and now available in
French.

**RISK:** low. **Note:** this line must be kept, not deleted — it is the one
"trailing line" in the course that is real content, so S1 must skip Lesson 37.

### 37.12 Run-on in the delegation item

**BEFORE:**
```
Delegation not only enables other to be entrusted with responsibilities that will
cause their growth and development, these potential leader also help carry the load.
```

**AFTER:**
```
Delegation not only enables others to be entrusted with responsibilities that
will cause their growth and development; these potential leaders also help carry
the load.
```

**WHY:** Comma splice plus singular "leader" with plural "help". Overlaps 37.7.

**RISK:** low.

---

## Appendix — one defect in the French I delivered

Not an English-source issue. Found while re-reading my own Lesson 30
translation, and listed here rather than quietly corrected, because the brief
says apply nothing to `level_materials` in this pass.

**Lesson 30, `lesson_content_fr`**

**BEFORE:** `Enfin, j'intervins à la fin pour peaufiner le produit achevé`

**AFTER:** `Enfin, j'interviens à la fin pour peaufiner le produit achevé`

**WHY:** `j'intervins` is the *passé simple* — a literary past tense. The
English is present ("Finally, I come in at the end"), and the surrounding French
is present. My error, one letter.

**RISK:** low. Approve it with the batch, or tell me to fix it immediately and
separately.

---

## Recommended sequencing

1. **Apply the 55 LOW-risk fixes** as one batch. They are typos, OCR noise and
   formatting; none changes meaning. `5.4` (Chris → Christ Jesus, inside a
   scripture quotation) and `37.2` (Jack Welch) are the most worth doing today.
2. **Decide the 15 MEDIUM items individually.** Most need a judgement I should
   not make alone: the correct target of `Luke 6:50`, whether Peter's paraphrase
   should wear quotation marks, Joseph's described relationship to Jesus, the
   Matthew 17:21 variant, and the Barnabas/Barsabbas identification.
3. **Take the 2 HIGH items to FIRE Bible Institute** before touching them.
   36.2 alone is about 40% of Lesson 36.
4. Restore from `level_materials_backup_before_fix` if anything goes wrong —
   48 rows, matched on `id`.
