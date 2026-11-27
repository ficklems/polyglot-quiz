# Content license

The question content in this folder (`questions/`, `legacy/`, `review/`, `structured_facts.json`,
`categories.json`, `collections.json` and the other data files) is licensed under the
**Creative Commons Attribution-ShareAlike 4.0 International License (CC BY-SA 4.0)**:
https://creativecommons.org/licenses/by-sa/4.0/

The application source code is licensed separately under the MIT License (`../LICENSE`).

## Why CC BY-SA 4.0

21,416 of the records are adapted from open datasets licensed under CC BY-SA 4.0:

- **OpenTriviaQA** by uberspot and contributors — https://github.com/uberspot/OpenTriviaQA
  (CC BY-SA 4.0; full license text in `licenses/OpenTriviaQA-LICENSE.txt`).
- **QuizBase** dumps (refinements and Polish translations of OpenTriviaQA) —
  https://github.com/maciejdzierzek/quizbase-dumps-byasa/releases/tag/v2026-05-04 (CC BY-SA 4.0).

Share-alike requires adapted material to be distributed under the same license, so the
whole dataset is published under CC BY-SA 4.0. Per-record attribution is kept in each
record's `sources` field (dataset, source id, original URL, license, attribution text).

Other references and libraries used to prepare the data, with their licenses, are listed in
[`DATA_SOURCES.md`](DATA_SOURCES.md), [`RESEARCH_SOURCES.md`](RESEARCH_SOURCES.md) and
[`licenses/`](licenses/). No images, audio, video, lyrics or other media are included.

## Changes made to the adapted material

Made while preparing the dataset (see `DATA_SOURCES.md` and `review/`):

- normalized layout and classification into 31 categories, subcategories, regions, tags;
- Ukrainian translations added (machine translation with the Argos EN→UK model, partly
  revised; the unrevised ones are not shown in the game), English and Polish editorial
  corrections, original-name restorations;
- filtering, quarantine and duplicate removal; explanations added for some records.

Made in this repository:

- 45 questions authored for this project added (`legacy/questions.jsonl`), 23 semantic
  duplicates between them and the dataset resolved
  (`migrations/legacy-duplicate-map.json`);
- per-language serving rules (which records the game shows) applied on import; record texts
  are not changed by the import.

## No warranty

The content is a draft. Most facts are not independently verified (see
`../docs/CONTENT_REPORT.md`). It is provided as is, without warranty of any kind.
