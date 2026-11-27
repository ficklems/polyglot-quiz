# Quiz Game: project conventions

This file is the source of truth for how the project is structured and written.
Read it before changing code. Update it when a convention changes.

**Work log rule:** after every working session, add an entry at the top of
[`docs/DEVLOG.md`](docs/DEVLOG.md): what was done, decisions and why, how it was verified,
what is next. Read the latest entry before starting new work.

## 1. What the project is

A multilingual quiz game (UA / EN / PL), built as a QA portfolio project.
The game is the system under test; **the test suite is the main deliverable**.

**v1 scope:** language and topic selection, 10-question rounds, 4 answer options,
a 20 s timer per question, score screen, top-10 leaderboard by nickname (no accounts),
light and dark themes, responsive (mobile-first) layout, deployment on free hosting.
v1 topics: music by decade, history and events of the region, general knowledge.

**Later (v2+):** admin API for adding questions, a puns topic (per-language questions,
not translated), accounts, difficulty levels, Allure reports, Docker, Android app via
Capacitor (Google Play: needs a closed test with 12+ testers for 14 days first).

## 2. Stack

| Layer            | Choice                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| Runtime          | Node.js 22 (`.nvmrc`)                                                                            |
| Language         | TypeScript 6 everywhere, `strict: true` (pinned to ~6.0 until typescript-eslint supports TS 7)   |
| Frontend         | React 19 + Vite 8                                                                                |
| i18n             | i18next + react-i18next, JSON resources per language (`uk`, `en`, `pl`)                          |
| Backend          | Node.js + Fastify 5, run with `tsx`; request input validated with Zod                            |
| Database         | Built-in `node:sqlite` locally and in tests (`:memory:`); hosted Postgres planned for deployment |
| Shared contracts | Zod schemas + inferred types in `packages/shared` (`@pq/shared`)                                 |
| Unit tests       | Vitest                                                                                           |
| E2E + API tests  | Playwright Test                                                                                  |
| CI               | GitHub Actions                                                                                   |
| Lint / format    | ESLint + Prettier                                                                                |

## 3. Repository layout (npm workspaces monorepo)

```
quiz-game/
├── apps/
│   ├── web/                      # React frontend
│   │   ├── src/
│   │   │   ├── app/              # App shell, routing, providers
│   │   │   ├── features/         # One folder per feature
│   │   │   │   ├── quiz/         #   components/, hooks/, api/, quiz.utils.ts, *.test.ts
│   │   │   │   ├── topics/
│   │   │   │   ├── leaderboard/
│   │   │   │   └── settings/     #   language + theme
│   │   │   ├── shared/           # Reusable UI, hooks, utils used by 2+ features
│   │   │   ├── i18n/             # i18next setup + locales/{uk,en,pl}.json
│   │   │   └── styles/           # theme tokens (CSS variables), global styles
│   │   └── vite.config.ts
│   └── api/                      # Fastify backend
│       ├── src/
│       │   ├── app.ts            # Builds the Fastify instance (no listen) – used by tests
│       │   ├── server.ts         # Entry point: app + listen
│       │   ├── plugins/          # db, cors, env config, error handler
│       │   ├── routes/           # One folder per resource
│       │   │   ├── topics/       #   index.ts (routes), schemas.ts, service.ts
│       │   │   ├── quiz/
│       │   │   └── leaderboard/
│       │   └── db/               # migrations/, seed/ (questions per topic + language)
│       └── test/                 # Unit/integration tests via app.inject()
├── packages/
│   └── shared/                   # Zod schemas + types shared by web, api and tests
├── tests/                        # Playwright workspace @pq/tests (black-box, against running app)
│   ├── e2e/                      # UI specs by feature: home.spec.ts, quiz.spec.ts …
│   ├── api/                      # API specs: topics.api.spec.ts …
│   ├── pages/                    # Page Objects: HomePage.ts, QuizPage.ts …
│   ├── fixtures/                 # Custom fixtures (page objects, uiLang/uiTheme options)
│   ├── data/                     # Test data + i18n helper that reads the app's locale files
│   └── playwright.config.ts      # Starts API (in-memory DB) + built web app automatically
├── docs/
│   ├── DEVLOG.md                 # Work log, newest entry first
│   ├── test-plan.md
│   ├── test-cases/               # Manual test cases (Markdown tables)
│   └── bug-reports/              # BUG-001-short-title.md …
├── .github/workflows/ci.yml
├── CLAUDE.md                     # This file
└── README.md
```

Rules:

- **Feature-first** on the frontend: code lives in the feature that owns it. Move it to
  `shared/` only when a second feature needs it.
- Backend routes are Fastify plugins; each resource folder holds its routes, schemas and
  business logic (`service.ts`). Handlers stay thin.
- `app.ts` builds the app without listening, so tests can use `app.inject()`.
- Anything both the frontend and backend use (request/response shapes, enums) goes in
  `packages/shared`. Never duplicate a type.

## 4. Code conventions

- Files: `kebab-case.ts`; React components `PascalCase.tsx`; tests `*.test.ts` (Vitest),
  `*.spec.ts` (Playwright UI), `*.api.spec.ts` (Playwright API); page objects `XxxPage.ts`.
- Names: `camelCase` for variables/functions, `PascalCase` for types/components,
  `UPPER_SNAKE_CASE` for constants. No `I` prefix on interfaces.
- No `any`. Validate input at the boundaries (Fastify schemas / Zod), trust types inside.
- Pure game logic (scoring, shuffling, timer math) lives in plain functions with unit tests,
  separate from React components.
- Randomness is injectable (seeded RNG or a parameter), so tests are deterministic.
- **Correct answers never reach the browser** before the player answers; the server checks.
- No user-facing text in code: every string goes through i18n keys (`quiz.next`, `quiz.timeLeft`).
  Plurals use i18next plural rules (UA and PL have several forms).
- Theme: colors, fonts, radii are CSS variables in `styles/`; components never hardcode colors.
- Accessibility: real `<button>`/`<a>`/`<label>`, visible focus, keyboard playable,
  correct answer shown by icon + text, not by color alone.
- Comments explain _why_, not _what_.

## 5. Testing conventions

**Test pyramid:** most checks in unit tests (game logic), API tests for every endpoint
(happy path, validation errors, edge cases), a focused set of E2E user flows.

Playwright rules (from the official best practices):

- Locators: prefer user-facing ones, `getByRole`, `getByLabel`, `getByText`. Add
  `data-testid` only where no accessible locator exists. Never CSS/XPath tied to layout.
- UI text in tests comes from the app's locale files via `tests/data/i18n.ts` (`text(lang, key)`),
  never hardcoded, so the same test runs in every language.
- The starting language/theme is a fixture option: `test.use({ uiLang: 'pl', uiTheme: 'dark' })`.
- Web-first assertions only: `await expect(locator).toBeVisible()`; never `waitForTimeout`.
- Every test is independent: its own data and state; shared setup goes in fixtures or `beforeEach`.
- Page Objects hold locators and actions; **assertions stay in the spec**.
- Page objects and API clients are injected through custom fixtures (`tests/fixtures/`).
- API tests use the built-in `request` fixture with `baseURL` from config.
- Timer tests use Playwright's clock (`page.clock`), never real waiting.
- Projects in config: Chromium, Firefox, WebKit + mobile viewports (Pixel, iPhone).
- Traces `on-first-retry` in CI; HTML report uploaded as a CI artifact.
- The test oracle for answers is `tests/data/questions.ts` (reads the seed data).
- Playwright tests share one API server (and DB) across tests and workers: never assume an
  empty leaderboard. Use `uniqueNickname(testInfo)` and check invariants; test exact orderings
  in Vitest, where each test gets its own `:memory:` database.
- Set up state over HTTP with the `quizApi` fixture instead of clicking through the UI when the
  UI isn't what the test is about.
- Before merging a new or changed suite, run it with `--repeat-each=5` to catch flakiness.
- Test names describe behaviour: `shows time-out state when timer reaches zero`.
- Tags: `@smoke` for the critical path, `@i18n`, `@a11y`.

## 6. Commands

| Command                                                    | What it does                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| `npm install`                                              | Install all workspaces                                              |
| `npm run dev`                                              | API on :3000 + web on :5173 (proxy `/api`)                          |
| `npm run lint` / `npm run format`                          | ESLint / Prettier                                                   |
| `npm run typecheck`                                        | `tsc --noEmit` in every workspace                                   |
| `npm test`                                                 | Vitest: unit tests (web) + API integration tests via `app.inject()` |
| `npm run test:e2e`                                         | All Playwright projects (starts servers itself)                     |
| `npm run test:api`                                         | Playwright API project only                                         |
| `PW_CHANNEL=chrome npm run test:e2e -- --project=chromium` | Use an installed Chrome instead of downloading browsers             |

## 7. Git and CI

- Branches: `main` is always green; work in `feat/…`, `fix/…`, `test/…`, `docs/…`.
- Commits follow Conventional Commits: `feat(quiz): add 20s timer`, `test(api): cover leaderboard validation`.
- CI on every push and PR: lint → typecheck → unit → API → E2E.
- No secrets in the repo; config comes from env vars, documented in `.env.example`.

## 8. Content rules (questions)

- Questions are data (DB seed), one record per question with translations per language.
- Music: facts only (year, artist, album); no lyrics or audio clips.
- History/politics: verifiable facts (dates, places, events), neutral wording.
- Assets: only CC0 / clearly licensed (e.g. Kenney.nl), credited in README → Credits.

## 9. Design

Chosen direction: **"A + C"**: playful violet/yellow palette (Nunito body text, Unbounded
headings), rounded shapes, segmented "level" progress, timer block, card with offset shadow.
Light and dark themes; tokens live in `apps/web/src/styles/tokens.css`.
Reference canvas (private to the owner): https://claude.ai/artifact/6rYCSPHkEWhnJU6b35QXFG
