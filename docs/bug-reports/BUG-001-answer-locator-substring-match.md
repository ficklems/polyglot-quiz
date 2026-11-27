# BUG-001: Answer locator matches the wrong option because of a substring match

| Field       | Value                                                                    |
| ----------- | ------------------------------------------------------------------------ |
| Severity    | Medium (flaky test, blocks CI intermittently)                            |
| Priority    | P1                                                                       |
| Status      | Fixed                                                                    |
| Component   | Test framework (`tests/pages/QuizPage.ts`)                               |
| Environment | Playwright 1.65, Chromium + Pixel 7, UI in EN, branch `feat/quiz-rounds` |
| Found by    | Automated run with `--repeat-each=5 --workers=4`                         |

## Steps to reproduce

1. Run `npx playwright test e2e/quiz.spec.ts:82 --project=chromium --repeat-each=10`.
2. Wait for a round where question `general-02` ("What is the chemical symbol for gold?")
   comes up and the shuffled option order puts "Go" under letter A.

## Expected result

`QuizPage.answerWrongly()` clicks the single option with the text "Ag".

## Actual result

`strict mode violation: getByRole('group', { name: 'Answer options' }).getByRole('button')
.filter({ hasText: 'Ag' }) resolved to 2 elements`. Failed in about 2 of 20 runs.

## Evidence

Snapshot from `error-context.md`:

```
- group "Answer options":
  - button "Go"   (badge A)
  - button "Au"   (badge B)
  - button "Gd"   (badge C)
  - button "Ag"   (badge D)
```

## Root cause

`hasText` is a case-insensitive **substring** match over the element's whole text, and the
letter badge is part of the button's text content. Badge "A" + "Go" = "AGo", which contains
"ag". Only short answers combined with a particular shuffle trigger it, so single runs pass.

## Fix

Locate an answer by its exact text:
`answers.filter({ has: page.getByText(answerText, { exact: true }) })`.
Same pattern applied to topic cards. Verified: UI suite 5× in parallel, 230/230 passed.

## Lesson

Run new suites with `--repeat-each` before merging; prefer exact matches for short texts.
