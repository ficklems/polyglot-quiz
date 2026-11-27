# Content and functionality expansion: plan and decisions

Source of the requirements: the owner's brief and the archive `quiz_independent_audit.zip`
(now in [`content/`](../content/): `AGENT_PROMPT.md`, `ORIGINAL_DESIGN_SPEC.md`, data files).
Work is split into phases; the application stays working and green after each one.

## Phases

| #   | Phase                                                                                   | Status                              |
| --- | --------------------------------------------------------------------------------------- | ----------------------------------- |
| 1   | Analysis of the repository, the archive and the conflicts between them                  | **done** (this document)            |
| 2   | Import of the question database, duplicate detection, serving rules                     | **done** (PR "content import")      |
| 3   | Categories, subcategories (search, multi-select) and the 20 themed quizzes              | next                                |
| 4   | Languages and regions as independent settings, difficulty incl. Mixed, sampling policy  | planned                             |
| 5   | The eight question formats (UI for order, matching, map, …)                             | planned                             |
| 6   | The five game modes (Classic, Multiplayer rooms, Learning, Random Mix, Review Mistakes) | planned                             |
| 7   | Content editing and verification (Ukrainian proofreading first)                         | planned, ongoing                    |
| 8   | Automated tests for all of the above                                                    | with every phase                    |
| 9   | README, sources and licenses                                                            | started in phase 2, kept up to date |
| 10  | Demo video preparation                                                                  | planned                             |

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

| Topic                                             | Decision                                                                                                                                                                        | By                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Leaderboard (spec says "no leaderboards")         | **Kept**: per-topic top 10 with server-side scores, built in milestone 2 and tested; documented as a deliberate deviation                                                       | owner                             |
| Which drafts the game serves                      | **Drafts without known problems**; flagged records are withheld                                                                                                                 | owner                             |
| Code license                                      | **MIT** for code, **CC BY-SA 4.0** for content                                                                                                                                  | owner                             |
| Ukrainian machine translation (finding 1)         | Not served in Ukrainian until proofread; still served in English and Polish. A known problem under the decision above. Easy to change in `apps/api/src/content/load-content.ts` | agent, following the owner's rule |
| Topics with < 10 playable questions in a language | Shown but disabled with the real count (sampling policy: "show actual eligible counts")                                                                                         | agent                             |
| Legacy vs imported duplicates                     | 23 pairs found by manual review; for each, the record with the better localization is kept; references to retired ids are migrated                                              | agent                             |
| Formats in rounds                                 | Rounds use the 6 single-answer formats now; order and matching wait for their UI (phase 5)                                                                                      | agent                             |
| Profanity                                         | Never served until an opt-in setting exists (spec: default exclude, explicit opt-in)                                                                                            | agent                             |
| Classic scoring vs spec's multiplayer scoring     | Classic keeps 100 points / 20 s; Multiplayer will use the spec's 1 point / 30 s                                                                                                 | agent                             |

## Not done yet (honest list)

- Phases 3–10.
- No new questions written; no fact verification done in this phase.
- 5,116 records with open Ukrainian translation flags and 21,416 machine-translated
  Ukrainian records need proofreading before they can be shown in Ukrainian.
