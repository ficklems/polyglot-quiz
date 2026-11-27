# Development log

Newest entry first. Each entry: what was done, decisions and why, how it was verified, what is next.

---

## 2026-11-27 · Milestone 1: questions and playable rounds (branch `feat/quiz-rounds`)

### Done

- **Question bank:** 45 questions (15 per topic) in UA, EN and PL, in
  `apps/api/src/db/seed/questions.ts`. Facts only, neutral wording, no lyrics. Stored in SQLite
  (`questions`, `question_texts`, `question_options`) and seeded when the table is empty.
  Topics now report `questionCount`.
- **Rounds API:**
  - `POST /api/rounds` `{ topicId, lang, seed? }` → `201`: 10 random questions from the topic,
    options shuffled, **no correct answers** in the payload (`strictObject` contract).
  - `POST /api/rounds/:id/answers` `{ questionId, optionId | null }` → correct/timed-out,
    the correct option id, points, running score, `finished`. `null` = timer ran out.
  - `POST /api/rounds/:id/next` → `204`: starts the timer for the next question.
  - `GET /api/rounds/:id` → summary (score, correct count, progress, finished).
  - Rules: answers in order; one answer per question (`409`); question outside the round
    (`400`); unknown round (`404`); finished round (`409`); `next` only once per question
    (`409`), so it can't reset a running timer.
  - **Server-side time limit:** 20 s + 2 s grace for network delay; a late answer counts as a
    time-out even if correct. The clock is injectable (`buildApp({ now })`).
  - **Seeded RNG** (Mulberry32 + Fisher–Yates) so a seed reproduces the round exactly.
- **Web:** quiz screen (A + C design): progress "levels", score, 20 s timer that turns red in
  the last 5 s, question card, 4 answers, feedback (correct / wrong + correct answer /
  time's up), Next / See result. Result screen with points (plural forms in UA/PL), correct
  count, verdict, Play again, Back to topics. Language switcher hidden during a round. Error
  states for failed round start and failed answer submit.
- **Tests:**
  - Vitest API: rounds (creation, seeds, language, validation, scoring, full round, order and
    duplicate rules, time limit with a fake clock incl. the exact grace boundary, `next` rules,
    summary, finished round), question-bank quality (unique ids, ≥10 per topic, texts in all
    languages, no duplicate options, correct answers spread over a–d), RNG/shuffle.
  - Vitest web: countdown math, option states after an answer.
  - Playwright API: round contract per language, no answer leak, seed reproducibility,
    4 invalid inputs, full perfect round, time-out, 409s, 404.
  - Playwright UI: perfect round → 1000 points, wrong answer marked + correct revealed, next
    question resets state, zero-point round + Play again, quit, **timer with `page.clock`**
    (countdown, time-out, pauses on feedback, restarts per question), Polish round,
    keyboard-only play, start failure and answer failure (mocked with `page.route`).
  - New page objects `QuizPage`, `ResultPage`; `tests/data/questions.ts` is the test oracle
    (correct answers from the seed data).

### Decisions

- **Explicit `next` endpoint** instead of measuring from the previous answer: otherwise
  time spent reading the feedback would count against the next question.
- **2 s grace** on the server limit: the browser's timer and the server's clock never agree
  exactly; without grace an answer clicked at 19.9 s could be rejected.
- **Optional `seed` in the request** makes API and E2E tests deterministic. Known trade-off:
  a player could replay a known seed. Acceptable for a portfolio game; candidate for v2
  (only allow it in a test environment).
- **Scoring:** 100 points per correct answer, no speed bonus yet (keeps the server rules
  simple and the expected values obvious in tests).

### Bugs found while testing

- **Test race (fixed):** `QuizPage.questionText()` used `textContent()`, which doesn't
  auto-wait, so it sometimes read the home heading or the previous question mid-transition.
  Now it waits for an enabled answer button first.
- **Flaky locator (fixed), found with `--repeat-each=5`:** answers were located with
  `hasText`, a case-insensitive substring match over the whole button. The letter badge is
  part of the button text, so "A" + "Go" = "AGo" matched the answer "Ag" (strict-mode
  violation in ~10% of runs, depending on shuffle). Fix: match the answer text exactly.
  Logged as [BUG-001](bug-reports/BUG-001-answer-locator-substring-match.md).
- **UI (fixed):** the letter badge on a wrong answer kept its neutral color.

### Verified

- `format:check`, `lint`, `typecheck`: clean.
- Vitest: 80 passed (55 API, 25 web).
- Playwright locally (`api`, `chromium`, `mobile-chrome`): 70 passed; UI suite repeated 5× in
  parallel (4 workers): 230/230.
- Screenshots of the quiz screen in light and dark themes: `docs/screenshots/`.

### Next

1. Leaderboard: `POST /api/leaderboard` (nickname + finished round id, score taken from the
   server, not the client), `GET /api/leaderboard?topicId=`, screen after the result.
2. More questions (target 30 per topic) and an admin API in v2.
3. Accessibility checks with `@axe-core/playwright` (`@a11y` tag).
4. Deployment (Postgres + free hosting) and a live link in the README.

---

## 2026-11-27 · Milestone 0: project skeleton

### Done

- **Monorepo** with npm workspaces: `packages/shared`, `apps/api`, `apps/web`, `tests`.
  Shared tooling at the root: TypeScript (strict), ESLint (flat config, typescript-eslint,
  react-hooks), Prettier, `.nvmrc` (Node 22), `.env.example`.
- **Shared contracts** (`@pq/shared`): supported languages (`uk`, `en`, `pl`), topic schemas,
  the API error format and the health response, all as Zod schemas with inferred types.
- **API** (`@pq/api`, Fastify 5):
  - `GET /api/health` → `{ status: "ok" }`
  - `GET /api/topics?lang=uk|en|pl` → the three v1 topics translated; `400` with a `details`
    entry for `lang` when the language is missing or unsupported; JSON `404` for unknown routes.
  - SQLite via built-in `node:sqlite`; schema + seed applied on startup; `:memory:` in tests.
  - `buildApp()` builds the app without listening, so tests use `app.inject()`.
- **Web** (`@pq/web`, React 19 + Vite 8): home screen in the chosen "A + C" design:
  language switcher (UA/EN/PL), dark/light toggle, topic cards loaded from the API,
  Start button enabled after a topic is picked (gameplay comes next, so it shows a notice).
  Language and theme are remembered in localStorage; the language falls back to the browser's,
  the theme to the OS setting. Loading and error-with-retry states.
- **Tests**
  - Vitest, web: language detection, theme resolution, and locale-file checks (same keys in
    every language, every plural form each language needs, no empty strings).
  - Vitest, API: topics in every language, validation errors, 404 format, config parsing.
  - Playwright API project: health, topics contract per language, same ids across languages,
    4 invalid-query cases, 404 format.
  - Playwright UI: home screen, topic selection, Start, every starting language, switching
    language + persistence after reload, selection kept across language switch, dark mode +
    persistence, error + retry using a mocked failing response (`page.route`).
  - Page Object `HomePage`, custom fixtures with `uiLang` / `uiTheme` options, and a `text()`
    helper that reads UI copy from the app's own locale files.
- **CI** (GitHub Actions): job 1: format check, lint, typecheck, Vitest; job 2: Playwright on
  Chromium, Firefox, WebKit, Pixel 7 and iPhone 15 viewports, HTML report uploaded as an artifact.

### Decisions

- **TypeScript pinned to ~6.0**: TS 7 is out, but typescript-eslint supports `<6.1`.
- **`node:sqlite` instead of better-sqlite3**: no native build step locally or in CI.
  It prints an experimental warning, silenced in the start scripts. Postgres comes with deployment.
- **Zod validation inside handlers** (instead of Fastify JSON Schemas) so the API and the tests
  share one source of truth; one error handler maps `ZodError` to `400`.
- **Locale-driven tests**: element names come from the locale JSON, so a translation change
  doesn't break tests and the same flow can run in every language.
- **Region topic** is scoped to Poland, Ukraine and Central Europe (assumption; easy to change
  in `apps/api/src/db/seed/topics.ts`).

### Verified

- `npm run format:check`, `npm run lint`, `npm run typecheck`: clean.
- `npm test`: 26 Vitest tests passed (9 web, 17 API).
- Playwright: 30 passed locally on projects `api`, `chromium`, `mobile-chrome` (installed Chrome).
  Firefox, WebKit and mobile Safari run in CI only.
- Screenshots of the home screen (light/dark, Pixel 7): `docs/screenshots/`.

### Incident (fixed)

The first CI run failed at typecheck. `.gitignore` had `data/` (meant for the SQLite folder),
which also ignored `tests/data/` (the i18n helper), so that file never reached GitHub. Locally
everything passed because the file existed on disk. Fix: scope the rule to `/data/` and
`apps/api/data/` (same in the ESLint and Prettier ignores), then verify on a clean clone with
`npm ci`. Lesson: CI on a clean checkout catches what local runs hide.

### Next

1. Questions: DB tables + seed (~15 per topic per language), `POST /api/rounds` (start a round:
   10 shuffled questions **without** correct answers), `POST /api/rounds/:id/answers`
   (server-side check), seeded RNG for deterministic tests.
2. Quiz screen: question card, 4 answers, 20 s timer (tested with `page.clock`), feedback,
   result screen.
3. Leaderboard API + screen.
4. QA docs: fill in the test plan, first manual test cases, first bug reports.
