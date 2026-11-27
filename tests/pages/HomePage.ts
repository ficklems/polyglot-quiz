import type { Locator, Page } from '@playwright/test';
import type { Language } from '@pq/shared';
import { text } from '../data/i18n';

/**
 * Locators and actions for the home screen, in the language the UI is shown in.
 * Assertions stay in the specs.
 */
export class HomePage {
  constructor(
    private readonly page: Page,
    private lang: Language,
  ) {}

  get heading(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  get languageGroup(): Locator {
    return this.page.getByRole('group', { name: text(this.lang, 'settings.language') });
  }

  get themeToggle(): Locator {
    return this.page.getByRole('button', { name: text(this.lang, 'settings.darkTheme') });
  }

  get topicCards(): Locator {
    return this.page.getByRole('list').getByRole('button');
  }

  get startButton(): Locator {
    return this.page.getByRole('button', { name: text(this.lang, 'home.start'), exact: true });
  }

  get loadingStatus(): Locator {
    return this.page.getByRole('status').filter({ hasText: text(this.lang, 'topics.loading') });
  }

  get loadError(): Locator {
    return this.page.getByRole('alert');
  }

  get retryButton(): Locator {
    return this.loadError.getByRole('button', { name: text(this.lang, 'topics.retry') });
  }

  get comingSoonStatus(): Locator {
    return this.page
      .getByRole('status')
      .filter({ hasText: text(this.lang, 'home.comingSoon', { topic: '' }) });
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  /** Language buttons are labelled with the language's name in the current UI language. */
  languageButton(target: Language): Locator {
    return this.languageGroup.getByRole('button', { name: text(this.lang, `languages.${target}`) });
  }

  async switchLanguage(target: Language): Promise<void> {
    await this.languageButton(target).click();
    this.lang = target;
  }

  topicCard(name: string): Locator {
    return this.topicCards.filter({ hasText: name });
  }

  async selectTopic(name: string): Promise<void> {
    await this.topicCard(name).click();
  }
}
