import { LEADERBOARD_SIZE, QUESTIONS_PER_ROUND, type LeaderboardEntry } from '@pq/shared';
import { text } from '../data/i18n';
import { TOPIC_COUNT } from '../data/questions';
import { expect, test, uniqueNickname } from '../fixtures';

const TOPIC = 'General Knowledge';

test.describe('Saving a result', () => {
  test('a finished round can be saved and shows up highlighted in the topic table @smoke', async ({
    homePage,
    quizPage,
    leaderboardPage,
  }, testInfo) => {
    const nickname = uniqueNickname(testInfo);
    await homePage.goto();
    await homePage.startRound(TOPIC);
    await quizPage.playToTheEnd('correct', QUESTIONS_PER_ROUND);

    await leaderboardPage.saveAs(nickname);

    await expect(leaderboardPage.savedStatus).toBeVisible();
    await expect(leaderboardPage.ownRow).toHaveCount(1);
    await expect(leaderboardPage.ownRow).toContainText(nickname);
    await expect(leaderboardPage.ownRow).toContainText('1000');
    await expect(leaderboardPage.ownRow).toContainText(text('en', 'leaderboard.you'));
    // Saving again is not offered: the form is gone.
    await expect(leaderboardPage.nicknameInput).toBeHidden();
  });

  test('explains an invalid nickname and saves once it is fixed', async ({
    homePage,
    quizPage,
    leaderboardPage,
  }, testInfo) => {
    await homePage.goto();
    await homePage.startRound(TOPIC);
    await quizPage.playToTheEnd('wrong', QUESTIONS_PER_ROUND);

    await leaderboardPage.saveAs('x');
    await expect(leaderboardPage.validationError('tooShort')).toBeVisible();
    await expect(leaderboardPage.nicknameInput).toHaveAttribute('aria-invalid', 'true');

    await leaderboardPage.saveAs('<b>bold</b>');
    await expect(leaderboardPage.validationError('invalid')).toBeVisible();

    await leaderboardPage.saveAs(uniqueNickname(testInfo));
    await expect(leaderboardPage.savedStatus).toBeVisible();
  });

  test('remembers the nickname for the next round', async ({
    homePage,
    quizPage,
    resultPage,
    leaderboardPage,
  }, testInfo) => {
    const nickname = uniqueNickname(testInfo);
    await homePage.goto();
    await homePage.startRound(TOPIC);
    await quizPage.playToTheEnd('wrong', QUESTIONS_PER_ROUND);
    await leaderboardPage.saveAs(nickname);
    await expect(leaderboardPage.savedStatus).toBeVisible();

    await resultPage.playAgainButton.click();
    await quizPage.playToTheEnd('wrong', QUESTIONS_PER_ROUND);

    await expect(leaderboardPage.nicknameInput).toHaveValue(nickname);
  });

  test('shows the own entry below the top 10 when it did not make it', async ({
    page,
    homePage,
    quizPage,
    leaderboardPage,
  }) => {
    const top: LeaderboardEntry[] = Array.from({ length: LEADERBOARD_SIZE }, (_, i) => ({
      id: 1000 + i,
      rank: i + 1,
      nickname: `Champion ${i + 1}`,
      score: 1000,
      correctCount: 10,
      totalQuestions: 10,
      topicId: 'general',
      createdAt: '2026-01-01T00:00:00.000Z',
    }));
    const own: LeaderboardEntry = {
      ...top[0]!,
      id: 1,
      rank: 42,
      nickname: 'Underdog',
      score: 0,
      correctCount: 0,
    };
    await page.route('**/api/leaderboard?*', (route) =>
      route.fulfill({ json: { topicId: 'general', entries: top } }),
    );
    await page.route('**/api/leaderboard', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 201, json: { entry: own } })
        : route.continue(),
    );
    await homePage.goto();
    await homePage.startRound(TOPIC);
    await quizPage.playToTheEnd('wrong', QUESTIONS_PER_ROUND);

    await leaderboardPage.saveAs('Underdog');

    await expect(leaderboardPage.savedStatus).toContainText('42');
    await expect(leaderboardPage.rows).toHaveCount(LEADERBOARD_SIZE + 1);
    await expect(leaderboardPage.rows.last()).toHaveAttribute('aria-current', 'true');
    await expect(leaderboardPage.rows.last()).toContainText('Underdog');
  });

  test('tells the player when the save fails', async ({
    page,
    homePage,
    quizPage,
    leaderboardPage,
  }, testInfo) => {
    await page.route('**/api/leaderboard', (route) =>
      route.request().method() === 'POST' ? route.abort('connectionfailed') : route.continue(),
    );
    await homePage.goto();
    await homePage.startRound(TOPIC);
    await quizPage.playToTheEnd('wrong', QUESTIONS_PER_ROUND);

    await leaderboardPage.saveAs(uniqueNickname(testInfo));

    await expect(page.getByRole('alert')).toHaveText(text('en', 'save.errors.failed'));
    await expect(leaderboardPage.saveButton).toBeEnabled();
  });
});

test.describe('Leaderboard screen', () => {
  test('opens from home, filters by topic and goes back', async ({
    homePage,
    leaderboardPage,
    quizApi,
  }, testInfo) => {
    const round = await quizApi.playRound(QUESTIONS_PER_ROUND, { topicId: 'music' });
    await quizApi.submitOk(round.roundId, uniqueNickname(testInfo));
    await homePage.goto();

    await leaderboardPage.openButton.click();

    await expect(leaderboardPage.heading).toBeVisible();
    await expect(leaderboardPage.filter(text('en', 'leaderboard.allTopics'))).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(leaderboardPage.rows.first()).toBeVisible();

    await leaderboardPage.filter('Music').click();

    await expect(leaderboardPage.filter('Music')).toHaveAttribute('aria-pressed', 'true');
    await expect(leaderboardPage.table).toContainText(
      text('en', 'leaderboard.caption', { topic: 'Music' }),
    );

    await leaderboardPage.backButton.click();
    await expect(homePage.topicCards).toHaveCount(TOPIC_COUNT);
  });

  test('shows an empty state when nobody has played yet', async ({
    page,
    homePage,
    leaderboardPage,
  }) => {
    await page.route('**/api/leaderboard*', (route) =>
      route.fulfill({ json: { topicId: null, entries: [] } }),
    );
    await homePage.goto();

    await leaderboardPage.openButton.click();

    await expect(leaderboardPage.emptyState).toBeVisible();
    await expect(leaderboardPage.table).toBeHidden();
  });

  test('shows an error when the leaderboard cannot be loaded', async ({
    page,
    homePage,
    leaderboardPage,
  }) => {
    await page.route('**/api/leaderboard*', (route) =>
      route.fulfill({
        status: 500,
        json: { statusCode: 500, error: 'Internal Server Error', message: 'x' },
      }),
    );
    await homePage.goto();

    await leaderboardPage.openButton.click();

    await expect(leaderboardPage.loadError).toBeVisible();
  });
});

test.describe('Leaderboard in Polish @i18n', () => {
  test.use({ uiLang: 'pl' });

  test('labels and topic filters are translated', async ({ homePage, leaderboardPage }) => {
    await homePage.goto();

    await leaderboardPage.openButton.click();

    await expect(leaderboardPage.heading).toHaveText(text('pl', 'leaderboard.title'));
    await expect(leaderboardPage.filter('Wiedza ogólna')).toBeVisible();
  });
});
