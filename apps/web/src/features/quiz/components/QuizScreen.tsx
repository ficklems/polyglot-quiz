import type { AnswerResult, OptionId, Round } from '@pq/shared';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { startNextQuestion, submitAnswer } from '../api/rounds-api';
import { optionState, optionText } from '../quiz.utils';
import { AnswerOption } from './AnswerOption';
import { QuestionTimer } from './QuestionTimer';

type Props = {
  round: Round;
  topicName: string;
  onFinish: (result: { score: number; correctCount: number; total: number }) => void;
  onQuit: () => void;
};

type Phase = 'answering' | 'submitting' | 'feedback' | 'error';

const LETTERS = ['A', 'B', 'C', 'D'];

export function QuizScreen({ round, topicName, onFinish, onQuit }: Props) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('answering');
  const [picked, setPicked] = useState<OptionId | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const question = round.questions[index];
  const total = round.questions.length;
  const isLast = index === total - 1;

  const send = useCallback(
    async (optionId: OptionId | null) => {
      if (!question || phase !== 'answering') return;
      setPicked(optionId);
      setPhase('submitting');
      try {
        const res = await submitAnswer(round.roundId, question.id, optionId);
        setResult(res);
        setScore(res.score);
        if (res.correct) setCorrectCount((n) => n + 1);
        setPhase('feedback');
      } catch (error) {
        console.error(error);
        setPhase('error');
      }
    },
    [question, phase, round.roundId],
  );

  const onTimeUp = useCallback(() => void send(null), [send]);

  const goNext = async () => {
    if (isLast) {
      onFinish({ score, correctCount, total });
      return;
    }
    try {
      await startNextQuestion(round.roundId);
    } catch (error) {
      console.error(error);
      setPhase('error');
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
    setResult(null);
    setPhase('answering');
  };

  if (!question) return null;

  const correctText = result ? optionText(question, result.correctOptionId) : '';
  const feedback = !result
    ? null
    : result.correct
      ? t('quiz.feedbackCorrect', { points: result.pointsAwarded })
      : result.timedOut
        ? t('quiz.feedbackTimeout', { answer: correctText })
        : t('quiz.feedbackWrong', { answer: correctText });

  return (
    <div className="quiz">
      <div className="quiz-top">
        <button type="button" className="icon-button" aria-label={t('quiz.quit')} onClick={onQuit}>
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="quiz-topic">{topicName}</span>
      </div>

      <div className="quiz-status">
        <div className="progress-card">
          <div className="progress-labels">
            <span>{t('quiz.progress', { current: index + 1, total })}</span>
            <span className="progress-score">{t('quiz.score', { score })}</span>
          </div>
          <div
            className="progress-steps"
            role="progressbar"
            aria-label={t('quiz.progressLabel')}
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={index + 1}
          >
            {round.questions.map((q, i) => (
              <span
                key={q.id}
                className={`progress-step${i <= index ? ' progress-step--done' : ''}`}
              />
            ))}
          </div>
        </div>
        <QuestionTimer
          key={question.id}
          running={phase === 'answering'}
          limitSeconds={round.timeLimitSeconds}
          onExpire={onTimeUp}
        />
      </div>

      <section className="question-card" aria-live="polite">
        <h1 className="question-text">{question.text}</h1>
      </section>

      <div className="answers" role="group" aria-label={t('quiz.answersLabel')}>
        {question.options.map((option, i) => (
          <AnswerOption
            key={option.id}
            letter={LETTERS[i] ?? ''}
            optionId={option.id}
            text={option.text}
            state={optionState(option.id, picked, result)}
            disabled={phase !== 'answering'}
            onPick={(id) => void send(id)}
          />
        ))}
      </div>

      <div className="quiz-bottom">
        {feedback && (
          <p
            className={`feedback ${result?.correct ? 'feedback--ok' : 'feedback--bad'}`}
            role="status"
          >
            {feedback}
          </p>
        )}
        {phase === 'error' && (
          <p className="status status--error" role="alert">
            {t('quiz.answerError')}
          </p>
        )}
        {phase === 'feedback' && (
          <button type="button" className="primary-button" onClick={() => void goNext()} autoFocus>
            {isLast ? t('quiz.finish') : t('quiz.next')}
          </button>
        )}
      </div>
    </div>
  );
}
