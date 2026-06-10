import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Reorder } from 'framer-motion';
import {
  ClipboardCheck,
  Copy,
  GripVertical,
  HelpCircle,
  PencilLine,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { quizApi } from '@/services/api';
import { useI18n } from '@/i18n';
import styles from './LessonQuizBuilder.module.css';

export type AssessmentDimension = 's1' | 's2' | 's3' | 's4' | 's5';
export type QuizBuilderScope = 'lesson' | 'unit' | 'pretest' | 'posttest';

export type LessonQuizChoice = {
  id: string;
  choiceText: string;
  isCorrect: boolean;
  sequenceOrder: number;
};

export type LessonQuizQuestion = {
  id: string;
  questionType: 'true_false' | 'mcq';
  questionText: string;
  explanation?: string | null;
  hint?: string | null;
  dimension?: AssessmentDimension | null;
  weight: number;
  sequenceOrder: number;
  choices: LessonQuizChoice[];
};

export type LessonQuiz = {
  id: string;
  title: string;
  description?: string | null;
  scope: 'lesson' | 'unit' | 'pretest' | 'posttest';
  courseKey?: string | null;
  moduleId?: string | null;
  passingScore: number;
  attemptLimit: number;
  showExplanationAfterSubmit: boolean;
  allowRetry: boolean;
  adaptiveOnFail?: string | null;
  adaptiveOnPass?: string | null;
  isPublished: boolean;
  sequenceOrder: number;
  questions: LessonQuizQuestion[];
};

type Props = {
  lessonId?: string | null;
  moduleId?: string | null;
  courseKey?: string | null;
  scope?: QuizBuilderScope;
  quizzes: LessonQuiz[];
  onRefresh: () => Promise<void>;
  headerEyebrow?: string;
  headerTitle?: string;
  headerDescription?: string;
  addQuizLabel?: string;
  emptyState?: string;
};

type QuizModalState = {
  open: boolean;
  data?: Partial<LessonQuiz>;
};

type QuestionModalState = {
  open: boolean;
  quizId?: string;
  data?: Partial<LessonQuizQuestion>;
};

function hasOrderChanged<T extends { id: string }>(current: T[], next: T[]) {
  if (current.length !== next.length) return true;
  return current.some((item, index) => item.id !== next[index]?.id);
}

function getChoiceText(question: Partial<LessonQuizQuestion> | undefined, index: number) {
  return question?.choices?.[index]?.choiceText ?? '';
}

function getCorrectChoiceIndex(question: Partial<LessonQuizQuestion> | undefined) {
  const index = question?.choices?.findIndex((choice) => choice.isCorrect) ?? -1;
  return index >= 0 ? index : 0;
}

function parseQuizPayload(
  form: FormData,
  scope: QuizBuilderScope,
  lessonId?: string | null,
  moduleId?: string | null,
  courseKey?: string | null,
) {
  const assessmentAttemptDefault = scope === 'pretest' || scope === 'posttest' ? 1 : 2;
  return {
    title: String(form.get('title') ?? '').trim(),
    description: String(form.get('description') ?? '').trim() || null,
    scope,
    episodeId: scope === 'lesson' ? lessonId ?? null : null,
    moduleId: scope === 'lesson' || scope === 'unit' ? moduleId ?? null : null,
    courseKey: scope === 'pretest' || scope === 'posttest' ? courseKey ?? null : null,
    passingScore: Number(form.get('passingScore') ?? 70) || 70,
    attemptLimit: Number(form.get('attemptLimit') ?? assessmentAttemptDefault) || assessmentAttemptDefault,
    showExplanationAfterSubmit: form.get('showExplanationAfterSubmit') === 'on',
    allowRetry: form.get('allowRetry') === 'on',
    adaptiveOnFail: String(form.get('adaptiveOnFail') ?? '').trim() || null,
    adaptiveOnPass: String(form.get('adaptiveOnPass') ?? '').trim() || null,
    isPublished: form.get('isPublished') === 'on',
  };
}

function parseQuestionPayload(
  form: FormData,
  questionType: 'true_false' | 'mcq',
  includeDimension: boolean,
) {
  const base = {
    questionType,
    questionText: String(form.get('questionText') ?? '').trim(),
    explanation: String(form.get('explanation') ?? '').trim() || null,
    hint: String(form.get('hint') ?? '').trim() || null,
    dimension: includeDimension ? (String(form.get('dimension') ?? '').trim() || null) as AssessmentDimension | null : null,
    weight: Number(form.get('weight') ?? 1) || 1,
  };

  if (questionType === 'true_false') {
    return {
      ...base,
      correctBoolean: form.get('correctBoolean') === 'true',
    };
  }

  const correctIndex = Number(form.get('correctChoiceIndex') ?? 0);
  const choices = [0, 1, 2, 3]
    .map((index) => ({
      choiceText: String(form.get(`choiceText-${index}`) ?? '').trim(),
      isCorrect: index === correctIndex,
      sequenceOrder: index + 1,
    }))
    .filter((choice) => choice.choiceText.length > 0);

  return {
    ...base,
    choices,
  };
}

export default function LessonQuizBuilder({
  lessonId,
  moduleId,
  courseKey,
  scope = 'lesson',
  quizzes,
  onRefresh,
  headerEyebrow,
  headerTitle,
  headerDescription,
  addQuizLabel,
  emptyState,
}: Props) {
  const { t } = useI18n();
  const qb = (
    key: string,
    fallback: string,
    values?: Record<string, string | number>,
  ) => t(`research.quizBuilder.${key}`, fallback, values);

  const [quizModal, setQuizModal] = useState<QuizModalState>({ open: false });
  const [questionModal, setQuestionModal] = useState<QuestionModalState>({ open: false });
  const [questionTypeDraft, setQuestionTypeDraft] = useState<'true_false' | 'mcq'>('mcq');
  const includeDimension = scope !== 'lesson';

  useEffect(() => {
    if (!questionModal.open) return;
    setQuestionTypeDraft((questionModal.data?.questionType as 'true_false' | 'mcq') ?? 'mcq');
  }, [questionModal.data?.questionType, questionModal.open]);

  const sortedQuizzes = useMemo(
    () => [...quizzes].sort((a, b) => a.sequenceOrder - b.sequenceOrder),
    [quizzes],
  );

  const assessmentTypeCards = useMemo(
    () => [
      {
        key: 'pre',
        label: qb('assessmentTypes.pre.label', 'Pre-test'),
        scope: qb('assessmentTypes.pre.scope', 'Platform-level gate before units'),
        note: qb(
          'assessmentTypes.pre.note',
          'Appears before entering training units to establish baseline competency.',
        ),
      },
      {
        key: 'checkpoint',
        label: qb('assessmentTypes.checkpoint.label', 'In-lesson checkpoint quiz'),
        scope: qb('assessmentTypes.checkpoint.scope', 'Lesson-level authoring (this section)'),
        note: qb(
          'assessmentTypes.checkpoint.note',
          'Used inside lessons to verify understanding and trigger adaptive support/challenge paths.',
        ),
      },
      {
        key: 'post',
        label: qb('assessmentTypes.post.label', 'Post-test'),
        scope: qb('assessmentTypes.post.scope', 'Platform-level gate after final unit'),
        note: qb(
          'assessmentTypes.post.note',
          'Appears only after finishing the final unit to measure endline performance.',
        ),
      },
    ],
    [qb],
  );

  const dimensionOptions = useMemo(
    () => [
      { value: 's1', label: qb('dimensions.s1', 'Competency 1 (S1)') },
      { value: 's2', label: qb('dimensions.s2', 'Competency 2 (S2)') },
      { value: 's3', label: qb('dimensions.s3', 'Competency 3 (S3)') },
      { value: 's4', label: qb('dimensions.s4', 'Competency 4 (S4)') },
      { value: 's5', label: qb('dimensions.s5', 'Competency 5 (S5)') },
    ],
    [qb],
  );

  const scopeMeta = useMemo(() => {
    if (scope === 'pretest') {
      return {
        headerEyebrow: headerEyebrow ?? qb('pretest.headerEyebrow', 'Pre-Test'),
        headerTitle: headerTitle ?? qb('pretest.headerTitle', 'Pre-Test Question Bank'),
        headerDescription:
          headerDescription ??
          qb(
            'pretest.headerDescription',
            'Create the structured baseline assessment shown before learners enter the training units.',
          ),
        addQuizLabel: addQuizLabel ?? qb('pretest.addQuiz', 'Add Pre-Test'),
        emptyState:
          emptyState ??
          qb(
            'pretest.emptyState',
            'No pre-test has been authored yet. Create one structured question set to establish learner baseline performance.',
          ),
        scopeBadge: qb('labels.pretest', 'Pre-test'),
      };
    }

    if (scope === 'posttest') {
      return {
        headerEyebrow: headerEyebrow ?? qb('posttest.headerEyebrow', 'Post-Test'),
        headerTitle: headerTitle ?? qb('posttest.headerTitle', 'Post-Test Question Bank'),
        headerDescription:
          headerDescription ??
          qb(
            'posttest.headerDescription',
            'Create the structured endline assessment shown after the learner completes the final unit.',
          ),
        addQuizLabel: addQuizLabel ?? qb('posttest.addQuiz', 'Add Post-Test'),
        emptyState:
          emptyState ??
          qb(
            'posttest.emptyState',
            'No post-test has been authored yet. Create one structured question set to measure final learner performance.',
          ),
        scopeBadge: qb('labels.posttest', 'Post-test'),
      };
    }

    if (scope === 'unit') {
      return {
        headerEyebrow: headerEyebrow ?? qb('unit.headerEyebrow', 'Unit Assessment'),
        headerTitle: headerTitle ?? qb('unit.headerTitle', 'Unit-End Assessments'),
        headerDescription:
          headerDescription ??
          qb(
            'unit.headerDescription',
            'Create an optional end-of-unit assessment to verify readiness before moving beyond the unit.',
          ),
        addQuizLabel: addQuizLabel ?? qb('unit.addQuiz', 'Add Unit Assessment'),
        emptyState:
          emptyState ??
          qb(
            'unit.emptyState',
            'No unit-end assessment yet. Add one only when this unit needs a structured mastery check.',
          ),
        scopeBadge: qb('labels.unit', 'Unit assessment'),
      };
    }

    return {
      headerEyebrow: headerEyebrow ?? qb('header.eyebrow', 'Assessment Authoring'),
      headerTitle: headerTitle ?? qb('header.title', 'In-lesson Checkpoint Quizzes'),
      headerDescription:
        headerDescription ??
        qb(
          'header.description',
          'Use short in-lesson checkpoint quizzes to verify understanding and branch into support or challenge when needed.',
        ),
      addQuizLabel: addQuizLabel ?? qb('actions.addQuiz', 'Add Quiz'),
      emptyState:
        emptyState ??
        qb(
          'states.noQuizzes',
          'No lesson quizzes yet. Add a short checkpoint, a mastery check, or an adaptive support quiz for this lesson.',
        ),
      scopeBadge: qb('labels.checkpointCategory', 'Checkpoint quiz'),
    };
  }, [addQuizLabel, emptyState, headerDescription, headerEyebrow, headerTitle, qb, scope]);

  const quizTitleDefault =
    quizModal.data?.title ??
    (scope === 'pretest'
      ? qb('defaults.pretestTitle', 'الاختبار القبلي')
      : scope === 'posttest'
        ? qb('defaults.posttestTitle', 'الاختبار البعدي')
        : scope === 'unit'
          ? qb('defaults.unitTitle', 'اختبار نهاية الوحدة')
          : '');
  const attemptLimitDefault =
    quizModal.data?.attemptLimit ??
    (scope === 'pretest' || scope === 'posttest' ? 1 : 2);
  const allowRetryDefault =
    quizModal.data?.allowRetry ??
    (scope === 'pretest' || scope === 'posttest' ? false : true);

  const reorderQuizzesMutation = useMutation({
    mutationFn: (items: { id: string; sequenceOrder: number }[]) => quizApi.reorderQuizzes(items),
    onSuccess: async () => { await onRefresh(); },
  });

  const reorderQuestionsMutation = useMutation({
    mutationFn: (items: { id: string; sequenceOrder: number }[]) => quizApi.reorderQuestions(items),
    onSuccess: async () => { await onRefresh(); },
  });

  async function saveQuiz(form: FormData) {
    const payload = parseQuizPayload(form, scope, lessonId, moduleId, courseKey);
    if (quizModal.data?.id) {
      await quizApi.updateQuiz(quizModal.data.id, payload);
    } else {
      await quizApi.createQuiz(payload);
    }
    setQuizModal({ open: false });
    await onRefresh();
  }

  async function saveQuestion(form: FormData) {
    if (!questionModal.quizId) return;
    const payload = parseQuestionPayload(form, questionTypeDraft, includeDimension);
    if (questionModal.data?.id) {
      await quizApi.updateQuestion(questionModal.data.id, payload);
    } else {
      await quizApi.createQuestion(questionModal.quizId, payload);
    }
    setQuestionModal({ open: false });
    await onRefresh();
  }

  async function removeQuiz(quizId: string) {
    if (!window.confirm(qb('confirm.deleteQuiz', 'Delete this quiz and all of its questions?'))) return;
    await quizApi.deleteQuiz(quizId);
    await onRefresh();
  }

  async function removeQuestion(questionId: string) {
    if (!window.confirm(qb('confirm.deleteQuestion', 'Delete this question?'))) return;
    await quizApi.deleteQuestion(questionId);
    await onRefresh();
  }

  async function duplicateQuestion(questionId: string) {
    await quizApi.duplicateQuestion(questionId);
    await onRefresh();
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.eyebrow}>{scopeMeta.headerEyebrow}</div>
          <h2>{scopeMeta.headerTitle}</h2>
          <p>{scopeMeta.headerDescription}</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setQuizModal({ open: true })} type="button">
          <Plus size={14} />
          {scopeMeta.addQuizLabel}
        </button>
      </div>

      {scope === 'lesson' ? (
        <div className={styles.assessmentTypes}>
          {assessmentTypeCards.map((item) => (
            <article key={item.key} className={styles.assessmentTypeCard}>
              <strong>{item.label}</strong>
              <span>{item.scope}</span>
              <p>{item.note}</p>
            </article>
          ))}
        </div>
      ) : null}

      {sortedQuizzes.length ? (
        <Reorder.Group
          axis="y"
          values={sortedQuizzes}
          onReorder={(items) => {
            if (!hasOrderChanged(sortedQuizzes, items)) return;
            reorderQuizzesMutation.mutate(items.map((item, index) => ({ id: item.id, sequenceOrder: index + 1 })));
          }}
          className={styles.quizList}
        >
          {sortedQuizzes.map((quiz) => (
            <Reorder.Item key={quiz.id} value={quiz} className={styles.quizItem}>
              <article className={styles.quizCard}>
                <div className={styles.quizHeader}>
                  <div className={styles.quizIdentity}>
                    <GripVertical size={15} className={styles.dragHandle} />
                      <div>
                        <div className={styles.quizMeta}>
                          <span className="badge badge-soft-teal">{scopeMeta.scopeBadge}</span>
                          <span className="badge badge-soft-blue">{qb('labels.quizNumber', 'Quiz {order}', { order: quiz.sequenceOrder })}</span>
                          <span className="badge badge-soft-teal">{qb('labels.questionsCount', '{count} questions', { count: quiz.questions.length })}</span>
                          <span className={`badge ${quiz.isPublished ? 'badge-success' : 'badge-amber'}`}>
                          {quiz.isPublished ? t('common.status.published', 'Published') : t('common.status.draft', 'Draft')}
                        </span>
                      </div>
                      <h3>{quiz.title}</h3>
                      <p>{quiz.description || qb('states.quizDescriptionFallback', 'Add a short checkpoint, a lesson practice quiz, or an adaptive mastery check.')}</p>
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setQuizModal({ open: true, data: quiz })} type="button">
                      <PencilLine size={12} />
                      {qb('actions.edit', 'Edit')}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setQuestionModal({ open: true, quizId: quiz.id })} type="button">
                      <Plus size={12} />
                      {qb('actions.addQuestion', 'Add Question')}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => void removeQuiz(quiz.id)} type="button">
                      <Trash2 size={12} />
                      {qb('actions.delete', 'Delete')}
                    </button>
                  </div>
                </div>

                <div className={styles.quizStats}>
                  <div>
                    <span>{qb('labels.passingScore', 'Passing score')}</span>
                    <strong>{quiz.passingScore}%</strong>
                  </div>
                  <div>
                    <span>{qb('labels.attemptLimit', 'Attempt limit')}</span>
                    <strong>{quiz.attemptLimit}</strong>
                  </div>
                  <div>
                    <span>{qb('labels.onFail', 'On fail')}</span>
                    <strong>{quiz.adaptiveOnFail || qb('labels.supportContent', 'Support content')}</strong>
                  </div>
                  <div>
                    <span>{qb('labels.onPass', 'On pass')}</span>
                    <strong>{quiz.adaptiveOnPass || qb('labels.challengePath', 'Challenge path')}</strong>
                  </div>
                </div>

                {quiz.questions.length ? (
                  <Reorder.Group
                    axis="y"
                    values={quiz.questions}
                    onReorder={(items) => {
                      if (!hasOrderChanged(quiz.questions, items)) return;
                      reorderQuestionsMutation.mutate(items.map((item, index) => ({ id: item.id, sequenceOrder: index + 1 })));
                    }}
                    className={styles.questionList}
                  >
                    {quiz.questions.map((question) => (
                      <Reorder.Item key={question.id} value={question} className={styles.questionItem}>
                        <article className={styles.questionCard}>
                          <div className={styles.questionHeader}>
                            <div className={styles.questionIdentity}>
                              <GripVertical size={14} className={styles.dragHandle} />
                              <div>
                                <div className={styles.questionMeta}>
                                  <span className="badge badge-muted">{question.questionType === 'mcq' ? qb('labels.mcq', 'MCQ') : qb('labels.trueFalse', 'True / False')}</span>
                                  {question.dimension ? (
                                    <span className="badge badge-soft-blue">
                                      {dimensionOptions.find((option) => option.value === question.dimension)?.label ?? question.dimension.toUpperCase()}
                                    </span>
                                  ) : null}
                                  <span className="badge badge-soft-teal">{qb('labels.weight', 'Weight {value}', { value: question.weight })}</span>
                                </div>
                                <strong>{question.questionText}</strong>
                              </div>
                            </div>

                            <div className={styles.actions}>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setQuestionModal({ open: true, quizId: quiz.id, data: question })}
                                type="button"
                              >
                                <PencilLine size={12} />
                                {qb('actions.edit', 'Edit')}
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => void duplicateQuestion(question.id)} type="button">
                                <Copy size={12} />
                                {qb('actions.duplicate', 'Duplicate')}
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => void removeQuestion(question.id)} type="button">
                                <Trash2 size={12} />
                                {qb('actions.delete', 'Delete')}
                              </button>
                            </div>
                          </div>

                          <div className={styles.choiceList}>
                            {question.choices.map((choice) => (
                              <div key={choice.id} className={`${styles.choiceItem} ${choice.isCorrect ? styles.choiceCorrect : ''}`}>
                                <span>{choice.choiceText}</span>
                                {choice.isCorrect ? <ShieldCheck size={14} /> : null}
                              </div>
                            ))}
                          </div>

                          {question.hint ? (
                            <div className={styles.questionNote}>
                              <HelpCircle size={14} />
                              <span>{question.hint}</span>
                            </div>
                          ) : null}
                        </article>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                ) : (
                  <div className={styles.emptyState}>
                    {qb('states.noQuestions', 'This quiz does not contain any questions yet. Add the first question to make it ready for learners.')}
                  </div>
                )}
              </article>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      ) : (
        <div className={styles.emptyState}>
          {scopeMeta.emptyState}
        </div>
      )}

      {quizModal.open ? (
        <div className="modal-overlay">
          <div className="card" style={{ width: 'min(720px, 96vw)' }}>
            <div className={styles.modalHead}>
              <div>
                <div className={styles.eyebrow}>{qb('modals.quizSettings', 'Quiz Settings')}</div>
                <h3>
                  {quizModal.data?.id
                    ? scope === 'lesson'
                      ? qb('modals.editLessonQuiz', 'Edit Lesson Quiz')
                      : scope === 'unit'
                        ? qb('modals.editUnitQuiz', 'Edit Unit Assessment')
                        : scope === 'pretest'
                          ? qb('modals.editPretest', 'Edit Pre-Test')
                          : qb('modals.editPosttest', 'Edit Post-Test')
                    : scope === 'lesson'
                      ? qb('modals.addLessonQuiz', 'Add Lesson Quiz')
                      : scope === 'unit'
                        ? qb('modals.addUnitQuiz', 'Add Unit Assessment')
                        : scope === 'pretest'
                          ? qb('modals.addPretest', 'Add Pre-Test')
                          : qb('modals.addPosttest', 'Add Post-Test')}
                </h3>
              </div>
              <ClipboardCheck size={18} />
            </div>

            <form onSubmit={(event) => { event.preventDefault(); void saveQuiz(new FormData(event.currentTarget)); }}>
              <div className={styles.formGrid}>
                <div className="form-group">
                  <label className="label">{qb('forms.quizTitle', 'Quiz title')}</label>
                  <input name="title" className="input" defaultValue={quizTitleDefault} required />
                </div>
                <div className="form-group">
                  <label className="label">{qb('labels.passingScore', 'Passing score')}</label>
                  <input name="passingScore" type="number" min="0" max="100" className="input" defaultValue={quizModal.data?.passingScore ?? 70} />
                </div>
              </div>

              <div className="form-group">
                <label className="label">{qb('forms.description', 'Description')}</label>
                <textarea name="description" className="input" rows={3} defaultValue={quizModal.data?.description ?? ''} />
              </div>

              <div className={styles.formGrid}>
                <div className="form-group">
                  <label className="label">{qb('labels.attemptLimit', 'Attempt limit')}</label>
                  <input name="attemptLimit" type="number" min="1" max="10" className="input" defaultValue={attemptLimitDefault} />
                </div>
                {scope === 'lesson' ? (
                  <div className="form-group">
                    <label className="label">{qb('forms.adaptiveOnFail', 'Adaptive on fail')}</label>
                    <input name="adaptiveOnFail" className="input" defaultValue={quizModal.data?.adaptiveOnFail ?? 'support_content'} />
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="label">{qb('labels.questionsCount', 'Questions')}</label>
                    <input className="input" value={quizModal.data?.questions?.length ?? 0} readOnly />
                  </div>
                )}
              </div>

              <div className={styles.formGrid}>
                {scope === 'lesson' ? (
                  <div className="form-group">
                    <label className="label">{qb('forms.adaptiveOnPass', 'Adaptive on pass')}</label>
                    <input name="adaptiveOnPass" className="input" defaultValue={quizModal.data?.adaptiveOnPass ?? 'challenge_path'} />
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="label">{qb('labels.scope', 'Scope')}</label>
                    <input className="input" value={scopeMeta.scopeBadge} readOnly />
                  </div>
                )}
                <div className={styles.checkGrid}>
                  <label className={styles.checkboxField}>
                    <input name="showExplanationAfterSubmit" type="checkbox" defaultChecked={quizModal.data?.showExplanationAfterSubmit ?? true} />
                    {qb('forms.showExplanations', 'Show explanations after submit')}
                  </label>
                  <label className={styles.checkboxField}>
                    <input name="allowRetry" type="checkbox" defaultChecked={allowRetryDefault} />
                    {qb('forms.allowRetry', 'Allow retry')}
                  </label>
                  <label className={styles.checkboxField}>
                    <input name="isPublished" type="checkbox" defaultChecked={quizModal.data?.isPublished ?? true} />
                    {t('common.status.published', 'Published')}
                  </label>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button className="btn btn-secondary" type="button" onClick={() => setQuizModal({ open: false })}>{t('common.cancel', 'Cancel')}</button>
                <button className="btn btn-primary" type="submit">{qb('actions.saveQuiz', 'Save Quiz')}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {questionModal.open ? (
        <div className="modal-overlay">
          <div className="card" style={{ width: 'min(760px, 96vw)' }}>
            <div className={styles.modalHead}>
              <div>
                <div className={styles.eyebrow}>{qb('modals.questionAuthoring', 'Question Authoring')}</div>
                <h3>{questionModal.data?.id ? qb('modals.editQuestion', 'Edit Quiz Question') : qb('modals.addQuestion', 'Add Quiz Question')}</h3>
              </div>
              <HelpCircle size={18} />
            </div>

            <form onSubmit={(event) => { event.preventDefault(); void saveQuestion(new FormData(event.currentTarget)); }}>
              <div className={styles.formGrid}>
                <div className="form-group">
                  <label className="label">{qb('forms.questionType', 'Question type')}</label>
                  <select
                    name="questionType"
                    className="input"
                    value={questionTypeDraft}
                    onChange={(event) => setQuestionTypeDraft(event.target.value as 'true_false' | 'mcq')}
                  >
                    <option value="mcq">{qb('labels.multipleChoice', 'Multiple Choice')}</option>
                    <option value="true_false">{qb('labels.trueFalse', 'True / False')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">{qb('forms.weight', 'Weight')}</label>
                  <input name="weight" type="number" min="1" max="10" className="input" defaultValue={questionModal.data?.weight ?? 1} />
                </div>
              </div>

              {includeDimension ? (
                <div className="form-group">
                  <label className="label">{qb('forms.dimension', 'Assessment dimension')}</label>
                  <select
                    name="dimension"
                    className="input"
                    defaultValue={questionModal.data?.dimension ?? ''}
                  >
                    <option value="">{qb('forms.dimensionOptional', 'Select competency dimension')}</option>
                    {dimensionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="form-group">
                <label className="label">{qb('forms.questionText', 'Question text')}</label>
                <textarea name="questionText" className="input" rows={3} defaultValue={questionModal.data?.questionText ?? ''} required />
              </div>

              <div className={styles.formGrid}>
                <div className="form-group">
                  <label className="label">{qb('forms.hint', 'Hint')}</label>
                  <input name="hint" className="input" defaultValue={questionModal.data?.hint ?? ''} />
                </div>
                <div className="form-group">
                  <label className="label">{qb('forms.explanation', 'Explanation')}</label>
                  <input name="explanation" className="input" defaultValue={questionModal.data?.explanation ?? ''} />
                </div>
              </div>

              {questionTypeDraft === 'true_false' ? (
                <div className={styles.booleanGroup}>
                  <label className={styles.booleanChoice}>
                    <input
                      type="radio"
                      name="correctBoolean"
                      value="true"
                      defaultChecked={(questionModal.data?.choices?.find((choice) => choice.isCorrect)?.choiceText ?? '').toLowerCase() === 'true'}
                    />
                    {qb('labels.trueIsCorrect', 'True is correct')}
                  </label>
                  <label className={styles.booleanChoice}>
                    <input
                      type="radio"
                      name="correctBoolean"
                      value="false"
                      defaultChecked={(questionModal.data?.choices?.find((choice) => choice.isCorrect)?.choiceText ?? '').toLowerCase() === 'false'}
                    />
                    {qb('labels.falseIsCorrect', 'False is correct')}
                  </label>
                </div>
              ) : (
                <div className={styles.choiceEditor}>
                  <div className={styles.choiceEditorHead}>
                    <strong>{qb('labels.answerChoices', 'Answer choices')}</strong>
                    <span>{qb('labels.selectCorrectOption', 'Select the correct option.')}</span>
                  </div>

                  {[0, 1, 2, 3].map((index) => (
                    <div key={index} className={styles.choiceEditorRow}>
                      <input
                        type="radio"
                        name="correctChoiceIndex"
                        value={index}
                        defaultChecked={getCorrectChoiceIndex(questionModal.data) === index}
                      />
                      <input
                        name={`choiceText-${index}`}
                        className="input"
                        placeholder={qb('labels.choicePlaceholder', 'Choice {number}', { number: index + 1 })}
                        defaultValue={getChoiceText(questionModal.data, index)}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.modalActions}>
                <button className="btn btn-secondary" type="button" onClick={() => setQuestionModal({ open: false })}>{t('common.cancel', 'Cancel')}</button>
                <button className="btn btn-primary" type="submit">{qb('actions.saveQuestion', 'Save Question')}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
