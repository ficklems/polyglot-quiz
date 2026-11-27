import { LANGUAGES } from '@pq/shared';
import { text } from '../data/i18n';
import { correctAnswerText, questionCount } from '../data/questions';
import { expect, test } from '../fixtures';

test.describe('Home screen', () => {
  test('shows the three v1 topics and keeps Start disabled until one is picked @smoke', async ({
    homePage,
  }) => {
    await homePage.goto();

    await expect(homePage.heading).toHaveText(text('en', 'home.title'));
    await expect(homePage.topicCards).toHaveCount(3);
    await expect(homePage.startButton).toBeDisabled();
  });

  test('selecting a topic marks it as pressed and enables Start @smoke', async ({ homePage }) => {
    await homePage.goto();

    await homePage.selectTopic('General knowledge');

    await expect(homePage.topicCard('General knowledge')).toHaveAttribute('aria-pressed', 'true');
    await expect(homePage.topicCard('Music by decade')).toHaveAttribute('aria-pressed', 'false');
    await expect(homePage.startButton).toBeEnabled();
  });

  test('each topic card shows how many questions it has', async ({ homePage }) => {
    await homePage.goto();

    await expect(homePage.topicCard('Music by decade')).toContainText(
      text('en', 'topics.questions_other', { count: String(questionCount('music-decades')) }),
    );
  });

  test('Start opens the first question of the chosen topic @smoke', async ({
    homePage,
    quizPage,
  }) => {
    await homePage.goto();

    await homePage.startRound('Music by decade');

    await expect(quizPage.progress).toHaveAttribute('aria-valuenow', '1');
    await expect(quizPage.answers).toHaveCount(4);
    // The question must be one of the seeded music questions.
    expect(correctAnswerText(await quizPage.questionText(), 'en')).toBeTruthy();
  });
});

test.describe('Languages @i18n', () => {
  for (const lang of LANGUAGES) {
    test.describe(`starting in ${lang}`, () => {
      test.use({ uiLang: lang });

      test('renders the UI and topics in that language', async ({ homePage, page }) => {
        await homePage.goto();

        await expect(page.locator('html')).toHaveAttribute('lang', lang);
        await expect(homePage.heading).toHaveText(text(lang, 'home.title'));
        await expect(homePage.topicCards).toHaveCount(3);
      });
    });
  }

  test('switching language updates the UI and topic names and survives a reload', async ({
    homePage,
    page,
  }) => {
    await homePage.goto();
    await expect(homePage.topicCard('General knowledge')).toBeVisible();

    await homePage.switchLanguage('pl');

    await expect(homePage.heading).toHaveText(text('pl', 'home.title'));
    await expect(homePage.topicCard('Wiedza ogólna')).toBeVisible();
    await expect(homePage.languageButton('pl')).toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    await expect(homePage.heading).toHaveText(text('pl', 'home.title'));
  });

  test('keeps the selected topic highlighted after switching language', async ({ homePage }) => {
    await homePage.goto();
    await homePage.selectTopic('History of the region');

    await homePage.switchLanguage('uk');

    await expect(homePage.topicCard('Історія й події регіону')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

test.describe('Theme', () => {
  test('toggles dark mode and remembers it after a reload', async ({ homePage, page }) => {
    await homePage.goto();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await homePage.themeToggle.click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(homePage.themeToggle).toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('Resilience', () => {
  test('shows an error with a working retry when topics fail to load', async ({
    homePage,
    page,
  }) => {
    let failNext = true;
    await page.route('**/api/topics?*', async (route) => {
      if (failNext) {
        failNext = false;
        await route.fulfill({
          status: 500,
          json: { statusCode: 500, error: 'Internal Server Error', message: 'boom' },
        });
        return;
      }
      await route.continue();
    });

    await homePage.goto();
    await expect(homePage.loadError).toContainText(text('en', 'topics.error'));

    await homePage.retryButton.click();

    await expect(homePage.loadError).toBeHidden();
    await expect(homePage.topicCards).toHaveCount(3);
  });
});
