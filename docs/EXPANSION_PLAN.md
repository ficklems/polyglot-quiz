# Content and functionality expansion: plan and decisions

Source of the requirements: the owner's brief and the archive `quiz_independent_audit.zip`
(now in [`content/`](../content/): `AGENT_PROMPT.md`, `ORIGINAL_DESIGN_SPEC.md`, data files).
Work is split into phases; the application stays working and green after each one.

## Phases

Revised with the owner on 2026-11-27 after phase 3 (reasons below the table). Phases are
listed in the order they are done.

| #   | Phase                                                                                                               | Status                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1   | Analysis of the repository, the archive and the conflicts between them                                              | **done** (this document)                                                          |
| 2   | Import of the question database, duplicate detection, serving rules                                                 | **done** (PR "content import")                                                    |
| 3   | Categories, subcategories (search, multi-select) and the 20 themed quizzes                                          | **done** (PR "categories and themed quizzes")                                     |
| 4   | Languages and regions as independent settings, difficulty incl. Mixed, sampling policy                              |                                                                                   | 4   | Languages and regions as independent settings, difficulty incl. Mixed, sampling policy | **done** (PR "regions and difficulty") |     |
| 4½  | Deployment: hosted Postgres + free hosting, live link in the README                                                 | code **done**; goes live once the owner creates the accounts (docs/DEPLOYMENT.md) |
| 5   | Question formats: order and matching first, then the rest, the map (guess location) last                            | next                                                                              |
| 6a  | Game modes without Multiplayer: Learning, Random Mix, Review Mistakes (stored in the browser, no accounts)          | planned                                                                           |
| 7   | Content editing, Ukrainian proofreading first; a first batch (weakest UK categories) before phase 5, then ongoing   | planned, starts early                                                             |
| 8   | QA showcase: Allure report on GitHub Pages, axe accessibility checks, visual regression, bug reports, test strategy | planned                                                                           |
| 9   | README, sources and licenses (final version)                                                                        | started in phase 2, kept up to date                                               |
| 10  | Demo video preparation                                                                                              | planned                                                                           |
| 6b  | Multiplayer rooms (WebSocket, synced timers), if time allows                                                        | optional, last                                                                    |

Automated tests are written with every phase (unit, API, E2E, `--repeat-each=5` before merging);
phase 8 is about presenting the testing, not starting it.

### Why the plan was changed

- **Deployment added (4½).** It was in the v1 scope but missing from the phases. A live link
  matters more for the portfolio than another format, and hosting surfaces real problems
  early: SQLite → Postgres, ~2 s startup to load 24k questions, memory on a free tier.
- **Multiplayer split off (6b).** It is bigger than the other four modes together (rooms,
  WebSocket, timer sync) and its tests are the most flake-prone. The other modes are cheap
  and come first.
- **Phase 8 became the QA showcase.** Tests already come with every phase; for a QA
  portfolio the value is in how the testing is presented and what it covers beyond
  functional checks (accessibility, visual regression, reports, real bug reports).
- **Ukrainian proofreading starts earlier.** Only 2,866 of 24k questions are playable in
  Ukrainian and three categories have fewer than 10; it is the most visible gap for a
  Ukrainian-speaking audience.
- **Formats split by cost.** Order and matching are simple and unlock hundreds of questions;
  the map needs a map library and licensed tiles, so it goes last.

## Phase 1 findings

**The archive:** 24,256 trilingual draft records in 31 categories, 8 formats (19,285
multiple choice, 3,054 true/false, 1,086 guess the year, 482 higher/lower, 122 order,
103 matching, 87 map, 37 emoji), 20 collections, sampling and naming policies, audit and
review files. Structural validation: clean. No record is verified for publication.

**Findings that shaped the import:**

1. **Ukrainian machine translation.** 21,416 records (`OPEN-*`, from OpenTriviaQA/QuizBase)
   got their Ukrainian from the Argos EN→UK model. Random samples are often
   unintelligible ("Що таке ім'я британського шоу знайомств, що відбулася від відомого
   червоно-головного співака від Ліверпуля?"), including records listed as revised. The
   Polish (QuizBase) and English texts of the same records read well.
2. **Answer position.** In 88% of records the correct answer is option `o1`; options must
   be shuffled (already the case), and order/matching formats must shuffle too.
3. **Difficulty.** 96% of records are "medium"; Easy/Hard/Mixed (phase 4) need calibration.
4. **Region.** 90% "global"; UA/PL/CE have 150 records each or fewer.
5. **Licensing.** 21,416 records are CC BY-SA 4.0 (share-alike) → the content folder is
   published under CC BY-SA 4.0 with attribution; the code under MIT.
6. **Size.** 73 MB of JSONL; stored compressed per category (7.7 MB).

## Decisions

| Topic                                             | Decision                                                                                                                                                                                                                                                                                                     | By                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| Leaderboard (spec says "no leaderboards")         | **Kept**: per-topic top 10 with server-side scores, built in milestone 2 and tested; documented as a deliberate deviation                                                                                                                                                                                    | owner                             |
| Which drafts the game serves                      | **Drafts without known problems**; flagged records are withheld                                                                                                                                                                                                                                              | owner                             |
| Code license                                      | **MIT** for code, **CC BY-SA 4.0** for content                                                                                                                                                                                                                                                               | owner                             |
| Ukrainian machine translation (finding 1)         | Not served in Ukrainian until proofread; still served in English and Polish. A known problem under the decision above. Easy to change in `apps/api/src/content/load-content.ts`                                                                                                                              | agent, following the owner's rule |
| Topics with < 10 playable questions in a language | Shown with the real count and selectable (they can be combined); Start stays disabled while the selection has fewer than 10 questions                                                                                                                                                                        | agent                             |
| Ranking of custom mixes                           | One whole category = that topic's ranked round; themed quizzes have their own boards; any other mix is unranked (422 on submit), so nobody can cherry-pick easy subcategories                                                                                                                                | agent                             |
| Themed quiz rules                                 | `collections.json` rules are filters over the shared questions (OR across rules, AND within a rule); Millionaire = 15 questions easy→hard, Generations balanced by decade, others by category. `requireRegionalSelection` (Only Locals) waits for regions in phase 4                                         | agent                             |
| Region rule                                       | A named region (and "auto", which follows the language) = its own + global questions, aiming at 35/65; "all" = every region; "international only" = global. Other regions are excluded, never mixed in silently; a small pool offers "use all regions"                                                       | agent (spec §3)                   |
| Only Locals                                       | Strict: only the chosen region; with "all" or "international only" it falls back to the language's region                                                                                                                                                                                                    | agent (spec §3, §5)               |
| Mixed difficulty                                  | 40/40/20 applied inside each category (so category shares stay equal), filled honestly: 96% of the data is medium, so most rounds stay mostly medium until phase 7 calibrates                                                                                                                                | agent                             |
| Ranking with settings                             | Only standard rounds are ranked: mixed difficulty and the default length (or the quiz's fixed length); settings a quiz overrides don't count against it                                                                                                                                                      | agent                             |
| Prefer unseen questions                           | The browser keeps the last 500 played ids and sends them; the server avoids them, repeats only when the pool runs out and reports how many (shown on the first question)                                                                                                                                     | agent (spec §4)                   |
| Hosting                                           | Render free plan (static site + API in Frankfurt) and Neon Postgres for the leaderboard only. Rounds stay in a local SQLite file: they live minutes, and a full async Postgres layer for them would cost more than losing a round during a deploy                                                            | agent                             |
| Film and series titles                            | Owner request: show the official Ukrainian/Polish release title, not the English one or a literal translation (matches `original_name_policy.json`). Done in phase 7 from Wikidata labels and Wikipedia article titles, recorded with the source; titles without a confirmed local release keep the original | owner                             |
| Subcategory names                                 | Written for this phase in `content/subcategory_names.json` (269, three languages); drafts to proofread in phase 7                                                                                                                                                                                            | agent                             |
| Legacy vs imported duplicates                     | 23 pairs found by manual review; for each, the record with the better localization is kept; references to retired ids are migrated                                                                                                                                                                           | agent                             |
| Formats in rounds                                 | Rounds use the 6 single-answer formats now; order and matching wait for their UI (phase 5)                                                                                                                                                                                                                   | agent                             |
| Profanity                                         | Never served until an opt-in setting exists (spec: default exclude, explicit opt-in)                                                                                                                                                                                                                         | agent                             |
| Classic scoring vs spec's multiplayer scoring     | Classic keeps 100 points / 20 s; Multiplayer will use the spec's 1 point / 30 s                                                                                                                                                                                                                              | agent                             |

## Not done yet (honest list)

- Phases 3–10.
- No new questions written; no fact verification done in this phase.
- 5,116 records with open Ukrainian translation flags and 21,416 machine-translated
  Ukrainian records need proofreading before they can be shown in Ukrainian.
