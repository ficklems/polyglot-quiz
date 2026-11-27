import type { Locator, Page } from '@playwright/test';
import type { Language } from '@pq/shared';
import { correctAnswerText, wrongAnswerText } from '../data/questions';
import { text } from '../data/i18n';

/** Locators and actions for the question screen. Assertions stay in the specs. */
export class QuizPage {
  constructor(
    private readonly page: Page,
    private readonly lang: Language,
  ) {}

  get question(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  get answers(): Locator {
    return this.page
      .getByRole('group', { name: text(this.lang, 'quiz.answersLabel') })
      .getByRole('button');
  }

  get timer(): Locator {
    return this.page.getByRole('timer');
  }

  get progress(): Locator {
    return this.page.getByRole('progressbar', { name: text(this.lang, 'quiz.progressLabel') });
  }

  get feedback(): Locator {
    return this.page.getByRole('status');
  }

  get nextButton(): Locator {
    return this.page.getByRole('button', { name: text(this.lang, 'quiz.next'), exact: true });
  }

  get finishButton(): Locator {
    return this.page.getByRole('button', { name: text(this.lang, 'quiz.finish'), exact: true });
  }

  get quitButton(): Locator {
    return this.page.getByRole('button', { name: text(this.lang, 'quiz.quit') });
  }

  /** The running score as shown above the question, e.g. "Score: 200". */
  score(points: number): Locator {
    return this.page.getByText(text(this.lang, 'quiz.score', { score: String(points) }), {
      exact: true,
    });
  }

  /**
   * Matches the answer text exactly. A plain hasText filter is a case-insensitive substring
   * match over the whole button, letter badge included: badge "A" + "Go" reads "AGo" and
   * matched the answer "Ag" (found by running the suite with --repeat-each).
   */
  answer(answerText: string): Locator {
    return this.answers.filter({ has: this.page.getByText(answerText, { exact: true }) });
  }

  /**
   * Reads the current question once it can be answered. textContent() doesn't auto-wait,
   * so without this it could read the home heading or the previous question mid-transition.
   */
  async questionText(): Promise<string> {
    await this.answers.and(this.page.locator(':enabled')).first().waitFor();
    return (await this.question.textContent()) ?? '';
  }

  async pick(answerText: string): Promise<void> {
    await this.answer(answerText).click();
  }

  /** Texts of the options as shown, without the letter badge. */
  async optionTexts(): Promise<string[]> {
    return this.answers.locator('.answer-text').allTextContents();
  }

  /** Answers the question on screen correctly; returns the answer it picked. */
  async answerCorrectly(): Promise<string> {
    const answerText = await this.correctAnswer();
    await this.pick(answerText);
    return answerText;
  }

  /** Answers the question on screen with a wrong option; returns the answer it picked. */
  async answerWrongly(): Promise<string> {
    const answerText = wrongAnswerText(
      await this.questionText(),
      await this.optionTexts(),
      this.lang,
    );
    await this.pick(answerText);
    return answerText;
  }

  /** The correct answer to the question on screen, from the test oracle. */
  async correctAnswer(): Promise<string> {
    return correctAnswerText(await this.questionText(), await this.optionTexts(), this.lang);
  }

  /** Plays all remaining questions, every answer right or every answer wrong. */
  async playToTheEnd(answers: 'correct' | 'wrong', questions: number): Promise<void> {
    for (let i = 0; i < questions; i++) {
      if (answers === 'correct') await this.answerCorrectly();
      else await this.answerWrongly();
      await this.continue();
    }
  }

  /** Moves on after feedback: "Next", or "See result" after the last question. */
  async continue(): Promise<void> {
    await this.nextButton.or(this.finishButton).click();
  }
}
