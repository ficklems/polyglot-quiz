import { QUESTIONS_PER_ROUND } from '@pq/shared';
import { text } from '../data/i18n';
import {
  narrowUnder,
  questionCount,
  smallSubcategory,
  subcategoryName,
  topicName,
} from '../data/questions';
import { expect, test } from '../fixtures';

test.describe('Round settings', () => {
  test('default to the language region, mixed difficulty and 10 questions @smoke', async ({
    homePage,
  }) => {
    await homePage.goto();
    await expect(homePage.settingsToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(homePage.settingsRegion).toContainText(
      [
        text('en', 'roundSettings.regions.EN'),
        text('en', 'roundSettings.difficulties.mixed'),
        text('en', 'roundSettings.countSummary_other', { count: '10' }),
      ].join(' · '),
    );

    await homePage.openSettings();

    await expect(homePage.regionSelect).toHaveValue('auto');
    await expect(homePage.regionSelect.locator('option:checked')).toHaveText(
      text('en', 'roundSettings.regions.auto', {
        region: text('en', 'roundSettings.regions.EN'),
      }),
    );
    await expect(homePage.settingsRegion).toContainText(
      text('en', 'roundSettings.regionHint.mixed', {
        region: text('en', 'roundSettings.regions.EN'),
      }),
    );
    await expect(homePage.difficultyButton('mixed')).toHaveAttribute('aria-pressed', 'true');
    await expect(homePage.countButton(10)).toHaveAttribute('aria-pressed', 'true');
  });

  test('the region changes the counts shown for a category', async ({ homePage }) => {
    await homePage.goto();
    await homePage.openSettings();
    await expect(homePage.categoryRow('History & Events')).toContainText(
      text('en', 'topics.questions_other', {
        count: String(questionCount('history', 'en', 'auto')),
      }),
    );

    await homePage.regionSelect.selectOption('all');

    await expect(homePage.categoryRow('History & Events')).toContainText(
      text('en', 'topics.questions_other', {
        count: String(questionCount('history', 'en', 'all')),
      }),
    );
  });

  test('a longer round plays that many questions and is not ranked', async ({
    homePage,
    quizPage,
  }) => {
    await homePage.goto();
    await homePage.openSettings();
    await homePage.countButton(20).click();
    await homePage.category('Music').click();

    await expect(homePage.summary).toContainText(text('en', 'home.notStandard'));
    await homePage.startButton.click();

    await expect(quizPage.progress).toHaveAttribute('aria-valuemax', '20');
  });

  test('settings are remembered after a reload', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.openSettings();
    await homePage.regionSelect.selectOption('CE');
    await homePage.difficultyButton('hard').click();
    await homePage.countButton(30).click();

    await page.reload();
    await homePage.openSettings();

    await expect(homePage.regionSelect).toHaveValue('CE');
    await expect(homePage.difficultyButton('hard')).toHaveAttribute('aria-pressed', 'true');
    await expect(homePage.countButton(30)).toHaveAttribute('aria-pressed', 'true');
  });

  test('a pool too small for the region offers all regions instead', async ({ homePage }) => {
    const narrow = narrowUnder('en', 'auto');
    test.skip(!narrow, 'no subcategory is small only because of the region');
    const category = topicName(narrow!.topicId, 'en');
    await homePage.goto();
    await homePage.search(category);
    await homePage.expandButton(category).click();
    await homePage.subcategory(category, subcategoryName(narrow!.subId, 'en')).click();
    await expect(homePage.startButton).toBeDisabled();

    await homePage.widenButton.click();
    await homePage.openSettings();

    await expect(homePage.regionSelect).toHaveValue('all');
    await expect(homePage.startButton).toBeEnabled();
  });
});

test.describe('Recently played questions', () => {
  test('are avoided, and repeats are disclosed when the pool runs out', async ({
    page,
    homePage,
    quizPage,
  }) => {
    const small = smallSubcategory('en');
    // The player has "played" every question of this subcategory.
    await page.addInitScript((ids) => {
      window.localStorage.setItem('pq.recentQuestions', JSON.stringify(ids));
    }, small.ids);
    const category = topicName(small.topicId, 'en');
    await homePage.goto();
    await homePage.search(category);
    await homePage.expandButton(category).click();
    await homePage.subcategory(category, subcategoryName(small.subId, 'en')).click();

    await homePage.startButton.click();

    await expect(quizPage.repeatedNote(QUESTIONS_PER_ROUND)).toBeVisible();
  });
});

test.describe('Round settings in Ukrainian @i18n', () => {
  test.use({ uiLang: 'uk' });

  test('"by language" means Ukraine', async ({ homePage }) => {
    await homePage.goto();
    await homePage.openSettings();

    await expect(homePage.regionSelect.locator('option:checked')).toHaveText(
      text('uk', 'roundSettings.regions.auto', {
        region: text('uk', 'roundSettings.regions.UA'),
      }),
    );
  });
});
