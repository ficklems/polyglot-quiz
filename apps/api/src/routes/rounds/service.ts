import { randomUUID } from 'node:crypto';
import {
  OPTION_IDS,
  POINTS_PER_CORRECT,
  QUESTIONS_PER_ROUND,
  TIME_LIMIT_SECONDS,
  type AnswerRequest,
  type AnswerResult,
  type CreateRoundRequest,
  type Language,
  type OptionId,
  type Round,
  type RoundQuestion,
  type RoundSummary,
} from '@pq/shared';
import type { Database } from '../../db/database';
import { badRequest, conflict, notFound, unprocessable } from '../../lib/http-errors';
import { createRng, shuffle } from '../../lib/random';
import { topicExists } from '../topics/service';

/**
 * Extra time on top of the limit before the server treats an answer as late,
 * to absorb network delay between the browser's timer and the server.
 */
export const TIME_GRACE_SECONDS = 2;

type RoundRow = {
  id: string;
  topic_id: string;
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
  correct_option: OptionId;
};

export type Clock = () => number;

export function createRound(
  db: Database,
  request: CreateRoundRequest & { seed: number },
  now: Clock,
): Round {
  const { topicId, lang, seed } = request;
  if (!topicExists(db, topicId)) {
    throw notFound(`Topic "${topicId}" does not exist`);
  }

  const ids = (
    db.prepare('SELECT id FROM questions WHERE topic_id = ? ORDER BY id').all(topicId) as {
      id: string;
    }[]
  ).map((row) => row.id);

  if (ids.length < QUESTIONS_PER_ROUND) {
    throw unprocessable(
      `Topic "${topicId}" has ${ids.length} questions, a round needs ${QUESTIONS_PER_ROUND}`,
    );
  }

  const rng = createRng(seed);
  const picked = shuffle(ids, rng).slice(0, QUESTIONS_PER_ROUND);
  const orders = picked.map(() => shuffle(OPTION_IDS, rng));

  const roundId = randomUUID();
  const startedAt = now();
  const insertRoundQuestion = db.prepare(
    `INSERT INTO round_questions (round_id, position, question_id, option_order)
     VALUES (?, ?, ?, ?)`,
  );

  db.exec('BEGIN');
  try {
    db.prepare(
      `INSERT INTO rounds (id, topic_id, lang, created_at, current_started_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(roundId, topicId, lang, startedAt, startedAt);
    picked.forEach((questionId, position) => {
      insertRoundQuestion.run(roundId, position, questionId, JSON.stringify(orders[position]));
    });
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return {
    roundId,
    topicId,
    lang,
    timeLimitSeconds: TIME_LIMIT_SECONDS,
    questions: picked.map((id, i) => loadQuestion(db, id, lang, orders[i] ?? [...OPTION_IDS])),
  };
}

/** Builds the player-facing question. The correct option is deliberately not selected. */
function loadQuestion(
  db: Database,
  questionId: string,
  lang: Language,
  order: readonly OptionId[],
): RoundQuestion {
  const { text } = db
    .prepare('SELECT text FROM question_texts WHERE question_id = ? AND lang = ?')
    .get(questionId, lang) as { text: string };

  const optionRows = db
    .prepare('SELECT option_id, text FROM question_options WHERE question_id = ? AND lang = ?')
    .all(questionId, lang) as { option_id: OptionId; text: string }[];
  const textById = new Map(optionRows.map((row) => [row.option_id, row.text]));

  return {
    id: questionId,
    text,
    options: order.map((id) => ({ id, text: textById.get(id) ?? '' })),
  };
}

function getRoundRow(db: Database, roundId: string): RoundRow {
  const round = db
    .prepare(
      'SELECT id, topic_id, lang, score, current_started_at, finished_at FROM rounds WHERE id = ?',
    )
    .get(roundId) as RoundRow | undefined;
  if (!round) throw notFound(`Round "${roundId}" does not exist`);
  return round;
}

function getRoundQuestions(db: Database, roundId: string): RoundQuestionRow[] {
  return db
    .prepare(
      `SELECT rq.position, rq.question_id, rq.answered_option, rq.is_correct, q.correct_option
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
  const correct = !timedOut && answer.optionId === target.correct_option;
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
    correctOptionId: target.correct_option,
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
    lang: round.lang,
    score: round.score,
    correctCount: answered.filter((q) => q.is_correct === 1).length,
    answeredCount: answered.length,
    totalQuestions: questions.length,
    finished: round.finished_at !== null,
  };
}
