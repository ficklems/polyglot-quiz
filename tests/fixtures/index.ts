import { test as base, expect } from '@playwright/test';
import type { Language } from '@pq/shared';
import { HomePage } from '../pages/HomePage';
import { QuizPage } from '../pages/QuizPage';
import { ResultPage } from '../pages/ResultPage';

type Options = {
  /** UI language the test starts in. Override per file with test.use({ uiLang: 'pl' }). */
  uiLang: Language;
  /** Theme the test starts in, so screenshots and checks don't depend on the OS setting. */
  uiTheme: 'light' | 'dark';
};

type Fixtures = {
  homePage: HomePage;
  quizPage: QuizPage;
  resultPage: ResultPage;
};

export const test = base.extend<Options & Fixtures>({
  uiLang: ['en', { option: true }],
  uiTheme: ['light', { option: true }],

  // Seed the app's saved preferences before any page script runs. Only when nothing is
  // saved yet, so a choice made during the test survives page.reload().
  page: async ({ page, uiLang, uiTheme }, use) => {
    await page.addInitScript(
      ([lang, theme]) => {
        if (window.localStorage.getItem('pq.lang') === null) {
          window.localStorage.setItem('pq.lang', lang);
        }
        if (window.localStorage.getItem('pq.theme') === null) {
          window.localStorage.setItem('pq.theme', theme);
        }
      },
      [uiLang, uiTheme] as const,
    );
    await use(page);
  },

  homePage: async ({ page, uiLang }, use) => {
    await use(new HomePage(page, uiLang));
  },

  quizPage: async ({ page, uiLang }, use) => {
    await use(new QuizPage(page, uiLang));
  },

  resultPage: async ({ page, uiLang }, use) => {
    await use(new ResultPage(page, uiLang));
  },
});

export { expect };
