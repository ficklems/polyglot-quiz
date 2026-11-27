# Test plan: Polyglot Quiz v1

> Living document. Status: **draft**, covers milestones 0–1 (home screen, rounds, timer, results);
> extended with each milestone.

## 1. Scope

**In scope (v1):** language selection (UA/EN/PL), topic selection, quiz rounds (10 questions,
4 options, 20 s timer), scoring, results, top-10 leaderboard, light/dark theme,
responsive layout, REST API.

**Out of scope (v1):** accounts, admin API, Android app, load/performance testing,
security testing beyond input validation and not exposing correct answers.

## 2. Approach

| Level                | Tool                    | What it covers                                                                        | Where                       |
| -------------------- | ----------------------- | ------------------------------------------------------------------------------------- | --------------------------- |
| Unit                 | Vitest                  | Pure logic: language/theme resolution, scoring, timer math, shuffling; locale files   | `apps/web/src/**/*.test.ts` |
| API integration      | Vitest + `app.inject()` | Routes, validation, error format, DB queries, in-process                              | `apps/api/test/`            |
| API black-box        | Playwright `request`    | Contract (Zod schemas), status codes, negative cases against the running server       | `tests/api/`                |
| UI end-to-end        | Playwright              | User flows, i18n, theme, resilience (mocked failures), mobile viewports               | `tests/e2e/`                |
| Manual / exploratory | Test cases + charters   | Layout with long PL/UA words, real devices, accessibility with keyboard/screen reader | `docs/test-cases/`          |

## 3. Environments and browsers

- Local: Node 22; API with an in-memory SQLite DB; web app built and served by `vite preview`.
- CI: GitHub Actions, Ubuntu; Chromium, Firefox, WebKit; Pixel 7 and iPhone 15 viewports.

## 4. Test data

- Seeded topics and questions in the API (`apps/api/src/db/seed/`).
- Each Playwright worker gets the same deterministic seed; tests don't depend on each other.
- UI strings come from the app's locale files (`tests/data/i18n.ts`).

## 5. Risks and focus areas

| Risk                                          | Mitigation                                                      |
| --------------------------------------------- | --------------------------------------------------------------- |
| Missing or broken translations                | Locale parity unit tests; every UI flow runs in all 3 languages |
| Plural forms wrong in UA/PL                   | Test of plural categories per language (Intl.PluralRules)       |
| Timer flakiness                               | Playwright clock instead of real waiting                        |
| Random question order makes tests flaky       | Seeded RNG, injected in tests                                   |
| Correct answers leak to the client            | API tests assert round payloads contain no answers              |
| Layout breaks with long words / small screens | Mobile viewports in CI + manual checks                          |

## 6. Entry / exit criteria

- **Entry:** feature merged to a branch, CI quality job green.
- **Exit:** all automated tests green in CI on all browsers; no open bugs of severity High+;
  manual test cases for the feature executed and recorded.

## 7. Defect management

Bugs are filed as Markdown in `docs/bug-reports/` using the template there
(`BUG-NNN-short-title.md`), with steps, expected/actual, severity, environment, evidence.
