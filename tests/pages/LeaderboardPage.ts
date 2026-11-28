import type { Locator, Page } from '@playwright/test';
import type { Language } from '@pq/shared';
import { text } from '../data/i18n';

/**
 * Leaderboard table (on the result screen and on its own screen) plus the save form.
 * Assertions stay in the specs.
 */
export class LeaderboardPage {
  constructor(
    private readonly page: Page,
    private readonly lang: Language,
  ) {}

  // ---------- leaderboard screen ----------

  get openButton(): Locator {
    return this.page.getByRole('button', {
      name: text(this.lang, 'leaderboard.open'),
      exact: true,
    });
  }

  get heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: text(this.lang, 'leaderboard.title') });
  }

  get backButton(): Locator {
    return this.page.getByRole('button', { name: text(this.lang, 'leaderboard.back') });
  }

  /** Picks the board: all, a category or a themed quiz (one select with option groups). */
  get boardSelect(): Locator {
    return this.page.getByRole('combobox', { name: text(this.lang, 'leaderboard.topicsLabel') });
  }

  async chooseBoard(name: string): Promise<void> {
    await this.boardSelect.selectOption({ label: name });
  }

  /** "Play: <board>" on a topic or themed-quiz board. */
  playButton(boardName: string): Locator {
    return this.page.getByRole('button', {
      name: text(this.lang, 'leaderboard.playBoard', { name: boardName }),
    });
  }

  /** On "All boards": back home to pick a quiz. */
  get chooseAndPlayButton(): Locator {
    return this.page.getByRole('button', { name: text(this.lang, 'leaderboard.playChoose') });
  }

  get emptyState(): Locator {
    return this.page.getByText(text(this.lang, 'leaderboard.empty'));
  }

  get loadError(): Locator {
    return this.page.getByRole('alert').filter({ hasText: text(this.lang, 'leaderboard.error') });
  }

  // ---------- table ----------

  get table(): Locator {
    return this.page.getByRole('table');
  }

  /** Body rows only (the header row has column headers, not cells). */
  get rows(): Locator {
    return this.table.getByRole('row').filter({ has: this.page.getByRole('cell') });
  }

  /** The player's own row (marked with aria-current). */
  get ownRow(): Locator {
    return this.table.locator('tr[aria-current="true"]');
  }

  row(nickname: string): Locator {
    return this.rows.filter({ has: this.page.getByText(nickname, { exact: true }) });
  }

  // ---------- save form (result screen) ----------

  get nicknameInput(): Locator {
    return this.page.getByLabel(text(this.lang, 'save.label'));
  }

  get saveButton(): Locator {
    return this.page.getByRole('button', { name: text(this.lang, 'save.submit'), exact: true });
  }

  get savedStatus(): Locator {
    return this.page
      .getByRole('status')
      .filter({ hasText: text(this.lang, 'save.saved', { rank: '' }) });
  }

  validationError(reason: 'tooShort' | 'tooLong' | 'invalid'): Locator {
    return this.page
      .getByRole('alert')
      .filter({ hasText: text(this.lang, `save.errors.${reason}`) });
  }

  async saveAs(nickname: string): Promise<void> {
    await this.nicknameInput.fill(nickname);
    await this.saveButton.click();
  }
}
