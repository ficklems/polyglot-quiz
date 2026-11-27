import { POINTS_PER_CORRECT, QUESTIONS_PER_ROUND, TIME_LIMIT_SECONDS } from '@pq/shared';
import { TOPIC_COUNT } from '../data/questions';
import { text } from '../data/i18n';
import { expect, test } from '../fixtures';

const TOPIC = 'General Knowledge';

test.describe('Quiz round', () => {
  test('a perfect round ends with the maximum score @smoke', async ({
    homePage,
    quizPage,
    resultPage,
  }) => {
    await homePage.goto();
    await homePage.startRound(TOPIC);

    for (let i = 1; i <= QUESTIONS_PER_ROUND; i++) {
      await expect(quizPage.progress).toHaveAttribute('aria-valuenow', String(i));
      await quizPage.answerCorrectly();
      await expect(quizPage.feedback).toHaveText(
        text('en', 'quiz.feedbackCorrect', { points: String(POINTS_PER_CORRECT) }),
      );
      await expect(quizPage.score(i * POINTS_PER_CORRECT)).toBeVisible();
      await quizPage.continue();
    }

    const max = String(QUESTIONS_PER_ROUND * POINTS_PER_CORRECT);
    await expect(resultPage.heading).toBeVisible();
    await expect(resultPage.summary).toContainText(
      text('en', 'result.points_other', { count: max }),
    );
    await expect(resultPage.summary).toContainText(
      text('en', 'result.correct', {
        correct: String(QUESTIONS_PER_ROUND),
        total: String(QUESTIONS_PER_ROUND),
      }),
    );
    await expect(resultPage.summary).toContainText(text('en', 'result.verdict.perfect'));
  });

  test('a wrong answer is marked and the correct one is revealed', async ({
    homePage,
    quizPage,
  }) => {
    await homePage.goto();
    await homePage.startRound(TOPIC);
    const correct = await quizPage.correctAnswer();

    const picked = await quizPage.answerWrongly();

    await expect(quizPage.feedback).toHaveText(
      text('en', 'quiz.feedbackWrong', { answer: correct }),
    );
    await expect(quizPage.answer(picked)).toContainText(text('en', 'quiz.wrongMark'));
    await expect(quizPage.answer(correct)).toContainText(text('en', 'quiz.correctMark'));
    await expect(quizPage.score(0)).toBeVisible();
    for (const button of await quizPage.answers.all()) {
      await expect(button).toBeDisabled();
    }
  });

  test('moving to the next question resets the answers and advances progress', async ({
    homePage,
    quizPage,
  }) => {
    await homePage.goto();
    await homePage.startRound(TOPIC);
    // Generic prompts ("Which came first?") repeat, so compare prompt and options together.
    const first = `${await quizPage.questionText()}|${(await quizPage.optionTexts()).join('|')}`;
    await quizPage.answerCorrectly();

    await quizPage.continue();

    await expect(quizPage.progress).toHaveAttribute('aria-valuenow', '2');
    const second = `${await quizPage.questionText()}|${(await quizPage.optionTexts()).join('|')}`;
    expect(second).not.toBe(first);
    // 4 options, or 2 for true/false and "which is higher" questions.
    await expect(quizPage.answers.first()).toBeEnabled();
    expect([2, 4]).toContain(await quizPage.answers.count());
    for (const button of await quizPage.answers.all()) {
      await expect(button).toBeEnabled();
    }
  });

  test('a poor round ends with zero points; Play again starts a fresh round', async ({
    homePage,
    quizPage,
    resultPage,
  }) => {
    await homePage.goto();
    await homePage.startRound(TOPIC);
    for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
      await quizPage.answerWrongly();
      await quizPage.continue();
    }

    await expect(resultPage.summary).toContainText(
      text('en', 'result.points_other', { count: '0' }),
    );
    await expect(resultPage.summary).toContainText(text('en', 'result.verdict.tryAgain'));

    await resultPage.playAgainButton.click();

    await expect(quizPage.progress).toHaveAttribute('aria-valuenow', '1');
    await expect(quizPage.score(0)).toBeVisible();
  });

  test('Back to topics leaves the round', async ({ homePage, quizPage }) => {
    await homePage.goto();
    await homePage.startRound(TOPIC);
    await expect(quizPage.question).toBeVisible();

    await quizPage.quitButton.click();

    await expect(homePage.heading).toHaveText(text('en', 'home.title'));
    await expect(homePage.topicCards).toHaveCount(TOPIC_COUNT);
  });
});

test.describe('Timer', () => {
  test('counts down and times out, revealing the correct answer', async ({
    page,
    homePage,
    quizPage,
  }) => {
    await page.clock.install();
    await homePage.goto();
    await homePage.startRound(TOPIC);
    const correct = await quizPage.correctAnswer();

    await expect(quizPage.timer).toHaveAttribute(
      'aria-label',
      text('en', 'quiz.secondsLeft_other', { count: String(TIME_LIMIT_SECONDS) }),
    );

    await page.clock.runFor(5_000);
    await expect(quizPage.timer).toHaveAttribute(
      'aria-label',
      text('en', 'quiz.secondsLeft_other', { count: String(TIME_LIMIT_SECONDS - 5) }),
    );

    await page.clock.runFor((TIME_LIMIT_SECONDS - 5) * 1000);

    await expect(quizPage.feedback).toHaveText(
      text('en', 'quiz.feedbackTimeout', { answer: correct }),
    );
    await expect(quizPage.answers.first()).toBeDisabled();
    await expect(quizPage.score(0)).toBeVisible();
  });

  test('stops while the feedback is shown', async ({ page, homePage, quizPage }) => {
    await page.clock.install();
    await homePage.goto();
    await homePage.startRound(TOPIC);
    await page.clock.runFor(3_000);
    await quizPage.answerCorrectly();
    const shown = await quizPage.timer.getAttribute('aria-label');

    await page.clock.runFor(30_000);

    await expect(quizPage.timer).toHaveAttribute('aria-label', shown ?? '');
    await expect(quizPage.nextButton).toBeVisible();
  });

  test('restarts from the full limit on the next question', async ({
    page,
    homePage,
    quizPage,
  }) => {
    await page.clock.install();
    await homePage.goto();
    await homePage.startRound(TOPIC);
    await page.clock.runFor(12_000);
    await quizPage.answerCorrectly();

    await quizPage.continue();

    await expect(quizPage.timer).toHaveAttribute(
      'aria-label',
      text('en', 'quiz.secondsLeft_other', { count: String(TIME_LIMIT_SECONDS) }),
    );
  });
});

test.describe('Round language @i18n', () => {
  test.use({ uiLang: 'pl' });

  test('questions come in the language the round started in and the switcher is hidden', async ({
    homePage,
    quizPage,
  }) => {
    await homePage.goto();
    await homePage.startRound('Wiedza ogólna');

    // Throws if the text isn't a Polish question from the bank.
    const correct = await quizPage.correctAnswer();
    await expect(homePage.languageGroup).toBeHidden();

    await quizPage.pick(correct);
    await expect(quizPage.feedback).toHaveText(
      text('pl', 'quiz.feedbackCorrect', { points: String(POINTS_PER_CORRECT) }),
    );
  });
});

test.describe('Keyboard @a11y', () => {
  test('a round can be played with the keyboard only', async ({ page, homePage, quizPage }) => {
    await homePage.goto();
    await homePage.startRound(TOPIC);
    const correct = await quizPage.correctAnswer();

    await quizPage.answer(correct).focus();
    await page.keyboard.press('Enter');
    await expect(quizPage.nextButton).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(quizPage.progress).toHaveAttribute('aria-valuenow', '2');
  });
});

test.describe('Resilience', () => {
  test('shows an error when starting a round fails', async ({ page, homePage }) => {
    await page.route('**/api/rounds', (route) =>
      route.fulfill({
        status: 503,
        json: { statusCode: 503, error: 'Service Unavailable', message: 'down' },
      }),
    );
    await homePage.goto();

    await homePage.startRound(TOPIC);

    await expect(homePage.startError).toBeVisible();
    await expect(homePage.startButton).toBeEnabled();
  });

  test('shows an error when an answer cannot be sent', async ({ page, homePage, quizPage }) => {
    await homePage.goto();
    await homePage.startRound(TOPIC);
    await page.route('**/api/rounds/*/answers', (route) => route.abort('connectionfailed'));

    await quizPage.answerCorrectly();

    await expect(page.getByRole('alert')).toHaveText(text('en', 'quiz.answerError'));
  });
});
