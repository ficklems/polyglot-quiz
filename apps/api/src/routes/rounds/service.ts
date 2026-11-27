import { randomUUID } from 'node:crypto';
import {
  DEFAULT_DIFFICULTY,
  DEFAULT_QUESTION_COUNT,
  POINTS_PER_CORRECT,
  resolveRegion,
  TIME_LIMIT_SECONDS,
  type AnswerRequest,
  type AnswerResult,
  type CreateRoundRequest,
  type AnswerKey,
  type Language,
  type Localization,
  type OptionId,
  type Round,
  type RoundQuestion,
  type RoundSummary,
  type Selection,
} from '@pq/shared';
import type { QuestionPool } from '../../content/question-pool';
import {
  collectionPlan,
  collectionSettings,
  effectiveRegion,
  matchesCollection,
  matchesSelection,
  matchesSettings,
  pickQuestions,
  settingsShares,
  sortByDifficulty,
  type PickPlan,
  type QuestionMeta,
  type SettingsFilter,
} from '../../content/selection';
import type { Database } from '../../db/database';
import { badRequest, conflict, notFound, unprocessable } from '../../lib/http-errors';
import { createRng, shuffle, type Rng } from '../../lib/random';
import { topicExists } from '../topics/service';

/**
 * Extra time on top of the limit before the server treats an answer as late,
 * to absorb network delay between the browser's timer and the server.
 */
export const TIME_GRACE_SECONDS = 2;

type RoundRow = {
  id: string;
  topic_id: string | null;
  collection_id: string | null;
  ranked: number;
  lang: Language;
  score: number;
  current_started_at: number | null;
  finished_at: number | null;
};

type RoundQuestionRow = {
  position: number;
  question_id: string;
  answered_option: string | null;
  is_correct: number | null;
  option_order: string;
  payload: string;
};

type Payload = {
  localizations: Record<Language, Localization>;
  answer: AnswerKey;
};

function correctOptionOf(payload: Payload): OptionId {
  if (!('correctOptionId' in payload.answer)) {
    throw new Error('Question has no single correct option');
  }
  return payload.answer.correctOptionId;
}

export type Clock = () => number;

type RoundSource = {
  topicId: string | null;
  collectionId: string | null;
  selection: Selection | null;
  ranked: boolean;
  questions: QuestionMeta[];
  repeatedCount: number;
};

type Source = {
  topicId: string | null;
  collectionId: string | null;
  selection: Selection | null;
  /** Topic and themed quiz; a custom mix never is. */
  rankable: boolean;
  candidates: QuestionMeta[];
  plan: PickPlan;
  /** Minimum pool size to start (a themed quiz may require more than its round length). */
  needed: number;
  what: string;
  filter: SettingsFilter;
  /** The quiz fixes the round length (Millionaire Challenge). */
  fixedLength: boolean;
};

/**
 * Turns the request into a pool and a plan. A selection of exactly one whole category is
 * the same round as that topic; any other selection is a custom mix, which isn't ranked
 * (players could otherwise cherry-pick easy corners).
 */
function resolveSource(db: Database, pool: QuestionPool, request: CreateRoundRequest): Source {
  const { lang, region, difficulty, questionCount } = request;
  const all = pool.questions(lang);
  if (request.selection) assertSelectionExists(db, request.selection);
  const topicId =
    request.topicId ??
    (request.selection &&
    request.selection.categories.length === 1 &&
    request.selection.subcategories.length === 0
      ? request.selection.categories[0]
      : undefined);
  const standard: SettingsFilter = { region: resolveRegion(region, lang), difficulty };
  const basePlan = (filter: SettingsFilter): PickPlan => ({
    count: questionCount,
    balanceBy: 'category',
    ...settingsShares(filter),
  });

  if (topicId !== undefined) {
    if (!topicExists(db, topicId)) throw notFound(`Topic "${topicId}" does not exist`);
    return {
      topicId,
      collectionId: null,
      selection: null,
      rankable: true,
      candidates: all.filter((q) => q.category === topicId),
      plan: basePlan(standard),
      needed: questionCount,
      what: `Topic "${topicId}"`,
      filter: standard,
      fixedLength: false,
    };
  }

  if (request.collectionId !== undefined) {
    const collection = pool.collection(request.collectionId);
    if (!collection) throw notFound(`Themed quiz "${request.collectionId}" does not exist`);
    const own = collectionSettings(collection);
    const filter: SettingsFilter = {
      region: effectiveRegion(region, lang, own.strictRegion),
      difficulty,
      ...own,
    };
    const plan = { ...collectionPlan(collection, questionCount), ...settingsShares(filter) };
    return {
      topicId: null,
      collectionId: collection.id,
      selection: null,
      rankable: true,
      candidates: all.filter((q) => matchesCollection(q, collection)),
      plan,
      needed: Math.max(plan.count, collection.minimumUniqueQuestions),
      what: `Themed quiz "${collection.id}"`,
      filter,
      fixedLength: collection.settings.questionCount !== undefined,
    };
  }

  const selection = request.selection!;
  return {
    topicId: null,
    collectionId: null,
    selection,
    rankable: false,
    candidates: all.filter((q) => matchesSelection(q, selection)),
    plan: basePlan(standard),
    needed: questionCount,
    what: 'This selection',
    filter: standard,
    fixedLength: false,
  };
}

function chooseQuestions(
  db: Database,
  pool: QuestionPool,
  request: CreateRoundRequest,
  rng: Rng,
): RoundSource {
  const source = resolveSource(db, pool, request);
  const eligible = source.candidates.filter((q) => matchesSettings(q, source.filter));
  requireEnough(eligible.length, source.needed, source.what, request);

  // Prefer questions the player hasn't seen recently; repeat only when the pool runs out,
  // and say how many were repeated.
  const avoid = new Set(request.avoidIds);
  const fresh = eligible.filter((q) => !avoid.has(q.id));
  let questions = pickQuestions(fresh, source.plan, rng);
  let repeatedCount = 0;
  if (questions.length < source.plan.count) {
    const seen = eligible.filter((q) => avoid.has(q.id));
    const extra = pickQuestions(
      seen,
      { ...source.plan, count: source.plan.count - questions.length },
      rng,
    );
    repeatedCount = extra.length;
    questions = [...questions, ...extra];
    if (source.plan.difficultySequence) questions = sortByDifficulty(questions);
  }

  // Easier or longer rounds aren't comparable on a board. Settings a quiz overrides
  // (Millionaire's own length and difficulty) don't count against it.
  const standardSettings =
    (source.filter.ownDifficulty === true || request.difficulty === DEFAULT_DIFFICULTY) &&
    (source.fixedLength || request.questionCount === DEFAULT_QUESTION_COUNT);

  return {
    topicId: source.topicId,
    collectionId: source.collectionId,
    selection: source.selection,
    ranked: source.rankable && standardSettings,
    questions,
    repeatedCount,
  };
}

function requireEnough(
  available: number,
  needed: number,
  what: string,
  { lang, region, difficulty }: CreateRoundRequest,
): void {
  if (available < needed) {
    throw unprocessable(
      `${what} has ${available} questions in "${lang}" (region ${region}, difficulty ${difficulty}), a round needs ${needed}`,
    );
  }
}

function assertSelectionExists(db: Database, selection: Selection): void {
  const declared = new Map(
    (
      db.prepare('SELECT id, subcategories FROM categories').all() as {
        id: string;
        subcategories: string;
      }[]
    ).map((row) => [row.id, new Set(JSON.parse(row.subcategories) as string[])]),
  );
  for (const id of selection.categories) {
    if (!declared.has(id)) throw badRequest(`Category "${id}" does not exist`);
  }
  for (const ref of selection.subcategories) {
    const [category, sub] = ref.split('/') as [string, string];
    const known =
      declared.get(category)?.has(sub) === true ||
      db
        .prepare('SELECT 1 FROM questions WHERE category_id = ? AND subcategory = ? LIMIT 1')
        .get(category, sub) !== undefined;
    if (!known) throw badRequest(`Subcategory "${ref}" does not exist`);
  }
}

export function createRound(
  db: Database,
  pool: QuestionPool,
  request: CreateRoundRequest & { seed: number },
  now: Clock,
): Round {
  const { lang, seed } = request;
  const rng = createRng(seed);
  const source = chooseQuestions(db, pool, request, rng);

  const payloadOf = db.prepare('SELECT payload FROM questions WHERE id = ?');
  const picked = source.questions.map((q) => ({
    id: q.id,
    type: q.type,
    payload: JSON.parse((payloadOf.get(q.id) as { payload: string }).payload) as Payload,
  }));
  const orders = picked.map((q) => optionOrder(q.type, q.payload, rng));

  const roundId = randomUUID();
  const startedAt = now();
  const insertRoundQuestion = db.prepare(
    `INSERT INTO round_questions (round_id, position, question_id, option_order)
     VALUES (?, ?, ?, ?)`,
  );

  db.exec('BEGIN');
  try {
    db.prepare(
      `INSERT INTO rounds (id, topic_id, collection_id, selection, ranked, lang, created_at,
         current_started_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      roundId,
      source.topicId,
      source.collectionId,
      source.selection ? JSON.stringify(source.selection) : null,
      source.ranked ? 1 : 0,
      lang,
      startedAt,
      startedAt,
    );
    picked.forEach((q, position) => {
      insertRoundQuestion.run(roundId, position, q.id, JSON.stringify(orders[position]));
    });
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return {
    roundId,
    topicId: source.topicId,
    collectionId: source.collectionId,
    ranked: source.ranked,
    lang,
    repeatedCount: source.repeatedCount,
    timeLimitSeconds: TIME_LIMIT_SECONDS,
    questions: picked.map((q, i) => playerQuestion(q.id, q.payload, lang, orders[i] ?? [])),
  };
}

/**
 * The order the options are shown in. Shuffled, because in the content the correct answer
 * is usually option o1. True/false keeps a fixed True-then-False order, which is easier to
 * read and gives nothing away since both options are always shown.
 */
function optionOrder(type: string, payload: Payload, rng: () => number): OptionId[] {
  const options = payload.localizations.en.options ?? [];
  if (type === 'true_false') {
    return [...options]
      .sort((a, b) => (a.text === 'True' ? -1 : b.text === 'True' ? 1 : 0))
      .map((o) => o.id);
  }
  return shuffle(
    options.map((o) => o.id),
    rng,
  );
}

/** Builds the player-facing question. The answer key is deliberately left out. */
function playerQuestion(
  questionId: string,
  payload: Payload,
  lang: Language,
  order: readonly OptionId[],
): RoundQuestion {
  const localization = payload.localizations[lang];
  const textById = new Map((localization.options ?? []).map((o) => [o.id, o.text]));
  return {
    id: questionId,
    text: localization.prompt,
    options: order.map((id) => ({ id, text: textById.get(id) ?? '' })),
  };
}

function getRoundRow(db: Database, roundId: string): RoundRow {
  const round = db
    .prepare(
      `SELECT id, topic_id, collection_id, ranked, lang, score, current_started_at, finished_at
         FROM rounds WHERE id = ?`,
    )
    .get(roundId) as RoundRow | undefined;
  if (!round) throw notFound(`Round "${roundId}" does not exist`);
  return round;
}

function getRoundQuestions(db: Database, roundId: string): RoundQuestionRow[] {
  return db
    .prepare(
      `SELECT rq.position, rq.question_id, rq.answered_option, rq.is_correct, rq.option_order, q.payload
         FROM round_questions rq
         JOIN questions q ON q.id = rq.question_id
        WHERE rq.round_id = ?
        ORDER BY rq.position`,
    )
    .all(roundId) as RoundQuestionRow[];
}

export function answerQuestion(
  db: Database,
  roundId: string,
  answer: AnswerRequest,
  now: Clock,
): AnswerResult {
  const round = getRoundRow(db, roundId);
  if (round.finished_at !== null) {
    throw conflict('Round is already finished');
  }

  const questions = getRoundQuestions(db, roundId);
  const target = questions.find((q) => q.question_id === answer.questionId);
  if (!target) {
    throw badRequest(`Question "${answer.questionId}" is not part of this round`);
  }
  if (target.is_correct !== null) {
    throw conflict(`Question "${answer.questionId}" is already answered`);
  }

  const shown = JSON.parse(target.option_order) as string[];
  if (answer.optionId !== null && !shown.includes(answer.optionId)) {
    throw badRequest(`Option "${answer.optionId}" is not an option of this question`);
  }

  const current = questions.find((q) => q.is_correct === null);
  if (current && current.question_id !== target.question_id) {
    throw conflict('Questions must be answered in order');
  }

  if (round.current_started_at === null) {
    throw conflict('Start the next question before answering it');
  }

  const answeredAt = now();
  const elapsedSeconds = (answeredAt - round.current_started_at) / 1000;
  const timedOut =
    answer.optionId === null || elapsedSeconds > TIME_LIMIT_SECONDS + TIME_GRACE_SECONDS;
  const correctOptionId = correctOptionOf(JSON.parse(target.payload) as Payload);
  const correct = !timedOut && answer.optionId === correctOptionId;
  const pointsAwarded = correct ? POINTS_PER_CORRECT : 0;
  const answeredCount = questions.filter((q) => q.is_correct !== null).length + 1;
  const finished = answeredCount === questions.length;
  const score = round.score + pointsAwarded;

  db.exec('BEGIN');
  try {
    db.prepare(
      `UPDATE round_questions
          SET answered_option = ?, timed_out = ?, is_correct = ?, answered_at = ?
        WHERE round_id = ? AND position = ?`,
    ).run(answer.optionId, timedOut ? 1 : 0, correct ? 1 : 0, answeredAt, roundId, target.position);
    db.prepare(
      `UPDATE rounds SET score = ?, current_started_at = ?, finished_at = ? WHERE id = ?`,
    ).run(score, null, finished ? answeredAt : null, roundId);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return {
    questionId: target.question_id,
    correct,
    timedOut,
    correctOptionId,
    pointsAwarded,
    score,
    answeredCount,
    totalQuestions: questions.length,
    finished,
  };
}

/**
 * Starts the timer for the next question. The client calls it when it shows that question,
 * so time spent reading the previous answer's feedback doesn't count. Allowed once per
 * question, so it can't be used to reset a running timer.
 */
export function startNextQuestion(db: Database, roundId: string, now: Clock): void {
  const round = getRoundRow(db, roundId);
  if (round.finished_at !== null) {
    throw conflict('Round is already finished');
  }
  if (round.current_started_at !== null) {
    throw conflict('The current question is already running');
  }
  db.prepare('UPDATE rounds SET current_started_at = ? WHERE id = ?').run(now(), roundId);
}

export function getRoundSummary(db: Database, roundId: string): RoundSummary {
  const round = getRoundRow(db, roundId);
  const questions = getRoundQuestions(db, roundId);
  const answered = questions.filter((q) => q.is_correct !== null);

  return {
    roundId: round.id,
    topicId: round.topic_id,
    collectionId: round.collection_id,
    ranked: round.ranked === 1,
    lang: round.lang,
    score: round.score,
    correctCount: answered.filter((q) => q.is_correct === 1).length,
    answeredCount: answered.length,
    totalQuestions: questions.length,
    finished: round.finished_at !== null,
  };
}
