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

  // ---------- categories ----------

  get categoriesRegion(): Locator {
    return this.page.getByRole('region', { name: text(this.lang, 'categories.heading') });
  }

  get searchBox(): Locator {
    return this.categoriesRegion.getByRole('searchbox', {
      name: text(this.lang, 'categories.searchLabel'),
    });
  }

  /** One list item per category shown (subcategory chips are in a group, not list items). */
  get categoryRows(): Locator {
    return this.categoriesRegion.getByRole('list').getByRole('listitem');
  }

  showAllButton(total: number): Locator {
    return this.categoriesRegion.getByRole('button', {
      name: text(this.lang, 'categories.showAll', { count: String(total) }),
    });
  }

  get showFewerButton(): Locator {
    return this.categoriesRegion.getByRole('button', {
      name: text(this.lang, 'categories.showFewer'),
    });
  }

  noResults(query: string): Locator {
    return this.categoriesRegion.getByText(text(this.lang, 'categories.noResults', { query }));
  }

  categoryRow(name: string): Locator {
    return this.categoryRows.filter({
      has: this.page.getByRole('button', { name, exact: true }),
    });
  }

  /** The toggle that selects the whole category. It comes before any subcategory chip. */
  category(name: string): Locator {
    return this.categoryRow(name).getByRole('button', { name, exact: true }).first();
  }

  expandButton(categoryName: string): Locator {
    return this.categoryRow(categoryName).getByRole('button', {
      name: text(this.lang, 'categories.subcategoriesOf', { name: categoryName }),
    });
  }

  subcategory(categoryName: string, subName: string): Locator {
    return this.categoryRow(categoryName)
      .getByRole('group', {
        name: text(this.lang, 'categories.subcategoriesOf', { name: categoryName }),
      })
      .getByRole('button', { name: subName, exact: true });
  }

  // ---------- selection summary ----------

  get summary(): Locator {
    return this.page.getByRole('region', { name: text(this.lang, 'home.summaryLabel') });
  }

  get selectionStatus(): Locator {
    return this.summary.getByRole('status');
  }

  get startButton(): Locator {
    return this.summary.getByRole('button', { name: text(this.lang, 'home.start'), exact: true });
  }

  // ---------- themed quizzes ----------

  get collectionsRegion(): Locator {
    return this.page.getByRole('region', { name: text(this.lang, 'collections.heading') });
  }

  get collectionButtons(): Locator {
    return this.collectionsRegion.getByRole('button');
  }

  collection(name: string): Locator {
    return this.collectionsRegion.getByRole('button', { name, exact: true });
  }

  get loadError(): Locator {
    return this.page.getByRole('alert');
  }

  get retryButton(): Locator {
    return this.loadError.getByRole('button', { name: text(this.lang, 'topics.retry') });
  }

  get startError(): Locator {
    return this.page.getByRole('alert').filter({ hasText: text(this.lang, 'home.startError') });
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

  async search(query: string): Promise<void> {
    await this.searchBox.fill(query);
  }

  /** Finds a category through the search (the list is collapsed) and toggles it. */
  async selectCategory(name: string): Promise<void> {
    await this.search(name);
    await this.category(name).click();
  }

  /** Selects one whole category and starts its (ranked) round. */
  async startRound(categoryName: string): Promise<void> {
    await this.selectCategory(categoryName);
    await this.startButton.click();
  }

  async startCollection(name: string): Promise<void> {
    await this.collection(name).click();
  }
}
