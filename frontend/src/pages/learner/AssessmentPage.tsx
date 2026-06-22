import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, CircleHelp, ClipboardList, Gauge, ListChecks, XCircle } from 'lucide-react';
import { ApiError, assessmentApi } from '@/services/api';
import { useI18n } from '@/i18n';
import styles from './AssessmentPage.module.css';

type FormType = 'pre' | 'post';
type QuestionType = 'mcq' | 'true_false';
type AssessmentDimension = 's1' | 's2' | 's3' | 's4' | 's5';

type AssessmentChoice = {
  id: string;
  choiceText: string;
  isCorrect?: boolean;
  sequenceOrder: number;
};

type AssessmentQuestion = {
  id: string;
  questionType: QuestionType;
  questionText: string;
  explanation?: string | null;
  hint?: string | null;
  dimension?: AssessmentDimension | null;
  sequenceOrder: number;
  choices: AssessmentChoice[];
};

type AssessmentQuiz = {
  id: string;
  title: string;
  description?: string | null;
  passingScore: number;
  attemptLimit: number;
  questions: AssessmentQuestion[];
};

type AssessmentStartPayload = {
  id: string;
  quiz: AssessmentQuiz;
};

type AttemptAnswer = {
  questionId: string;
  isCorrect: boolean;
  question: AssessmentQuestion;
  selectedChoice?: { id: string; choiceText: string } | null;
};

type AssessmentSubmitPayload = {
  assessment: {
    id: string;
    totalScore: number;
    questionCount?: number | null;
    correctCount?: number | null;
  };
  quiz: AssessmentQuiz;
  attempt: {
    passed: boolean;
    scorePct: number;
    answers: AttemptAnswer[];
  };
};

type AssessmentCopy = {
  title: string;
  description: string;
  stageLabel: string;
  introSummary: string;
  questionTypes: string;
  expectedTime: string;
  expectedTimeValue: string;
  start: string;
  starting: string;
  chooseOne: string;
  question: string;
  progress: string;
  answered: string;
  previous: string;
  next: string;
  finish: string;
  submitting: string;
  hintTitle: string;
  resultTitle: string;
  resultLead: string;
  scoreLabel: string;
  correctCount: string;
  reviewTitle: string;
  yourAnswer: string;
  correctAnswer: string;
  explanation: string;
  noExplanation: string;
  continueAction: string;
  blocked: string;
  finalBlocked: string;
  questionCount: string;
  passingScore: string;
  trueFalse: string;
  multipleChoice: string;
  passed: string;
  notPassed: string;
  answerSelected: string;
  loadFailed: string;
  saveFailed: string;
  genericError: string;
  statusLabel: string;
  correctLabel: string;
  incorrectLabel: string;
};

function getLocalizedAssessmentCopy(language: 'ar' | 'en', formType: FormType): AssessmentCopy {
  if (language === 'ar') {
    return {
      title: formType === 'pre' ? 'الاختبار القبلي' : 'الاختبار البعدي',
      description:
        formType === 'pre'
          ? 'أجب عن مجموعة قصيرة من الأسئلة لقياس مستواك قبل الدخول إلى الوحدات التدريبية.'
          : 'أجب عن مجموعة قصيرة من الأسئلة لقياس مستوى تقدمك بعد إكمال البرنامج التدريبي.',
      stageLabel: formType === 'pre' ? 'قبل الوحدات التدريبية' : 'بعد آخر وحدة',
      introSummary:
        'يتكون هذا التقييم من أسئلة اختيار من متعدد وصح/خطأ فقط. يظهر سؤال واحد في كل مرة حتى تحافظ على التركيز وتراجع إجاباتك بسهولة.',
      questionTypes: 'أنواع الأسئلة: اختيار من متعدد وصح / خطأ',
      expectedTime: 'الوقت المتوقع',
      expectedTimeValue: '5-8 دقائق',
      start: 'ابدأ التقييم',
      starting: 'جارٍ البدء...',
      chooseOne: 'اختر إجابة واحدة',
      question: 'السؤال',
      progress: 'التقدم',
      answered: 'تمت الإجابة',
      previous: 'السابق',
      next: 'التالي',
      finish: 'إرسال التقييم',
      submitting: 'جارٍ الإرسال...',
      hintTitle: 'ملاحظة قصيرة',
      resultTitle: formType === 'pre' ? 'تم حفظ الاختبار القبلي' : 'تم حفظ الاختبار البعدي',
      resultLead:
        formType === 'pre'
          ? 'تم تسجيل إجاباتك بنجاح. يمكنك الآن الانتقال إلى الوحدات التدريبية.'
          : 'تم تسجيل إجاباتك بنجاح. يمكنك الآن الانتقال إلى شاشة الإكمال النهائي.',
      scoreLabel: 'النتيجة',
      correctCount: 'الإجابات الصحيحة',
      reviewTitle: 'مراجعة الإجابات',
      yourAnswer: 'إجابتك',
      correctAnswer: 'الإجابة الصحيحة',
      explanation: 'لماذا هذه الإجابة صحيحة؟',
      noExplanation: 'لا يوجد شرح إضافي لهذه النقطة.',
      continueAction: formType === 'pre' ? 'المتابعة إلى الوحدات' : 'الانتقال إلى الإكمال النهائي',
      blocked: 'أجب عن السؤال الحالي أولًا قبل المتابعة.',
      finalBlocked: 'أكمل جميع الأسئلة قبل إرسال التقييم.',
      questionCount: '{count} أسئلة',
      passingScore: 'معيار النجاح {score}%',
      trueFalse: 'صح / خطأ',
      multipleChoice: 'اختيار من متعدد',
      passed: 'أداء جيد',
      notPassed: 'يمكنك مراجعة الإجابات أدناه ثم المتابعة.',
      answerSelected: 'تم اختيار الإجابة',
      loadFailed: 'تعذر تحميل التقييم.',
      saveFailed: 'تعذر حفظ التقييم.',
      genericError: 'حدث خطأ غير متوقع.',
      statusLabel: 'الحالة',
      correctLabel: 'إجابة صحيحة',
      incorrectLabel: 'إجابة غير صحيحة',
    };
  }

  return {
    title: formType === 'pre' ? 'Pre-Test' : 'Post-Test',
    description:
      formType === 'pre'
        ? 'Answer a short set of questions to establish your starting level before entering the training modules.'
        : 'Answer a short set of questions to measure your progress after completing the training programme.',
    stageLabel: formType === 'pre' ? 'Before training units' : 'After the final unit',
    introSummary:
      'This assessment uses only multiple-choice and true/false questions. One question appears at a time so the experience stays focused and easy to review.',
    questionTypes: 'Question types: Multiple Choice and True / False',
    expectedTime: 'Expected time',
    expectedTimeValue: '5-8 minutes',
    start: 'Start assessment',
    starting: 'Starting...',
    chooseOne: 'Choose one answer',
    question: 'Question',
    progress: 'Progress',
    answered: 'Answered',
    previous: 'Previous',
    next: 'Next',
    finish: 'Submit assessment',
    submitting: 'Submitting...',
    hintTitle: 'Quick note',
    resultTitle: formType === 'pre' ? 'Pre-test submitted' : 'Post-test submitted',
    resultLead:
      formType === 'pre'
        ? 'Your responses were recorded successfully. You can now continue to the training units.'
        : 'Your responses were recorded successfully. You can now continue to the final completion screen.',
    scoreLabel: 'Score',
    correctCount: 'Correct answers',
    reviewTitle: 'Answer review',
    yourAnswer: 'Your answer',
    correctAnswer: 'Correct answer',
    explanation: 'Why this answer is correct',
    noExplanation: 'No extra explanation was provided for this item.',
    continueAction: formType === 'pre' ? 'Continue to modules' : 'Go to final completion',
    blocked: 'Answer the current question before moving on.',
    finalBlocked: 'Complete all questions before submitting the assessment.',
    questionCount: '{count} questions',
    passingScore: 'Passing score {score}%',
    trueFalse: 'True / False',
    multipleChoice: 'Multiple Choice',
    passed: 'Strong result',
    notPassed: 'Review your answers below, then continue.',
    answerSelected: 'Answer selected',
    loadFailed: 'Unable to load the assessment.',
    saveFailed: 'Unable to save the assessment.',
    genericError: 'Something went wrong.',
    statusLabel: 'Status',
    correctLabel: 'Correct',
    incorrectLabel: 'Incorrect',
  };
}

function fillTemplate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((result, [key, value]) => {
    return result.split(`{${key}}`).join(String(value));
  }, template);
}

export default function AssessmentPage() {
  const { form } = useParams<{ form: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const autoStartAttemptedRef = useRef(false);
  const { language } = useI18n();

  const formType: FormType = form === 'post' ? 'post' : 'pre';
  const copy = useMemo(() => getLocalizedAssessmentCopy(language, formType), [formType, language]);

  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<AssessmentQuiz | null>(null);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittedResult, setSubmittedResult] = useState<AssessmentSubmitPayload | null>(null);
  const [notice, setNotice] = useState('');

  const questions = quiz?.questions ?? [];
  const currentQuestion = questions[currentIndex] ?? null;
  const answeredCount = questions.filter((question) => Boolean(answers[question.id])).length;
  const canSubmit = questions.length > 0 && answeredCount === questions.length;
  const progressPct = questions.length ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;

  async function startAssessment() {
    setBusy(true);
    try {
      const response = await assessmentApi.start(formType);
      const payload = (response as { data?: AssessmentStartPayload }).data;
      if (!payload?.id || !payload.quiz) {
        throw new Error(copy.loadFailed);
      }

      setAssessmentId(payload.id);
      setQuiz(payload.quiz);
      setStarted(true);
      setCurrentIndex(0);
      setSubmittedResult(null);

      if (location.search) {
        navigate(location.pathname, { replace: true });
      }
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409 && error.code === 'DUPLICATE_FORM') {
        navigate(formType === 'pre' ? '/modules' : '/completion', { replace: true });
        return;
      }

      setNotice(error instanceof Error ? error.message : copy.genericError);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldAutoStart = formType === 'pre' && params.get('autostart') === '1';

    if (!shouldAutoStart || started || busy || autoStartAttemptedRef.current) return;

    autoStartAttemptedRef.current = true;
    void startAssessment();
  }, [busy, formType, location.search, started]);

  function selectAnswer(questionId: string, choiceId: string) {
    setNotice('');
    setAnswers((current) => ({
      ...current,
      [questionId]: choiceId,
    }));
  }

  function goNext() {
    if (!currentQuestion || !answers[currentQuestion.id]) {
      setNotice(copy.blocked);
      return;
    }

    setNotice('');
    setCurrentIndex((index) => Math.min(index + 1, questions.length - 1));
  }

  function goPrevious() {
    setCurrentIndex((index) => Math.max(index - 1, 0));
  }

  async function submitAssessment() {
    if (!assessmentId) return;
    if (!canSubmit) {
      setNotice(copy.finalBlocked);
      return;
    }
    setNotice('');

    setBusy(true);
    try {
      const response = await assessmentApi.submit(assessmentId, {
        answers: questions.map((question) => ({
          questionId: question.id,
          choiceId: answers[question.id],
        })),
      });
      const payload = (response as { data?: AssessmentSubmitPayload }).data;
      if (!payload) {
        throw new Error(copy.saveFailed);
      }

      setSubmittedResult(payload);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.code === 'ALREADY_COMPLETE') {
        navigate(formType === 'pre' ? '/modules' : '/completion', { replace: true });
        return;
      }

      setNotice(error instanceof Error ? error.message : copy.genericError);
    } finally {
      setBusy(false);
    }
  }

  const completionTarget = formType === 'pre' ? '/modules' : '/completion';

  if (submittedResult) {
    const scorePct = Math.round(submittedResult.attempt.scorePct);
    const correctCount = submittedResult.assessment.correctCount ?? submittedResult.attempt.answers.filter((answer) => answer.isCorrect).length;
    const questionCount = submittedResult.assessment.questionCount ?? submittedResult.attempt.answers.length;

    return (
      <div className={styles.page}>
        <section className={styles.resultCard}>
          <div className={styles.resultHero}>
            <div className={styles.resultIcon}>
              <CheckCircle2 size={40} />
            </div>
            <div className={styles.resultCopy}>
              <span className={styles.stageLabel}>{copy.stageLabel}</span>
              <h1>{copy.resultTitle}</h1>
              <p>{copy.resultLead}</p>
            </div>
          </div>

          <div className={styles.resultStats}>
            <article className={styles.statCard}>
              <span>{copy.scoreLabel}</span>
              <strong>{scorePct}%</strong>
            </article>
            <article className={styles.statCard}>
              <span>{copy.correctCount}</span>
              <strong>{correctCount} / {questionCount}</strong>
            </article>
            <article className={styles.statCard}>
              <span>{copy.statusLabel}</span>
              <strong>{submittedResult.attempt.passed ? copy.passed : copy.notPassed}</strong>
            </article>
          </div>

          <div className={styles.reviewSection}>
            <div className={styles.sectionHeading}>
              <ListChecks size={18} />
              <h2>{copy.reviewTitle}</h2>
            </div>

            <div className={styles.reviewList}>
              {submittedResult.attempt.answers.map((answer, index) => {
                const correctChoice = answer.question.choices.find((choice) => choice.isCorrect) ?? null;

                return (
                  <article key={answer.questionId} className={styles.reviewCard}>
                    <div className={styles.reviewHeader}>
                      <span className={styles.reviewIndex}>
                        {copy.question} {index + 1}
                      </span>
                      <span className={answer.isCorrect ? styles.correctBadge : styles.incorrectBadge}>
                        {answer.isCorrect ? (
                          <>
                            <CheckCircle2 size={14} />
                            {copy.correctLabel}
                          </>
                        ) : (
                          <>
                            <XCircle size={14} />
                            {copy.incorrectLabel}
                          </>
                        )}
                      </span>
                    </div>

                    <h3>{answer.question.questionText}</h3>

                    <div className={styles.answerSummary}>
                      <div>
                        <span>{copy.yourAnswer}</span>
                        <strong>{answer.selectedChoice?.choiceText ?? 'â€”'}</strong>
                      </div>
                      <div>
                        <span>{copy.correctAnswer}</span>
                        <strong>{correctChoice?.choiceText ?? 'â€”'}</strong>
                      </div>
                    </div>

                    <details className={styles.explanationPanel}>
                      <summary>{copy.explanation}</summary>
                      <p>{answer.question.explanation || copy.noExplanation}</p>
                    </details>
                  </article>
                );
              })}
            </div>
          </div>

          <div className={styles.actions}>
            <button className="btn btn-primary" onClick={() => navigate(completionTarget)}>
              {copy.continueAction}
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!started || !quiz) {
    return (
      <div className={styles.page}>
        <section className={styles.introCard}>
          <div className={styles.introIcon}>
            <ClipboardList size={30} />
          </div>

          <span className={styles.stageLabel}>{copy.stageLabel}</span>
          <h1>{copy.title}</h1>
          <p className={styles.lead}>{copy.description}</p>
          <p className={styles.supportText}>{copy.introSummary}</p>

          <div className={styles.introMeta}>
            <div className={styles.metaItem}>
              <Gauge size={16} />
              <span>{copy.expectedTime}: <strong>{copy.expectedTimeValue}</strong></span>
            </div>
            <div className={styles.metaItem}>
              <CircleHelp size={16} />
              <span>{copy.questionTypes}</span>
            </div>
          </div>

          {notice ? (
            <div className={styles.notice} role="alert">
              <AlertCircle size={15} />
              <span>{notice}</span>
            </div>
          ) : null}

          <button className="btn btn-primary btn-lg" onClick={() => void startAssessment()} disabled={busy}>
            {busy ? copy.starting : copy.start}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.quizCard}>
        <div className={styles.quizHeader}>
          <div>
            <span className={styles.stageLabel}>{copy.stageLabel}</span>
            <h1>{quiz.title || copy.title}</h1>
            <p>{quiz.description || copy.description}</p>
          </div>

          <div className={styles.quizMeta}>
            <span>{fillTemplate(copy.questionCount, { count: questions.length })}</span>
            <span>{fillTemplate(copy.passingScore, { score: quiz.passingScore })}</span>
          </div>
        </div>

        <div className={styles.progressBlock}>
          <div className={styles.progressLabels}>
            <span>
              {copy.progress}: {progressPct}%
            </span>
            <span>
              {copy.answered}: {answeredCount}/{questions.length}
            </span>
          </div>
          <div className={styles.progressBar}>
            <span style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {currentQuestion ? (
          <article className={styles.questionCard}>
            <div className={styles.questionHeader}>
              <span className={styles.questionIndex}>
                {copy.question} {currentIndex + 1}
              </span>
              <span className={styles.questionType}>
                {currentQuestion.questionType === 'true_false' ? copy.trueFalse : copy.multipleChoice}
              </span>
            </div>

            <h2>{currentQuestion.questionText}</h2>

            <div className={styles.choiceList}>
              {currentQuestion.choices.map((choice, index) => {
                const selected = answers[currentQuestion.id] === choice.id;

                return (
                  <button
                    key={choice.id}
                    type="button"
                    className={`${styles.choiceButton} ${selected ? styles.choiceButtonSelected : ''}`}
                    onClick={() => selectAnswer(currentQuestion.id, choice.id)}
                  >
                    <span className={styles.choiceMarker}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className={styles.choiceText}>{choice.choiceText}</span>
                    {selected ? <span className={styles.choiceState}>{copy.answerSelected}</span> : null}
                  </button>
                );
              })}
            </div>

            {currentQuestion.hint ? (
              <div className={styles.hintBox}>
                <strong>{copy.hintTitle}</strong>
                <p>{currentQuestion.hint}</p>
              </div>
            ) : null}
          </article>
        ) : null}

        {notice ? (
          <div className={styles.notice} role="alert">
            <AlertCircle size={15} />
            <span>{notice}</span>
          </div>
        ) : null}

        <div className={styles.actions}>
          <button className="btn btn-secondary" type="button" onClick={goPrevious} disabled={currentIndex === 0 || busy}>
            {copy.previous}
          </button>

          {currentIndex < questions.length - 1 ? (
            <button className="btn btn-primary" type="button" onClick={goNext} disabled={busy}>
              {copy.next}
            </button>
          ) : (
            <button className="btn btn-primary" type="button" onClick={() => void submitAssessment()} disabled={!canSubmit || busy}>
              {busy ? copy.submitting : copy.finish}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

