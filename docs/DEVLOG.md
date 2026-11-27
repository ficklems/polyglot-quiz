# Development log

Newest entry first. Each entry: what was done, decisions and why, how it was verified, what is next.

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
