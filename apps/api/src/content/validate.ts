import { LANGUAGES, type QuestionRecord } from '@pq/shared';

const OPTION_TYPES = new Set([
  'multiple_choice',
  'true_false',
  'guess_year',
  'emoji',
  'higher_lower',
  'guess_location',
  'order',
]);

/**
 * Checks the schema can't express: the answer key points at options that exist, every
 * language has the same option ids, and the shape matches the question type.
 */
export function structuralProblems(record: QuestionRecord, categoryIds: Set<string>): string[] {
  const problems: string[] = [];
  if (!categoryIds.has(record.category)) problems.push(`unknown category "${record.category}"`);

  const en = record.localizations.en;
  const answer = record.answer;

  if (OPTION_TYPES.has(record.type)) {
    const ids = (en.options ?? []).map((o) => o.id);
    if (ids.length < 2) problems.push('needs at least 2 options');
    if (new Set(ids).size !== ids.length) problems.push('duplicate option ids');
    for (const lang of LANGUAGES) {
      const langIds = (record.localizations[lang].options ?? []).map((o) => o.id);
      if (langIds.join() !== ids.join()) problems.push(`option ids differ in ${lang}`);
    }
    if (record.type === 'order') {
      if (!('orderedOptionIds' in answer)) problems.push('order question without orderedOptionIds');
      else if ([...answer.orderedOptionIds].sort().join() !== [...ids].sort().join()) {
        problems.push('orderedOptionIds do not match the options');
      }
    } else if (!('correctOptionId' in answer)) {
      problems.push('missing correctOptionId');
    } else if (!ids.includes(answer.correctOptionId)) {
      problems.push(`correct option ${answer.correctOptionId} is not among the options`);
    }
    if (record.type === 'true_false' && ids.length !== 2)
      problems.push('true/false needs 2 options');
  }

  if (record.type === 'matching') {
    if (!('pairs' in answer)) problems.push('matching question without pairs');
    else {
      const left = new Set((en.leftItems ?? []).map((i) => i.id));
      const right = new Set((en.rightItems ?? []).map((i) => i.id));
      for (const pair of answer.pairs) {
        if (!left.has(pair.leftId) || !right.has(pair.rightId))
          problems.push('pair refers to a missing item');
      }
    }
  }

  return problems;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * Same type, same English prompt, same set of options (or matching items) and the same
 * correct answer = exact duplicate. The options must be part of the key: formats like
 * "order" or "higher_lower" share one generic prompt ("Which came first?") across hundreds
 * of different questions, which made a prompt+answer key report 285 false duplicates.
 */
export function exactDuplicateKey(record: QuestionRecord): string {
  const en = record.localizations.en;
  const texts = [...(en.options ?? []), ...(en.leftItems ?? []), ...(en.rightItems ?? [])]
    .map((o) => normalize(o.text))
    .sort()
    .join('~');
  const answer = record.answer;
  const correct =
    'correctOptionId' in answer
      ? normalize(en.options?.find((o) => o.id === answer.correctOptionId)?.text ?? '')
      : JSON.stringify(answer);
  return `${record.type}|${normalize(en.prompt)}|${texts}|${correct}`;
}
