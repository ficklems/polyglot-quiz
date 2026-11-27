import type { Locator, Page } from '@playwright/test';
import type { Language } from '@pq/shared';
import { text } from '../data/i18n';

/** Locators and actions for the round result screen. Assertions stay in the specs. */
export class ResultPage {
  constructor(
    private readonly page: Page,
    private readonly lang: Language,
  ) {}

  get heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: text(this.lang, 'result.title') });
  }

  get summary(): Locator {
    return this.page.getByRole('main');
  }

  get playAgainButton(): Locator {
    return this.page.getByRole('button', { name: text(this.lang, 'result.playAgain') });
  }

  get homeButton(): Locator {
    return this.page.getByRole('button', { name: text(this.lang, 'result.home') });
  }
}
