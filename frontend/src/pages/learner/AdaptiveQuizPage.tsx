import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, CircleAlert, Lightbulb, RotateCcw } from 'lucide-react';
import { useI18n } from '@/i18n';
import { learnerVisibility, shouldShowLearnerElement } from '@/features/learnerVisibility';
import styles from './AdaptiveQuizPage.module.css';

type QuestionType = 'mcq' | 'fill';

type Question = {
  id: string;
  type: QuestionType;
  text: string;
  options?: Array<{ id: string; text: string }>;
  correct: string;
  hint: string;
  explanation: string;
};

type SubmissionResult = {
  correct: boolean;
  attemptNumber: number;
};

const MAX_ATTEMPTS = 2;

export default function AdaptiveQuizPage() {
  const navigate = useNavigate();
  const { t, isRtl } = useI18n();

  const questions = useMemo<Question[]>(
    () => [
      {
        id: 'q1',
        type: 'mcq',
        text: t(
          'learner.adaptiveQuiz.questions.q1.text',
          'What is the main purpose of a Work Breakdown Structure in an instructional design project?',
        ),
        options: [
          {
            id: 'A',
            text: t(
              'learner.adaptiveQuiz.questions.q1.options.a',
              'To set exact dates for every task in the project schedule.',
            ),
          },
          {
            id: 'B',
            text: t(
              'learner.adaptiveQuiz.questions.q1.options.b',
              'To break the project work into smaller, manageable parts.',
            ),
          },
          {
            id: 'C',
            text: t(
              'learner.adaptiveQuiz.questions.q1.options.c',
              'To decide the final budget for the project team.',
            ),
          },
          {
            id: 'D',
            text: t(
              'learner.adaptiveQuiz.questions.q1.options.d',
              'To assign every task to a different stakeholder group.',
            ),
          },
        ],
        correct: 'B',
        hint: t(
          'learner.adaptiveQuiz.questions.q1.hint',
          'Think about how a large project becomes easier to plan when it is divided into smaller pieces.',
        ),
        explanation: t(
          'learner.adaptiveQuiz.questions.q1.explanation',
          'A Work Breakdown Structure helps you organise the project by dividing deliverables into smaller tasks that are easier to plan and manage.',
        ),
      },
      {
        id: 'q2',
        type: 'fill',
        text: t(
          'learner.adaptiveQuiz.questions.q2.text',
          'Stakeholder influence is often reviewed using a power and ______ grid.',
        ),
        correct: 'interest',
        hint: t(
          'learner.adaptiveQuiz.questions.q2.hint',
          'The missing word describes how much attention or concern a stakeholder has about the project.',
        ),
        explanation: t(
          'learner.adaptiveQuiz.questions.q2.explanation',
          'A power-interest grid helps you decide how closely each stakeholder should be engaged during the project.',
        ),
      },
    ],
    [t],
  );

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState<Record<string, SubmissionResult | undefined>>({});
  const [showHint, setShowHint] = useState(false);
  const [completed, setCompleted] = useState(false);

  const question = questions[currentIdx];
  const answer = answers[question.id] ?? '';
  const result = submitted[question.id] ?? null;
  const attemptCount = attempts[question.id] ?? 0;
  const attemptsRemaining = Math.max(MAX_ATTEMPTS - attemptCount, 0);
  const progressPct = Math.round(((currentIdx + (completed ? 1 : 0)) / questions.length) * 100);
  const answeredCorrectly = Object.values(submitted).filter((item) => item?.correct).length;
  const isAnswerReady = answer.trim().length > 0;
  const reviewSupportRequired = Boolean(result && !result.correct && attemptCount >= MAX_ATTEMPTS);
  const showAdaptiveSupport = shouldShowLearnerElement(learnerVisibility.adaptiveQuiz.adaptiveAlertSurface, {
    isNeeded: showHint || reviewSupportRequired || Boolean(result && !result.correct),
  });

  useEffect(() => {
    setShowHint(false);
  }, [currentIdx]);

  function updateAnswer(value: string) {
    setAnswers((current) => ({ ...current, [question.id]: value }));
  }

  function normalize(value: string) {
    return value.trim().toLowerCase();
  }

  function submitAnswer() {
    if (!isAnswerReady) return;

    const nextAttempt = attemptCount + 1;
    const isCorrect = normalize(answer) === normalize(question.correct);

    setAttempts((current) => ({ ...current, [question.id]: nextAttempt }));
    setSubmitted((current) => ({
      ...current,
      [question.id]: {
        correct: isCorrect,
        attemptNumber: nextAttempt,
      },
    }));

    if (!isCorrect && nextAttempt >= MAX_ATTEMPTS) {
      setShowHint(true);
    }
  }

  function retryQuestion() {
    setSubmitted((current) => ({ ...current, [question.id]: undefined }));
    setShowHint(true);
  }

  function moveNext() {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((value) => value + 1);
      return;
    }

    setCompleted(true);
  }

  function selectedOptionState(optionId: string) {
    if (!result) {
      return answer === optionId ? styles.optionSelected : '';
    }

    if (optionId === question.correct) return styles.optionCorrect;
    if (answer === optionId && !result.correct) return styles.optionWrong;
    return answer === optionId ? styles.optionSelected : '';
  }

  const currentQuestionStatus = result
    ? result.correct
      ? t('learner.adaptiveQuiz.feedback.correctTitle', 'Correct answer')
      : t('learner.adaptiveQuiz.feedback.incorrectTitle', 'Not quite yet')
    : t('learner.adaptiveQuiz.checkpointLabel', 'Quick checkpoint');

  const adaptiveSupportText = reviewSupportRequired
    ? t(
        'learner.adaptiveQuiz.feedback.supportRequired',
        'Review the short support note, then continue when you are ready.',
      )
    : result?.correct
      ? t('learner.adaptiveQuiz.feedback.correctNext', 'You can continue to the next checkpoint now.')
      : t(
          'learner.adaptiveQuiz.feedback.retryNext',
          'Review the feedback below, then try this checkpoint one more time.',
        );

  if (completed) {
    return (
      <div className={styles.page}>
        <div className={styles.completionCard}>
          <div className={styles.completionIcon}>
            <CheckCircle2 size={42} />
          </div>
          <span className={styles.completionEyebrow}>
            {t('learner.adaptiveQuiz.completed.eyebrow', 'Checkpoint complete')}
          </span>
          <h1>{t('learner.adaptiveQuiz.completed.title', 'You finished the practice checkpoint')}</h1>
          <p className={styles.completionLead}>
            {t(
              'learner.adaptiveQuiz.completed.body',
              'Your answers have been saved. You can now return to the learning path or review the checkpoint again later.',
            )}
          </p>
          <div className={styles.completionScore}>
            <strong>{answeredCorrectly}</strong>
            <span>
              {t('learner.adaptiveQuiz.completed.score', '{score} out of {total} answered correctly', {
                score: answeredCorrectly,
                total: questions.length,
              })}
            </span>
          </div>
          <button className="btn btn-primary" type="button" onClick={() => navigate('/dashboard')}>
            {t('learner.adaptiveQuiz.completed.action', 'Return to dashboard')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageIntro}>
          <span className={styles.eyebrow}>{t('learner.adaptiveQuiz.checkpointLabel', 'Quick checkpoint')}</span>
          <h1>{t('learner.adaptiveQuiz.title', 'Practice checkpoint')}</h1>
          <p>{t('learner.adaptiveQuiz.subtitle', 'Review one question at a time and use support only when you need it.')}</p>
        </div>
        <div className={styles.progressPanel}>
          <span className={styles.progressValue}>{progressPct}%</span>
          <span className={styles.progressText}>
            {t('learner.adaptiveQuiz.progress', 'Question {current} of {total}', {
              current: currentIdx + 1,
              total: questions.length,
            })}
          </span>
        </div>
      </header>

      <section className={styles.questionCard}>
        {shouldShowLearnerElement(learnerVisibility.adaptiveQuiz.checkpointIntro) ? (
          <div className={styles.questionMeta}>
            <span className={styles.checkpointBadge}>{currentQuestionStatus}</span>
            {shouldShowLearnerElement(learnerVisibility.adaptiveQuiz.attemptsMeta, { isNeeded: attemptCount > 0 }) ? (
              <span className={styles.attemptText}>
                {t('learner.adaptiveQuiz.attempts', '{used} attempt(s) used · {remaining} left', {
                  used: attemptCount,
                  remaining: attemptsRemaining,
                })}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className={styles.questionText}>{question.text}</div>

        {question.type === 'mcq' && (
          <div className={styles.options}>
            {question.options?.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`${styles.option} ${selectedOptionState(option.id)}`}
                onClick={() => !result && updateAnswer(option.id)}
                disabled={Boolean(result)}
              >
                <span className={styles.optionLetter}>{option.id}</span>
                <span className={styles.optionText}>{option.text}</span>
                {result && option.id === question.correct ? (
                  <span className={styles.optionState}>{t('learner.adaptiveQuiz.correctAnswer', 'Correct answer')}</span>
                ) : null}
                {result && !result.correct && answer === option.id ? (
                  <span className={styles.optionState}>{t('learner.adaptiveQuiz.yourAnswer', 'Your answer')}</span>
                ) : null}
              </button>
            ))}
          </div>
        )}

        {question.type === 'fill' && (
          <div className={styles.fillArea}>
            <input
              className={styles.fillInput}
              value={answer}
              onChange={(event) => updateAnswer(event.target.value)}
              placeholder={t('learner.adaptiveQuiz.placeholder', 'Type your answer here')}
              disabled={Boolean(result)}
            />
          </div>
        )}

        {!result ? (
          <div className={styles.helperRow}>
            <button
              type="button"
              className={styles.helpButton}
              onClick={() => setShowHint((value) => !value)}
            >
              <Lightbulb size={14} />
              {showHint
                ? t('learner.adaptiveQuiz.hideHint', 'Hide hint')
                : t('learner.adaptiveQuiz.showHint', 'Show a quick hint')}
            </button>
          </div>
        ) : null}

        {showAdaptiveSupport ? (
          <div className={styles.inlineNotice}>
            <div className={styles.inlineNoticeIcon}>
              <Lightbulb size={16} />
            </div>
            <div className={styles.inlineNoticeBody}>
              <strong>
                {result?.correct
                  ? t('learner.adaptiveQuiz.inlineSupport.nextTitle', 'You can continue now')
                  : reviewSupportRequired
                  ? t('learner.adaptiveQuiz.inlineSupport.title', 'A short support note is open')
                  : t('learner.adaptiveQuiz.inlineHint.title', 'Quick hint')}
              </strong>
              <p>{showHint || reviewSupportRequired ? question.hint : adaptiveSupportText}</p>
            </div>
          </div>
        ) : null}

        {shouldShowLearnerElement(learnerVisibility.adaptiveQuiz.resultFeedback, { afterSubmission: Boolean(result) }) && result ? (
          <div className={`${styles.feedbackCard} ${result.correct ? styles.feedbackCorrect : styles.feedbackWrong}`}>
            <div className={styles.feedbackHeader}>
              {result.correct ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}
              <strong>
                {result.correct
                  ? t('learner.adaptiveQuiz.feedback.correctTitle', 'Correct answer')
                  : t('learner.adaptiveQuiz.feedback.incorrectTitle', 'Not quite yet')}
              </strong>
            </div>
            {!result.correct ? (
              <p className={styles.feedbackLine}>
                <span>{t('learner.adaptiveQuiz.correctAnswer', 'Correct answer')}:</span>{' '}
                <strong>{question.type === 'mcq' ? question.options?.find((option) => option.id === question.correct)?.text : question.correct}</strong>
              </p>
            ) : null}
            <p className={styles.feedbackExplanation}>{question.explanation}</p>
          </div>
        ) : null}
      </section>

      <footer className={styles.actions}>
        {!result ? (
          <button className="btn btn-primary" type="button" onClick={submitAnswer} disabled={!isAnswerReady}>
            {t('learner.adaptiveQuiz.submit', 'Submit answer')}
          </button>
        ) : result.correct ? (
          <button className="btn btn-primary" type="button" onClick={moveNext}>
            {currentIdx === questions.length - 1
              ? t('learner.adaptiveQuiz.finish', 'Finish checkpoint')
              : t('learner.adaptiveQuiz.continue', 'Continue')}
            <ChevronRight size={16} className={isRtl ? styles.rtlIcon : ''} />
          </button>
        ) : reviewSupportRequired ? (
          <button className="btn btn-primary" type="button" onClick={moveNext}>
            {t('learner.adaptiveQuiz.continueAfterReview', 'Continue after review')}
            <ChevronRight size={16} className={isRtl ? styles.rtlIcon : ''} />
          </button>
        ) : (
          <button className="btn btn-primary" type="button" onClick={retryQuestion}>
            <RotateCcw size={16} />
            {t('learner.adaptiveQuiz.retry', 'Try again')}
          </button>
        )}
      </footer>
    </div>
  );
}
