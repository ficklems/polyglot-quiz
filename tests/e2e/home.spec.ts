import { LANGUAGES, QUESTIONS_PER_ROUND } from '@pq/shared';
import { text } from '../data/i18n';
import {
  COLLECTION_COUNT,
  collectionName,
  questionCount,
  subcategoryCount,
  subcategoryName,
  THIN_UK_TOPIC,
  thinSubcategory,
  TOPIC_COUNT,
  topicName,
} from '../data/questions';
import { expect, test } from '../fixtures';

/** Categories shown before "Show all" (apps/web CategoryPicker). */
const COLLAPSED = 8;

test.describe('Home screen', () => {
  test('shows a collapsed category list and the themed quizzes, Start disabled @smoke', async ({
    homePage,
  }) => {
    await homePage.goto();

    await expect(homePage.heading).toHaveText(text('en', 'home.title'));
    await expect(homePage.categoryRows).toHaveCount(COLLAPSED);
    await expect(homePage.collectionButtons).toHaveCount(COLLECTION_COUNT);
    await expect(homePage.selectionStatus).toHaveText(text('en', 'home.selectNothing'));
    await expect(homePage.startButton).toBeDisabled();
  });

  test('"Show all" lists every category and "Show fewer" collapses it again', async ({
    homePage,
  }) => {
    await homePage.goto();

    await homePage.showAllButton(TOPIC_COUNT).click();
    await expect(homePage.categoryRows).toHaveCount(TOPIC_COUNT);

    await homePage.showFewerButton.click();
    await expect(homePage.categoryRows).toHaveCount(COLLAPSED);
  });

  test('selecting a category marks it as pressed, counts its questions and enables Start @smoke', async ({
    homePage,
  }) => {
    await homePage.goto();

    await homePage.category('Music').click();

    await expect(homePage.category('Music')).toHaveAttribute('aria-pressed', 'true');
    await expect(homePage.category('History & Events')).toHaveAttribute('aria-pressed', 'false');
    await expect(homePage.selectionStatus).toHaveText(
      text('en', 'home.selectionCount_other', { count: String(questionCount('music', 'en')) }),
    );
    await expect(homePage.summary).toContainText(text('en', 'home.ranked'));
    await expect(homePage.startButton).toBeEnabled();
  });

  test('each category shows how many questions it has', async ({ homePage }) => {
    await homePage.goto();

    await expect(homePage.categoryRow('Music')).toContainText(
      text('en', 'topics.questions_other', { count: String(questionCount('music', 'en')) }),
    );
  });

  test('two categories add up and are announced as an unranked mix', async ({ homePage }) => {
    await homePage.goto();

    await homePage.category('Music').click();
    await homePage.category('Geography').click();

    const total = questionCount('music', 'en') + questionCount('geography', 'en');
    await expect(homePage.selectionStatus).toHaveText(
      text('en', 'home.selectionCount_other', { count: String(total) }),
    );
    await expect(homePage.summary).toContainText(text('en', 'home.mixNotRanked'));
  });

  test('Start opens the first question of the chosen category @smoke', async ({
    homePage,
    quizPage,
  }) => {
    await homePage.goto();

    await homePage.startRound('Music');

    await expect(quizPage.progress).toHaveAttribute('aria-valuenow', '1');
    await expect(quizPage.answers.first()).toBeEnabled();
    expect([2, 4]).toContain(await quizPage.answers.count());
    expect((await quizPage.questionMeta()).category).toBe('music');
  });
});

test.describe('Category search', () => {
  test('finds a category hidden in the collapsed list, ignoring case', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.category('General Knowledge')).toBeHidden();

    await homePage.search('general KNOW');

    await expect(homePage.category('General Knowledge')).toBeVisible();
  });

  test('finds a category through one of its subcategories and opens it', async ({ homePage }) => {
    await homePage.goto();

    await homePage.search('eurovision');

    await expect(homePage.subcategory('Music', 'Eurovision')).toBeVisible();
    await expect(homePage.expandButton('Music')).toHaveAttribute('aria-expanded', 'true');
  });

  test('says when nothing matches', async ({ homePage }) => {
    await homePage.goto();

    await homePage.search('zzzz');

    await expect(homePage.categoryRows).toHaveCount(0);
    await expect(homePage.noResults('zzzz')).toBeVisible();
  });

  test.describe('in Polish @i18n', () => {
    test.use({ uiLang: 'pl' });

    test('ignores Polish diacritics', async ({ homePage }) => {
      await homePage.goto();

      await homePage.search('wiedza ogolna');

      await expect(homePage.category('Wiedza ogólna')).toBeVisible();
    });
  });
});

test.describe('Subcategories', () => {
  test('expanding a category shows its subcategories, each selectable on its own', async ({
    homePage,
  }) => {
    const sub = 'eurovision';
    await homePage.goto();

    await homePage.expandButton('Music').click();
    await expect(homePage.expandButton('Music')).toHaveAttribute('aria-expanded', 'true');
    await homePage.subcategory('Music', subcategoryName(sub, 'en')).click();

    await expect(homePage.subcategory('Music', subcategoryName(sub, 'en'))).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(homePage.category('Music')).toHaveAttribute('aria-pressed', 'false');
    const count = subcategoryCount('music', sub, 'en');
    await expect(homePage.selectionStatus).toHaveText(
      count >= QUESTIONS_PER_ROUND
        ? text('en', 'home.selectionCount_other', { count: String(count) })
        : text('en', 'home.selectionTooSmall_other', {
            count: String(count),
            needed: String(QUESTIONS_PER_ROUND),
          }),
    );
  });

  test('a subcategory selection plays only questions from that subcategory', async ({
    homePage,
    quizPage,
  }) => {
    await homePage.goto();
    await homePage.expandButton('Music').click();
    await homePage.subcategory('Music', subcategoryName('eurovision', 'en')).click();

    await homePage.startButton.click();

    const meta = await quizPage.questionMeta();
    expect(meta).toMatchObject({ category: 'music', subcategory: 'eurovision' });
  });

  test('keeps Start disabled for a selection smaller than a round', async ({ homePage }) => {
    const thin = thinSubcategory('en');
    test.skip(!thin, 'every subcategory can fill a round');
    const category = topicName(thin!.topicId, 'en');
    await homePage.goto();
    await homePage.search(category);
    await homePage.expandButton(category).click();

    await homePage.subcategory(category, subcategoryName(thin!.subId, 'en')).click();

    await expect(homePage.selectionStatus).toHaveText(
      text('en', 'home.selectionTooSmall_other', {
        count: String(subcategoryCount(thin!.topicId, thin!.subId, 'en')),
        needed: String(QUESTIONS_PER_ROUND),
      }),
    );
    await expect(homePage.startButton).toBeDisabled();
  });
});

test.describe('Themed quizzes', () => {
  test('starts Millionaire Challenge straight away with 15 questions @smoke', async ({
    homePage,
    quizPage,
  }) => {
    await homePage.goto();

    await homePage.startCollection(collectionName('millionaire', 'en'));

    await expect(quizPage.progress).toHaveAttribute('aria-valuemax', '15');
    await expect(quizPage.topicTitle).toHaveText(collectionName('millionaire', 'en'));
  });
});

test.describe('Languages @i18n', () => {
  for (const lang of LANGUAGES) {
    test.describe(`starting in ${lang}`, () => {
      test.use({ uiLang: lang });

      test('renders the UI, categories and themed quizzes in that language', async ({
        homePage,
        page,
      }) => {
        await homePage.goto();

        await expect(page.locator('html')).toHaveAttribute('lang', lang);
        await expect(homePage.heading).toHaveText(text(lang, 'home.title'));
        await expect(homePage.category(topicName('music', lang))).toBeVisible();
        await expect(homePage.collection(collectionName('pub_quiz', lang))).toBeVisible();
      });
    });
  }

  test('switching language updates the UI and category names and survives a reload', async ({
    homePage,
    page,
  }) => {
    await homePage.goto();
    await expect(homePage.category('Music')).toBeVisible();

    await homePage.switchLanguage('pl');

    await expect(homePage.heading).toHaveText(text('pl', 'home.title'));
    await expect(homePage.category('Muzyka')).toBeVisible();
    await expect(homePage.languageButton('pl')).toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    await expect(homePage.heading).toHaveText(text('pl', 'home.title'));
  });

  test('keeps the selection after switching language', async ({ homePage }) => {
    await homePage.goto();
    await homePage.category('History & Events').click();

    await homePage.switchLanguage('uk');

    await expect(homePage.category('Історія та події')).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('Categories without enough questions @i18n', () => {
  test.use({ uiLang: 'uk' });

  test('a category that cannot fill a round alone keeps Start disabled', async ({ homePage }) => {
    // Ukrainian content is limited to records with a reviewed Ukrainian text, so some
    // categories have fewer than 10 questions. Find one from the oracle, not by name.
    const thin = THIN_UK_TOPIC;
    test.skip(!thin, 'every topic has enough Ukrainian questions');
    await homePage.goto();

    await homePage.selectCategory(topicName(thin!, 'uk'));

    await expect(homePage.category(topicName(thin!, 'uk'))).toHaveAttribute('aria-pressed', 'true');
    await expect(homePage.startButton).toBeDisabled();
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
  test('shows an error with a working retry when the catalog fails to load', async ({
    homePage,
    page,
  }) => {
    let failNext = true;
    await page.route('**/api/catalog?*', async (route) => {
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
    await expect(homePage.categoryRows).toHaveCount(COLLAPSED);
  });
});
