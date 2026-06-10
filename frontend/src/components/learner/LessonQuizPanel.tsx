import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, RefreshCcw, ShieldAlert, Sparkles, XCircle } from 'lucide-react';
import { useI18n } from '@/i18n';
import { ApiError, quizApi } from '@/services/api';
import type { LessonQuiz } from '@/components/admin/LessonQuizBuilder';
import type { LearnerStepRuntimeState } from './lessonFlow';
import styles from './LessonQuizPanel.module.css';

type Props = {
  quiz: LessonQuiz;
  sessionId: string;
  onComplete?: (itemId: string) => void;
  onStateChange?: (state: LearnerStepRuntimeState) => void;
  adaptiveSupportAvailable?: boolean;
  onOpenSupport?: () => void;
};

type AttemptState = {
  attempt: {
    id: string;
    scorePct?: number | null;
    scoreEarned?: number | null;
    totalPossible?: number | null;
    passed?: boolean | null;
    answers: Array<{
      questionId: string;
      isCorrect?: boolean | null;
      selectedChoiceId?: string | null;
      question: {
        id: string;
        explanation?: string | null;
        hint?: string | null;
        choices: Array<{
          id: string;
          choiceText: string;
          isCorrect: boolean;
        }>;
      };
    }>;
  };
  totalAttempts: number;
};

function formatScore(value?: number | null) {
  return `${Math.round(value ?? 0)}%`;
}

function splitFeedbackText(text?: string | null) {
  const normalized = text?.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return { brief: null, details: null };
  }

  const match = normalized.match(/^.*?[.!?؟](?:\s|$)/);
  if (!match) {
    return { brief: normalized, details: null };
  }

  const brief = match[0].trim();
  const details = normalized.slice(match[0].length).trim();

  return {
    brief,
    details: details || null,
  };
}

function getChoiceMarker(index: number) {
  return String.fromCharCode(65 + index);
}

export default function LessonQuizPanel({
  quiz,
  sessionId,
  onComplete,
  onStateChange,
  adaptiveSupportAvailable = false,
  onOpenSupport,
}: Props) {
  const { t } = useI18n();
  const questionStageRef = useRef<HTMLDivElement | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [retryMode, setRetryMode] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitErrorCode, setSubmitErrorCode] = useState<string | null>(null);
  const [submittedAttemptState, setSubmittedAttemptState] = useState<AttemptState | null>(null);

  const latestAttemptQuery = useQuery({
    queryKey: ['quiz-attempt', quiz.id, sessionId],
    queryFn: () => quizApi.getLatestAttempt(quiz.id, sessionId),
  });

  const queriedAttemptState = (latestAttemptQuery.data?.data as AttemptState | null | undefined) ?? null;
  const latestAttemptState = submittedAttemptState ?? queriedAttemptState;
  const latestAttempt = latestAttemptState?.attempt ?? null;
  const totalAttempts = latestAttemptState?.totalAttempts ?? 0;

  const submitMutation = useMutation({
    mutationFn: () =>
      quizApi.submitQuiz(quiz.id, {
        sessionId,
        answers: Object.entries(answers).map(([questionId, choiceId]) => ({ questionId, choiceId })),
      }),
    onSuccess: async (response) => {
      const responseData = ((response?.data as {
        attempt?: AttemptState['attempt'];
        totalAttempts?: number;
      } | null | undefined) ?? null);

      if (responseData?.attempt) {
        setSubmittedAttemptState({
          attempt: responseData.attempt,
          totalAttempts: responseData.totalAttempts ?? totalAttempts,
        });
      }
      setSubmitError(null);
      setSubmitErrorCode(null);
      setRetryMode(false);
      void latestAttemptQuery.refetch();
    },
    onError: async (error: unknown) => {
      if (error instanceof ApiError) {
        if (error.code === 'ATTEMPT_LIMIT_REACHED') {
          setSubmitError(
            t(
              'learner.lessonQuiz.submitErrors.attemptLimit',
              'You have reached the maximum attempts for this checkpoint. Review the result, then continue.',
            ),
          );
          setSubmitErrorCode(error.code);
          setRetryMode(false);
          setAnswers({});
          setCurrentQuestionIndex(0);
          const refreshed = await latestAttemptQuery.refetch();
          const refreshedState = (refreshed.data?.data as AttemptState | null | undefined) ?? null;
          setSubmittedAttemptState(refreshedState);
          return;
        }

        setSubmitError(error.message);
        setSubmitErrorCode(error.code ?? null);
        return;
      }
      setSubmitError(t('learner.lessonQuiz.submitError', 'Unable to submit this quiz right now.'));
      setSubmitErrorCode(null);
    },
  });

  const reviewAnswers = useMemo(() => {
    if (!latestAttempt) return new Map<string, AttemptState['attempt']['answers'][number]>();
    return new Map(latestAttempt.answers.map((answer) => [answer.questionId, answer]));
  }, [latestAttempt]);

  const questionCount = quiz.questions.length;
  const currentQuestion = quiz.questions[currentQuestionIndex] ?? null;
  const answeredCount = Object.keys(answers).length;
  const canSubmit = quiz.questions.length > 0 && quiz.questions.every((question) => Boolean(answers[question.id]));
  const canRetry = quiz.allowRetry && totalAttempts < quiz.attemptLimit;
  const attemptsRemaining = Math.max(quiz.attemptLimit - totalAttempts, 0);
  const latestAttemptFailed = Boolean(latestAttempt && latestAttempt.passed === false);
  const attemptLimitReached = Boolean(
    submitErrorCode === 'ATTEMPT_LIMIT_REACHED' ||
      (latestAttemptFailed && totalAttempts >= quiz.attemptLimit),
  );
  const showReview = Boolean(latestAttempt) && !retryMode;
  const supportMode: 'none' | 'recommended' | 'required' =
    attemptLimitReached && adaptiveSupportAvailable
      ? 'required'
      : latestAttemptFailed && adaptiveSupportAvailable
        ? 'recommended'
        : 'none';
  const currentAnswerId = currentQuestion ? answers[currentQuestion.id] ?? null : null;
  const currentSelectedChoice = currentQuestion?.choices.find((choice) => choice.id === currentAnswerId) ?? null;
  const currentCorrectChoice = currentQuestion?.choices.find((choice) => choice.isCorrect) ?? null;
  const currentAnswerResolved = Boolean(currentAnswerId);
  const currentAnswerCorrect = Boolean(currentSelectedChoice?.isCorrect);
  const isLastQuestion = currentQuestionIndex >= questionCount - 1;
  const canGoPreviousQuestion = currentQuestionIndex > 0;
  const canGoNextQuestion = currentAnswerResolved && !isLastQuestion;
  const progressPct = questionCount ? ((currentQuestionIndex + 1) / questionCount) * 100 : 0;
  const completionPct = questionCount ? (answeredCount / questionCount) * 100 : 0;
  const currentExplanation = splitFeedbackText(currentQuestion?.explanation);
  const currentFeedbackBrief =
    currentExplanation.brief ??
    (currentAnswerCorrect
      ? t('learner.lessonQuiz.feedback.correctBriefFallback', 'This choice matches the main idea of this step.')
      : t('learner.lessonQuiz.feedback.incorrectBriefFallback', 'This choice does not match the main idea of this step.'));

  useEffect(() => {
    if (!retryMode) return;
    if (!latestAttemptFailed || totalAttempts < quiz.attemptLimit) return;

    setRetryMode(false);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setSubmitErrorCode(null);
  }, [latestAttemptFailed, quiz.attemptLimit, retryMode, totalAttempts]);

  useEffect(() => {
    if (!onStateChange) return;

    if (showReview && latestAttempt) {
      if (latestAttempt.passed) {
        onStateChange({
          presentation: 'checkpoint',
          status: 'passed',
          statusLabel: t('learner.lessonQuiz.flow.status.passed', 'Checkpoint passed'),
          canContinue: true,
          blockingReason: null,
          nextActionLabel: t('learner.lessonQuiz.flow.next.continue', 'Continue to next step'),
          nextActionHint: t(
            'learner.lessonQuiz.flow.hint.passed',
            'You passed this checkpoint. Review the feedback if needed, then continue.',
          ),
          nextActionKind: 'continue',
          supportVisibility: 'none',
          isCorrect: true,
          attemptsUsed: totalAttempts,
          attemptsRemaining,
        });
        return;
      }

      if (attemptLimitReached) {
        onStateChange({
          presentation: 'checkpoint',
          status: adaptiveSupportAvailable ? 'support_required' : 'attempt_limit',
          statusLabel: adaptiveSupportAvailable
            ? t('learner.lessonQuiz.flow.status.supportRequired', 'Support required before continuing')
            : t('learner.lessonQuiz.flow.status.attemptLimit', 'Attempt limit reached'),
          canContinue: true,
          blockingReason: adaptiveSupportAvailable
            ? t(
                'learner.lessonQuiz.flow.blocking.supportRequired',
                'Complete the required support step before you continue beyond this checkpoint.',
              )
            : t(
                'learner.lessonQuiz.flow.blocking.attemptLimit',
                'You have reached the maximum attempts. Review the feedback, then continue.',
              ),
          nextActionLabel: adaptiveSupportAvailable
            ? t('learner.lessonQuiz.flow.next.reviewSupport', 'Review support step')
            : t('learner.lessonQuiz.flow.next.continue', 'Continue to next step'),
          nextActionHint: adaptiveSupportAvailable
            ? t(
                'learner.lessonQuiz.flow.hint.supportRequired',
                'A short support step is ready before you continue.',
              )
            : t(
                'learner.lessonQuiz.flow.hint.attemptLimit',
                'The correct answer and explanation are shown below so you can continue with the right concept in mind.',
              ),
          nextActionKind: adaptiveSupportAvailable ? 'open_support' : 'continue',
          supportVisibility: supportMode,
          isCorrect: false,
          attemptsUsed: totalAttempts,
          attemptsRemaining,
        });
        return;
      }

      onStateChange({
        presentation: 'checkpoint',
        status: 'feedback',
        statusLabel: t('learner.lessonQuiz.flow.status.reviewReady', 'Checkpoint reviewed'),
        canContinue: true,
        blockingReason: null,
        nextActionLabel: t('learner.lessonQuiz.flow.next.continue', 'Continue to next step'),
        nextActionHint: adaptiveSupportAvailable
          ? t(
              'learner.lessonQuiz.flow.hint.reviewWithSupport',
              'Review the feedback below. You can continue now, retry this checkpoint, or open the suggested support first.',
            )
          : t(
              'learner.lessonQuiz.flow.hint.reviewOptionalRetry',
              'Review the feedback below. You can continue now or retry this checkpoint for a better result.',
            ),
        nextActionKind: 'continue',
        supportVisibility: supportMode,
        isCorrect: false,
        attemptsUsed: totalAttempts,
        attemptsRemaining,
      });
      return;
    }

    if (!currentQuestion) {
      onStateChange({
        presentation: 'checkpoint',
        status: 'blocked',
        statusLabel: t('learner.lessonQuiz.flow.status.awaitingSubmission', 'Checkpoint answer required'),
        canContinue: false,
        blockingReason: t('common.errors.unavailable', 'Data is currently unavailable.'),
        nextActionLabel: t('learner.lessonQuiz.flow.next.submit', 'Submit checkpoint'),
        nextActionHint: t('learner.lessonQuiz.helper.submitFirst', 'Answer every question, submit the checkpoint, then review the result before the lesson continues.'),
        nextActionKind: 'submit_answer',
        supportVisibility: 'none',
        attemptsUsed: totalAttempts,
        attemptsRemaining,
      });
      return;
    }

    if (submitMutation.isPending) {
      onStateChange({
        presentation: 'checkpoint',
        status: 'ready',
        statusLabel: t('learner.lessonQuiz.flow.status.submitting', 'Submitting checkpoint'),
        canContinue: false,
        blockingReason: t('learner.lessonQuiz.flow.blocking.submitting', 'Wait while your checkpoint is being submitted.'),
        nextActionLabel: t('learner.lessonQuiz.submitting', 'Submitting...'),
        nextActionHint: t('learner.lessonQuiz.flow.hint.submitting', 'Your answers are being saved and scored now.'),
        nextActionKind: 'submit_answer',
        supportVisibility: 'none',
        attemptsUsed: totalAttempts,
        attemptsRemaining,
      });
      return;
    }

    if (currentAnswerResolved && canSubmit) {
      onStateChange({
        presentation: 'checkpoint',
        status: 'ready',
        statusLabel: t('learner.lessonQuiz.flow.status.readyToFinish', 'Ready to finish checkpoint'),
        canContinue: false,
        blockingReason: t(
          'learner.lessonQuiz.flow.blocking.finishRequired',
          'Finish this checkpoint to save the result and open the next lesson step.',
        ),
        nextActionLabel: t('learner.lessonQuiz.flow.next.finish', 'Finish checkpoint'),
        nextActionHint: t(
          'learner.lessonQuiz.flow.hint.finish',
          'Review the feedback on this question, then finish the checkpoint below.',
        ),
        nextActionKind: 'submit_answer',
        supportVisibility: 'none',
        attemptsUsed: totalAttempts,
        attemptsRemaining,
      });
      return;
    }

    if (currentAnswerResolved) {
      onStateChange({
        presentation: 'checkpoint',
        status: 'ready',
        statusLabel: t('learner.lessonQuiz.flow.status.questionReady', 'Question complete'),
        canContinue: false,
        blockingReason: t(
          'learner.lessonQuiz.flow.blocking.nextQuestionRequired',
          'Move to the next question inside this checkpoint before the lesson can continue.',
        ),
        nextActionLabel: t('learner.lessonQuiz.flow.next.nextQuestion', 'Next question'),
        nextActionHint: t(
          'learner.lessonQuiz.flow.hint.nextQuestion',
          'Review the feedback below, then continue to the next question.',
        ),
        nextActionKind: 'submit_answer',
        supportVisibility: 'none',
        attemptsUsed: totalAttempts,
        attemptsRemaining,
      });
      return;
    }

    onStateChange({
      presentation: 'checkpoint',
      status: 'blocked',
      statusLabel: t('learner.lessonQuiz.flow.status.awaitingSubmission', 'Checkpoint answer required'),
      canContinue: false,
      blockingReason: canSubmit
        ? t('learner.lessonQuiz.flow.blocking.submitRequired', 'Submit your checkpoint answers before you continue.')
        : t('learner.lessonQuiz.flow.blocking.answerRequired', 'Answer every checkpoint question before you continue.'),
      nextActionLabel: t('learner.lessonQuiz.flow.next.submit', 'Submit checkpoint'),
      nextActionHint: t(
        'learner.lessonQuiz.flow.hint.answerRequired',
        'This checkpoint controls progression. Answer each question, submit, then review the result.',
      ),
      nextActionKind: 'submit_answer',
      supportVisibility: 'none',
      attemptsUsed: totalAttempts,
      attemptsRemaining,
    });
  }, [
    adaptiveSupportAvailable,
    attemptLimitReached,
    attemptsRemaining,
    canRetry,
    canSubmit,
    latestAttempt,
    latestAttemptFailed,
    currentAnswerResolved,
    currentQuestion,
    onStateChange,
    submitMutation.isPending,
    supportMode,
    t,
    totalAttempts,
    showReview,
  ]);

  useEffect(() => {
    if (showReview && latestAttempt) {
      onComplete?.(quiz.id);
    }
  }, [latestAttempt, onComplete, quiz.id, showReview]);

  useEffect(() => {
    setCurrentQuestionIndex(0);
  }, [quiz.id, retryMode]);

  useEffect(() => {
    setSubmittedAttemptState(null);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setRetryMode(false);
    setSubmitError(null);
    setSubmitErrorCode(null);
  }, [quiz.id, sessionId]);

  useEffect(() => {
    if (showReview) return;
    questionStageRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [currentQuestionIndex, showReview]);

  function selectAnswer(questionId: string, choiceId: string) {
    if (showReview || submitMutation.isPending || answers[questionId]) return;
    setAnswers((current) => ({ ...current, [questionId]: choiceId }));
  }

  function startRetry() {
    setSubmittedAttemptState(null);
    setRetryMode(true);
    setSubmitError(null);
    setSubmitErrorCode(null);
    setAnswers({});
    setCurrentQuestionIndex(0);
  }

  function goToPreviousQuestion() {
    setCurrentQuestionIndex((index) => Math.max(index - 1, 0));
  }

  function goToNextQuestion() {
    setCurrentQuestionIndex((index) => Math.min(index + 1, Math.max(questionCount - 1, 0)));
  }

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>{t('learner.lessonQuiz.title', 'Checkpoint Quiz')}</div>
          <h2>{quiz.title}</h2>
          <p dir="auto">
            {quiz.description || t('learner.lessonQuiz.fallbackDescription', 'Use this checkpoint to confirm understanding before moving to the next lesson step.')}
          </p>
        </div>
        <div className={styles.headerMeta}>
          <span className="badge badge-soft-blue">{t('learner.lessonQuiz.questions', '{count} questions', { count: quiz.questions.length })}</span>
          <span className="badge badge-soft-teal">{t('learner.lessonQuiz.passAt', 'Pass {score}%', { score: quiz.passingScore })}</span>
        </div>
      </div>

      {latestAttemptQuery.isLoading ? <div className={styles.emptyState}>{t('learner.lessonQuiz.loadingHistory', 'Loading quiz attempt history...')}</div> : null}

      {showReview && latestAttempt ? (
        <div className={styles.summaryCard}>
          <div className={styles.summaryTop}>
            <div>
              <span className={`badge ${latestAttempt.passed ? 'badge-success' : 'badge-amber'}`}>
                {latestAttempt.passed ? <BadgeCheck size={12} /> : <ShieldAlert size={12} />}
                {latestAttempt.passed ? t('learner.lessonQuiz.passed', 'Passed') : t('learner.lessonQuiz.retryNeeded', 'Needs another try')}
              </span>
              <h3>{formatScore(latestAttempt.scorePct)}</h3>
              <p dir="auto">
                {t('learner.lessonQuiz.latestScore', 'You earned {earned} out of {total} points in the latest attempt.', {
                  earned: latestAttempt.scoreEarned ?? 0,
                  total: latestAttempt.totalPossible ?? 0,
                })}
              </p>
            </div>

            <div className={styles.summaryActions}>
              {canRetry ? (
                <button className="btn btn-secondary btn-sm" type="button" onClick={startRetry}>
                  <RefreshCcw size={14} />
                  {t('learner.lessonQuiz.retry', 'Retry Quiz')}
                </button>
              ) : null}
              {adaptiveSupportAvailable && !latestAttempt.passed ? (
                <button className="btn btn-ghost btn-sm" type="button" onClick={onOpenSupport}>
                  <Sparkles size={14} />
                  {attemptLimitReached
                    ? t('learner.lessonQuiz.next.reviewRequiredSupport', 'Review required support')
                    : t('learner.lessonQuiz.next.reviewRecommendedSupport', 'Review recommended support')}
                </button>
              ) : null}
            </div>
          </div>

          <div className={`${styles.resultBanner} ${latestAttempt.passed ? styles.resultSuccess : styles.resultWarning}`}>
            {latestAttempt.passed ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
            <div>
              <strong>
                {latestAttempt.passed
                  ? t('learner.lessonQuiz.result.passedTitle', 'You passed this checkpoint.')
                  : attemptLimitReached
                    ? t('learner.lessonQuiz.result.attemptLimitTitle', 'You reached the attempt limit for this checkpoint.')
                    : t('learner.lessonQuiz.result.retryTitle', 'This checkpoint needs another attempt.')}
              </strong>
              <p>
                {latestAttempt.passed
                  ? t('learner.lessonQuiz.result.passedBody', 'Review the explanation if needed, then continue to the next lesson step.')
                  : attemptLimitReached
                    ? adaptiveSupportAvailable
                      ? t(
                          'learner.lessonQuiz.result.attemptLimitSupportBody',
                          'The correct answers are shown below. Review the required support step before continuing.',
                        )
                      : t(
                          'learner.lessonQuiz.result.attemptLimitBody',
                          'The correct answers and explanations are shown below so you can continue with the right concept in mind.',
                        )
                    : adaptiveSupportAvailable
                      ? t(
                          'learner.lessonQuiz.result.retrySupportBody',
                          'Review the feedback below. A support step is available before you retry.',
                        )
                      : t(
                          'learner.lessonQuiz.result.retryBody',
                          'Review the feedback below, then retry this checkpoint to continue.',
                        )}
              </p>
            </div>
          </div>

          <div className={styles.reviewList}>
            {quiz.questions.map((question) => {
              const answer = reviewAnswers.get(question.id);
              const selectedChoiceId = answer?.selectedChoiceId ?? null;
              const selectedChoice = question.choices.find((choice) => choice.id === selectedChoiceId) ?? null;
              const correctChoice = question.choices.find((choice) => choice.isCorrect) ?? null;

              return (
                <article key={question.id} className={styles.reviewCard}>
                  <div className={styles.reviewHeader}>
                    <strong dir="auto">{question.questionText}</strong>
                    <span className={`badge ${answer?.isCorrect ? 'badge-success' : 'badge-soft-red'}`}>
                      {answer?.isCorrect ? t('learner.lessonQuiz.correct', 'Correct') : t('learner.lessonQuiz.incorrect', 'Incorrect')}
                    </span>
                  </div>

                  <div className={styles.answerRows}>
                    {selectedChoice ? (
                      <div className={styles.answerRow}>
                        <span className={styles.answerLabel}>
                          {t('learner.lessonQuiz.feedback.selectedAnswerLabel', 'Your answer')}
                        </span>
                        <strong dir="auto">{selectedChoice.choiceText}</strong>
                      </div>
                    ) : null}

                    {!answer?.isCorrect && correctChoice ? (
                      <div className={styles.answerRow}>
                        <span className={styles.answerLabel}>
                          {t('learner.lessonQuiz.feedback.correctAnswerLabel', 'Correct answer')}
                        </span>
                        <strong dir="auto">{correctChoice.choiceText}</strong>
                      </div>
                    ) : null}
                  </div>

                  {(() => {
                    const explanation = splitFeedbackText(question.explanation);
                    const brief =
                      explanation.brief ??
                      (answer?.isCorrect
                        ? t('learner.lessonQuiz.feedback.correctBriefFallback', 'This choice matches the main idea of this step.')
                        : t('learner.lessonQuiz.feedback.incorrectBriefFallback', 'This choice does not match the main idea of this step.'));

                    return (
                      <>
                        <div className={`${styles.feedbackPanel} ${answer?.isCorrect ? styles.feedbackGood : styles.feedbackBad}`}>
                          {answer?.isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                          <div className={styles.feedbackBody}>
                            <strong className={styles.feedbackTitle}>
                              {answer?.isCorrect
                                ? t('learner.lessonQuiz.feedback.correctTitle', 'Correct answer')
                                : t('learner.lessonQuiz.feedback.incorrectTitle', 'Incorrect answer')}
                            </strong>
                            <p className={styles.feedbackBrief} dir="auto">{brief}</p>
                          </div>
                        </div>

                        {quiz.showExplanationAfterSubmit && explanation.details ? (
                          <details className={styles.explanationDetails}>
                            <summary className={styles.explanationSummary}>
                              {answer?.isCorrect
                                ? t('learner.lessonQuiz.feedback.whyCorrect', 'Why this answer is correct')
                                : t('learner.lessonQuiz.feedback.whyCorrectAnswer', 'Why this is the correct answer')}
                            </summary>
                            <p className={styles.explanationBody} dir="auto">{explanation.details}</p>
                          </details>
                        ) : null}
                      </>
                    );
                  })()}
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      {!showReview ? (
        <div className={styles.questionStack}>
          <div className={styles.progressShell}>
            <div className={styles.progressMeta}>
              <span className={styles.progressLabel}>
                {t('learner.lessonQuiz.progress.question', 'Question {current} of {total}', {
                  current: currentQuestionIndex + 1,
                  total: Math.max(questionCount, 1),
                })}
              </span>
              <span className={styles.progressLabel}>
                {t('learner.lessonQuiz.progress.answered', 'Answered {count} of {total}', {
                  count: answeredCount,
                  total: Math.max(questionCount, 1),
                })}
              </span>
            </div>
            <div className={styles.progressTrack} aria-hidden="true">
              <span className={styles.progressFill} style={{ width: `${progressPct}%` }} />
            </div>
            <div className={styles.progressHintRow}>
              <span>{t('learner.lessonQuiz.meta.remainingAttempts', 'Attempts remaining')}</span>
              <strong>{attemptsRemaining}</strong>
            </div>
          </div>

          {currentQuestion ? (
            <article key={currentQuestion.id} className={styles.questionCard} ref={questionStageRef}>
              <div className={styles.questionHead}>
                <span className={styles.questionIndex}>{currentQuestionIndex + 1}</span>
                <div className={styles.questionHeading}>
                  <span className={styles.questionEyebrow}>
                    {t('learner.lessonQuiz.questionEyebrow', 'Checkpoint question')}
                  </span>
                  <h3 dir="auto">{currentQuestion.questionText}</h3>
                  <p className={styles.questionRule}>
                    {t('learner.lessonQuiz.meta.chooseOne', 'Choose one answer')}
                  </p>
                  {currentQuestion.hint ? (
                    <p className={styles.questionHint} dir="auto">
                      {currentQuestion.hint}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className={styles.options}>
                {currentQuestion.choices.map((choice, choiceIndex) => {
                  const isSelected = currentAnswerId === choice.id;
                  const revealCorrectChoice = currentAnswerResolved && !currentAnswerCorrect && choice.isCorrect;
                  const selectedWrongChoice = currentAnswerResolved && isSelected && !choice.isCorrect;
                  const selectedCorrectChoice = currentAnswerResolved && isSelected && choice.isCorrect;
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      className={`${styles.optionButton} ${isSelected ? styles.optionButtonActive : ''} ${selectedCorrectChoice ? styles.optionButtonCorrect : ''} ${selectedWrongChoice ? styles.optionButtonWrong : ''} ${revealCorrectChoice ? styles.optionButtonReveal : ''}`}
                      onClick={() => selectAnswer(currentQuestion.id, choice.id)}
                      disabled={showReview || submitMutation.isPending || currentAnswerResolved}
                    >
                      <span className={styles.optionMarker}>{getChoiceMarker(choiceIndex)}</span>
                      <span className={styles.optionText} dir="auto">{choice.choiceText}</span>
                      <span className={styles.optionInlineState}>
                        {selectedCorrectChoice ? (
                          <>
                            <CheckCircle2 size={14} />
                            {t('learner.lessonQuiz.correct', 'Correct')}
                          </>
                        ) : revealCorrectChoice ? (
                          <>
                            <CheckCircle2 size={14} />
                            {t('learner.lessonQuiz.answerKey', 'Correct answer')}
                          </>
                        ) : selectedWrongChoice ? (
                          <>
                            <XCircle size={14} />
                            {t('learner.lessonQuiz.feedback.yourWrongAnswer', 'Your incorrect answer')}
                          </>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>

              {currentAnswerResolved ? (
                <div className={styles.instantFeedback}>
                  <div className={`${styles.feedbackPanel} ${currentAnswerCorrect ? styles.feedbackGood : styles.feedbackBad}`}>
                    {currentAnswerCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    <div className={styles.feedbackBody}>
                      <strong className={styles.feedbackTitle}>
                        {currentAnswerCorrect
                          ? t('learner.lessonQuiz.feedback.correctTitle', 'Correct answer')
                          : t('learner.lessonQuiz.feedback.incorrectTitle', 'Incorrect answer')}
                      </strong>
                      <p className={styles.feedbackBrief} dir="auto">{currentFeedbackBrief}</p>
                    </div>
                  </div>

                  {!currentAnswerCorrect && currentCorrectChoice ? (
                    <div className={styles.answerRow}>
                      <span className={styles.answerLabel}>
                        {t('learner.lessonQuiz.feedback.correctAnswerLabel', 'Correct answer')}
                      </span>
                      <strong dir="auto">{currentCorrectChoice.choiceText}</strong>
                    </div>
                  ) : null}

                  {quiz.showExplanationAfterSubmit && currentExplanation.details ? (
                    <details className={styles.explanationDetails}>
                      <summary className={styles.explanationSummary}>
                        {currentAnswerCorrect
                          ? t('learner.lessonQuiz.feedback.whyCorrect', 'Why this answer is correct')
                          : t('learner.lessonQuiz.feedback.whyCorrectAnswer', 'Why this is the correct answer')}
                      </summary>
                      <p className={styles.explanationBody} dir="auto">{currentExplanation.details}</p>
                    </details>
                  ) : null}
                </div>
              ) : null}
            </article>
          ) : null}

          {submitError ? <div className={styles.errorBox}>{submitError}</div> : null}

          <div className={styles.actions}>
            <div className={styles.navActions}>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={goToPreviousQuestion}
                disabled={!canGoPreviousQuestion || submitMutation.isPending}
              >
                <ArrowLeft size={16} />
                {t('learner.lessonQuiz.actions.previousQuestion', 'Previous question')}
              </button>

              {isLastQuestion ? (
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={!canSubmit || submitMutation.isPending}
                  onClick={() => void submitMutation.mutate()}
                >
                  <CheckCircle2 size={16} />
                  {submitMutation.isPending
                    ? t('learner.lessonQuiz.submitting', 'Submitting...')
                    : t('learner.lessonQuiz.actions.finishCheckpoint', 'Finish checkpoint')}
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={!canGoNextQuestion || submitMutation.isPending}
                  onClick={goToNextQuestion}
                >
                  <ArrowRight size={16} />
                  {t('learner.lessonQuiz.actions.nextQuestion', 'Next question')}
                </button>
              )}
            </div>
          </div>

          <div className={styles.completionTrack}>
            <span>{t('learner.lessonQuiz.progress.overall', 'Checkpoint completion')}</span>
            <div className={styles.completionBar} aria-hidden="true">
              <span className={styles.completionFill} style={{ width: `${completionPct}%` }} />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
