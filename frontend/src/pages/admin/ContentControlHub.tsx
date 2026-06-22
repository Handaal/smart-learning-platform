import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Reorder } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BookCopy,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Eye,
  FileCheck2,
  Flag,
  FolderKanban,
  GripVertical,
  HelpCircle,
  Languages,
  LayoutTemplate,
  ListChecks,
  Lock,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Wand2,
} from 'lucide-react';
import { quizApi, scenarioApi } from '@/services/api';
import { useI18n } from '@/i18n';
import LessonQuizBuilder, { type LessonQuiz } from '@/components/admin/LessonQuizBuilder';
import {
  ADAPTIVE_POLICY_OVERVIEW,
  ADAPTIVE_SCENARIO_CARDS,
  DEFAULT_COURSE_SHELL,
  fromStoredLessonType,
  generateLessonId,
  generateUnitId,
  getLessonTypeLabel,
  getScenarioTitle,
  LESSON_TYPE_OPTIONS,
  POSTTEST_SAMPLE_QUESTIONS,
  PRETEST_SAMPLE_QUESTIONS,
  RESEARCH_COURSE_KEY,
  SUGGESTED_OUTLINE,
  toStoredLessonType,
  type CoursePublicationStatus,
  type CourseShellDraft,
  type ResearchLessonType,
  validateResearchCourseBuilder,
} from '@/features/courseBuilder/researchCourseBuilder';
import { loadCourseBuilderDraft, saveCourseBuilderDraft } from '@/services/courseBuilderDraft';
import { getAdaptivePlacementMode } from '@/utils/adaptivePlacement';
import styles from './ContentControlHub.module.css';

type BuilderStepKey = 'basic' | 'units' | 'assessments' | 'policy' | 'review';
type PublishStatus = 'draft' | 'published';

type LessonRecord = {
  id: string;
  title: string;
  description: string | null;
  objectives: string[];
  sequenceOrder: number;
  expectedDurationMin?: number | null;
  emotionalTriggerExpected?: string | null;
  lessonType: string;
  status: PublishStatus;
  baseScaffold: number;
};

type ModuleRecord = {
  id: string;
  title: string;
  description: string | null;
  objectives: string[];
  sequenceOrder: number;
  estimatedDurationMin?: number | null;
  primaryCompetency?: string | null;
  status: PublishStatus;
  episodes: LessonRecord[];
};

type LessonDetail = LessonRecord & {
  learningContents: Array<{
    id: string;
    contentType: 'TEXT' | 'VISUAL' | 'VIDEO' | 'ASSESSMENT';
    adaptiveTag?: string | null;
    scaffoldLevel: number;
    isEnrichment: boolean;
    sequenceOrder: number;
    status: PublishStatus;
    contentData: Record<string, unknown>;
  }>;
  quizzes: LessonQuiz[];
};

type ModuleModalState = {
  open: boolean;
  data?: Partial<ModuleRecord>;
};

type LessonModalState = {
  open: boolean;
  data?: Partial<LessonRecord>;
};

type ContentModalState = {
  open: boolean;
  data?: LessonDetail['learningContents'][number];
};

type AuthorableAdaptiveTag =
  | 'baseline'
  | 'confusion'
  | 'frustration'
  | 'boredom_disengagement'
  | 'high_engagement'
  | 'test_anxiety';

const CONTENT_TYPE_OPTIONS: Array<{ value: LessonDetail['learningContents'][number]['contentType']; label: string }> = [
  { value: 'TEXT', label: 'نص / شرح' },
  { value: 'VISUAL', label: 'صورة / ملف / مخطط' },
  { value: 'VIDEO', label: 'فيديو' },
  { value: 'ASSESSMENT', label: 'نشاط / سؤال قصير' },
];

const CONTENT_ADAPTIVE_OPTIONS: Array<{ value: AuthorableAdaptiveTag; label: string }> = [
  { value: 'baseline', label: 'المسار الأساسي' },
  { value: 'confusion', label: 'الارتباك' },
  { value: 'frustration', label: 'الإحباط' },
  { value: 'boredom_disengagement', label: 'الملل / انخفاض الانخراط' },
  { value: 'high_engagement', label: 'الانخراط العالي' },
  { value: 'test_anxiety', label: 'القلق أثناء الاختبار' },
];

const BUILDER_STEPS: Array<{ key: BuilderStepKey; title: string; subtitle: string; icon: typeof BookOpen }> = [
  { key: 'basic', title: 'الخطوة 1', subtitle: 'معلومات المقرر الأساسية', icon: BookOpen },
  { key: 'units', title: 'الخطوة 2', subtitle: 'الوحدات والدروس', icon: FolderKanban },
  { key: 'assessments', title: 'الخطوة 3', subtitle: 'الاختبارات والتقييمات', icon: ClipboardCheck },
  { key: 'policy', title: 'الخطوة 4', subtitle: 'سياسة الدعم التكيفي', icon: ShieldCheck },
  { key: 'review', title: 'الخطوة 5', subtitle: 'المراجعة والنشر', icon: FileCheck2 },
];

function sortModules(modules: ModuleRecord[]) {
  return [...modules]
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    .map((module) => ({
      ...module,
      episodes: [...(module.episodes ?? [])].sort((a, b) => a.sequenceOrder - b.sequenceOrder),
    }));
}

function hasOrderChanged<T extends { id: string }>(current: T[], next: T[]) {
  if (current.length !== next.length) return true;
  return current.some((item, index) => item.id !== next[index]?.id);
}

function totalLessons(modules: ModuleRecord[]) {
  return modules.reduce((sum, module) => sum + module.episodes.length, 0);
}

function flattenLessons(modules: ModuleRecord[]) {
  return modules.flatMap((module) => module.episodes.map((lesson) => ({ ...lesson, moduleId: module.id, moduleTitle: module.title })));
}

function getQuizQuestionCount(quizzes: LessonQuiz[]) {
  return quizzes.reduce((sum, quiz) => sum + quiz.questions.length, 0);
}

function lessonTypeBadge(type: string) {
  return getLessonTypeLabel(fromStoredLessonType(type));
}

function getSuggestedScenarioKeys(type: ResearchLessonType) {
  switch (type) {
    case 'introduction':
      return ['neutral', 'boredom_disengagement'] as const;
    case 'core_lesson':
      return ['confusion', 'boredom_disengagement'] as const;
    case 'interactive_activity':
      return ['frustration', 'high_engagement'] as const;
    case 'case_scenario':
      return ['confusion', 'frustration', 'high_engagement'] as const;
    case 'assessment_checkpoint':
      return ['test_anxiety', 'high_engagement'] as const;
    case 'summary_closure':
      return ['neutral', 'high_engagement'] as const;
    default:
      return ['confusion'] as const;
  }
}

function getLessonAdaptiveGuidance(type: ResearchLessonType) {
  switch (type) {
    case 'introduction':
      return 'هذا النوع يهيئ المسار الأساسي غالبًا. إذا طال العرض النظري قد يكون الملل/انخفاض الانخراط هو السيناريو الأقرب.';
    case 'core_lesson':
      return 'هذا النوع يناسب دروس الفهم والتفسير. غالبًا نربطه بسيناريو الارتباك عند وجود مفاهيم أو خطوات تحتاج دعماً إضافياً.';
    case 'interactive_activity':
      return 'هذا النوع يناسب المهام التطبيقية. غالبًا نربطه بالإحباط عند تكرار الخطأ، أو بالانخراط العالي عند الأداء القوي.';
    case 'case_scenario':
      return 'هذا النوع يناسب الحالات والقرارات. يمكن ربطه بالارتباك أو الإحباط أو الانخراط العالي بحسب صعوبة المهمة وسلوك المتعلم.';
    case 'assessment_checkpoint':
      return 'هذا النوع يرتبط غالبًا بالقلق أثناء الاختبار، مع إبقاء مسار الانخراط العالي متاحًا لمن يحقق أداءً مستقراً.';
    case 'summary_closure':
      return 'هذا النوع يخدم التثبيت والإغلاق. عادة لا يحتاج دعماً انفعالياً مباشرًا إلا إذا أردت تعزيز الانخراط العالي أو إبقاء المسار الأساسي فقط.';
    default:
      return 'اختر نوع الدرس أولًا، ثم حدد السيناريو المتوقع إذا أردت أن يكون هذا الدرس مرجعًا واضحًا لربط عناصر الدعم داخله.';
  }
}

function parseObjectives(value: FormDataEntryValue | null) {
  return String(value ?? '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function asText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function asBoolean(value: unknown) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function getContentTitle(content: LessonDetail['learningContents'][number]) {
  return (
    asText(content.contentData.title) ||
    asText(content.contentData.question) ||
    asText(content.contentData.prompt) ||
    asText(content.contentData.caption) ||
    `${content.sequenceOrder}. ${content.contentType}`
  );
}

function getContentBodyPreview(content: LessonDetail['learningContents'][number]) {
  return (
    asText(content.contentData.text) ||
    asText(content.contentData.prompt) ||
    asText(content.contentData.description) ||
    asText(content.contentData.caption) ||
    asText(content.contentData.url)
  );
}

function getContentTypeLabel(type: LessonDetail['learningContents'][number]['contentType']) {
  return CONTENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

function getAdaptiveLabel(value: string | null | undefined) {
  const normalized = String(value ?? 'baseline').trim() || 'baseline';
  if (normalized === 'baseline') return 'المسار الأساسي';
  return getScenarioTitle(normalized as any);
}

function StatusChip({ status }: { status: PublishStatus | CoursePublicationStatus }) {
  return (
    <span className={`${styles.statusChip} ${status === 'published' ? styles.statusPublished : styles.statusDraft}`}>
      {status === 'published' ? 'منشور' : 'مسودة'}
    </span>
  );
}

function CountChip({ label, value, tone = 'neutral' }: { label: string; value: string | number; tone?: 'neutral' | 'success' | 'warning' }) {
  return (
    <span
      className={`${styles.countChip} ${
        tone === 'success' ? styles.countChipSuccess : tone === 'warning' ? styles.countChipWarning : ''
      }`}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
  );
}

function FieldHint({ label, hint }: { label: string; hint: string }) {
  return (
    <span className={styles.fieldLabel}>
      <span>{label}</span>
      <span className={styles.hintWrap}>
        <span
          className={styles.hintTrigger}
          tabIndex={0}
          role="button"
          aria-label={`شرح الحقل: ${label}`}
          title={hint}
        >
          <HelpCircle size={15} />
        </span>
        <span className={styles.hintBubble} role="tooltip">
          {hint}
        </span>
      </span>
    </span>
  );
}

export default function ContentControlHub() {
  const { isRtl, direction } = useI18n();
  const queryClient = useQueryClient();

  const [builderDraft, setBuilderDraft] = useState<CourseShellDraft>(() => loadCourseBuilderDraft());
  const [selectedStep, setSelectedStep] = useState<BuilderStepKey>('basic');
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [moduleModal, setModuleModal] = useState<ModuleModalState>({ open: false });
  const [lessonModal, setLessonModal] = useState<LessonModalState>({ open: false });
  const [contentModal, setContentModal] = useState<ContentModalState>({ open: false });
  const [lessonTypePreview, setLessonTypePreview] = useState<ResearchLessonType>('core_lesson');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [openAssessmentPanels, setOpenAssessmentPanels] = useState({
    pre: true,
    post: true,
    unit: false,
    lesson: true,
  });
  const courseKey = RESEARCH_COURSE_KEY;

  useEffect(() => {
    saveCourseBuilderDraft(builderDraft);
  }, [builderDraft]);

  const modulesQuery = useQuery({
    queryKey: ['builder-modules'],
    queryFn: async () => {
      const response = (await scenarioApi.listModules()) as { data: ModuleRecord[] };
      return sortModules(response.data ?? []);
    },
  });

  const pretestQuery = useQuery({
    queryKey: ['builder-pretest', courseKey],
    queryFn: async () => {
      const response = (await quizApi.listQuizzes({ scope: 'pretest', courseKey })) as { data: LessonQuiz[] };
      return [...(response.data ?? [])].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    },
  });

  const posttestQuery = useQuery({
    queryKey: ['builder-posttest', courseKey],
    queryFn: async () => {
      const response = (await quizApi.listQuizzes({ scope: 'posttest', courseKey })) as { data: LessonQuiz[] };
      return [...(response.data ?? [])].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    },
  });

  const unitAssessmentsQuery = useQuery({
    queryKey: ['builder-unit-quizzes'],
    queryFn: async () => {
      const response = (await quizApi.listQuizzes({ scope: 'unit' })) as { data: LessonQuiz[] };
      return [...(response.data ?? [])].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    },
  });

  const lessonAssessmentsQuery = useQuery({
    queryKey: ['builder-lesson-quizzes'],
    queryFn: async () => {
      const response = (await quizApi.listQuizzes({ scope: 'lesson' })) as { data: LessonQuiz[] };
      return [...(response.data ?? [])].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    },
  });

  const selectedLessonDetailQuery = useQuery({
    queryKey: ['builder-lesson-detail', selectedLessonId],
    enabled: Boolean(selectedLessonId),
    queryFn: async () => {
      const response = (await scenarioApi.getEpisode(selectedLessonId!)) as { data: LessonDetail };
      return response.data;
    },
  });

  const modules = modulesQuery.data ?? [];
  const pretests = pretestQuery.data ?? [];
  const posttests = posttestQuery.data ?? [];
  const unitAssessments = unitAssessmentsQuery.data ?? [];
  const lessonAssessments = lessonAssessmentsQuery.data ?? [];
  const selectedModule = modules.find((module) => module.id === selectedModuleId) ?? modules[0] ?? null;
  const selectedLesson =
    selectedModule?.episodes.find((lesson) => lesson.id === selectedLessonId) ??
    selectedModule?.episodes[0] ??
    null;
  const selectedLessonDetail = selectedLessonDetailQuery.data ?? null;
  const selectedModuleUnitAssessments = selectedModule
    ? unitAssessments.filter((quiz) => quiz.moduleId === selectedModule.id)
    : [];
  const selectedLessonContents = [...(selectedLessonDetail?.learningContents ?? [])].sort(
    (a, b) => a.sequenceOrder - b.sequenceOrder,
  );
  const selectedLessonScenarioTitle = selectedLesson?.emotionalTriggerExpected
    ? getScenarioTitle(selectedLesson.emotionalTriggerExpected as any)
    : null;
  const suggestedScenarioTitles = getSuggestedScenarioKeys(lessonTypePreview).map((key) => getScenarioTitle(key));

  useEffect(() => {
    if (!modules.length) {
      setSelectedModuleId(null);
      setSelectedLessonId(null);
      return;
    }

    if (!selectedModuleId || !modules.some((module) => module.id === selectedModuleId)) {
      setSelectedModuleId(modules[0].id);
      setSelectedLessonId(modules[0].episodes[0]?.id ?? null);
      return;
    }

    const currentModule = modules.find((module) => module.id === selectedModuleId);
    if (!currentModule) return;

    if (!selectedLessonId || !currentModule.episodes.some((lesson) => lesson.id === selectedLessonId)) {
      setSelectedLessonId(currentModule.episodes[0]?.id ?? null);
    }
  }, [modules, selectedLessonId, selectedModuleId]);

  useEffect(() => {
    if (!lessonModal.open) return;
    setLessonTypePreview(lessonModal.data?.lessonType ? fromStoredLessonType(lessonModal.data.lessonType) : 'core_lesson');
  }, [lessonModal]);

  const validation = useMemo(
    () =>
      validateResearchCourseBuilder({
        draft: builderDraft,
        modules,
        pretests,
        posttests,
      }),
    [builderDraft, modules, posttests, pretests],
  );

  const lessonCount = totalLessons(modules);
  const stepIndex = BUILDER_STEPS.findIndex((step) => step.key === selectedStep);
  const canGoBack = stepIndex > 0;
  const canGoNext = stepIndex < BUILDER_STEPS.length - 1;

  async function refreshBuilderData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['builder-modules'] }),
      queryClient.invalidateQueries({ queryKey: ['builder-pretest', courseKey] }),
      queryClient.invalidateQueries({ queryKey: ['builder-posttest', courseKey] }),
      queryClient.invalidateQueries({ queryKey: ['builder-unit-quizzes'] }),
      queryClient.invalidateQueries({ queryKey: ['builder-lesson-quizzes'] }),
      queryClient.invalidateQueries({ queryKey: ['builder-lesson-detail', selectedLessonId] }),
    ]);
  }

  async function handleSaveModule(form: FormData) {
    const title = String(form.get('title') ?? '').trim();
    const description = String(form.get('description') ?? '').trim();
    const estimatedDurationMin = Number(form.get('estimatedDurationMin') ?? 0) || null;
    const objectives = parseObjectives(form.get('objectives'));

    if (!title) return;

    if (moduleModal.data?.id) {
      await scenarioApi.updateModule(moduleModal.data.id, {
        title,
        description: description || null,
        objectives,
        estimatedDurationMin,
        status: moduleModal.data.status ?? 'draft',
      });
    } else {
      const nextOrder = (modules[modules.length - 1]?.sequenceOrder ?? 0) + 1;
      await scenarioApi.createModule({
        id: generateUnitId(nextOrder),
        title,
        description: description || null,
        objectives,
        estimatedDurationMin,
        sequenceOrder: nextOrder,
        status: 'draft',
      });
    }

    setModuleModal({ open: false });
    await refreshBuilderData();
  }

  async function handleSaveLesson(form: FormData) {
    const moduleId = selectedModuleId;
    if (!moduleId) return;

    const title = String(form.get('title') ?? '').trim();
    const description = String(form.get('description') ?? '').trim();
    const expectedDurationMin = Number(form.get('expectedDurationMin') ?? 0) || null;
    const objective = String(form.get('objective') ?? '').trim();
    const lessonType = String(form.get('lessonType') ?? 'core_lesson') as ResearchLessonType;
    const emotionalTriggerExpected = String(form.get('emotionalTriggerExpected') ?? '').trim();

    if (!title) return;

    if (lessonModal.data?.id) {
      await scenarioApi.updateEpisode(lessonModal.data.id, {
        title,
        description: description || null,
        objectives: objective ? [objective] : [],
        expectedDurationMin,
        emotionalTriggerExpected: emotionalTriggerExpected || null,
        lessonType: toStoredLessonType(lessonType),
        status: lessonModal.data.status ?? 'draft',
      });
    } else {
      const selectedModuleEpisodes = selectedModule?.episodes ?? [];
      const nextOrder = (selectedModuleEpisodes[selectedModuleEpisodes.length - 1]?.sequenceOrder ?? 0) + 1;
      await scenarioApi.createEpisode({
        id: generateLessonId(moduleId, nextOrder),
        moduleId,
        title,
        description: description || null,
        objectives: objective ? [objective] : [],
        sequenceOrder: nextOrder,
        expectedDurationMin,
        baseScaffold: 3,
        emotionalTriggerExpected: emotionalTriggerExpected || null,
        lessonType: toStoredLessonType(lessonType),
        status: 'draft',
      });
    }

    setLessonModal({ open: false });
    await refreshBuilderData();
  }

  async function handleDeleteModule(moduleId: string) {
    if (!window.confirm('سيتم حذف الوحدة وكل ما تحتويه من دروس. هل تريد المتابعة؟')) return;
    await scenarioApi.deleteModule(moduleId);
    await refreshBuilderData();
  }

  async function handleDeleteLesson(lessonId: string) {
    if (!window.confirm('سيتم حذف هذا الدرس. هل تريد المتابعة؟')) return;
    await scenarioApi.deleteEpisode(lessonId);
    await refreshBuilderData();
  }

  async function handleSaveContent(form: FormData) {
    if (!selectedLessonId) return;

    const contentType = String(form.get('contentType') ?? 'TEXT').trim() as LessonDetail['learningContents'][number]['contentType'];
    const adaptiveTag = String(form.get('adaptiveTag') ?? 'baseline').trim() as AuthorableAdaptiveTag;
    const title = String(form.get('contentTitle') ?? '').trim();
    const body = String(form.get('contentBody') ?? '').trim();
    const url = String(form.get('resourceUrl') ?? '').trim();
    const taskContextKey = String(form.get('taskContextKey') ?? '').trim();
    const placementMode = String(form.get('placementMode') ?? 'after').trim();
    const scaffoldLevel = Number(form.get('scaffoldLevel') ?? 3) || 3;
    const sequenceOrder =
      Number(form.get('sequenceOrder') ?? contentModal.data?.sequenceOrder ?? selectedLessonContents.length + 1) ||
      selectedLessonContents.length + 1;
    const isEnrichment = form.get('isEnrichment') === 'on';

    const contentData: Record<string, unknown> = {
      ...(contentModal.data?.contentData ?? {}),
      title,
      autoGenerated: false,
    };

    if (body) {
      if (contentType === 'ASSESSMENT') {
        contentData.question = title || body;
        contentData.prompt = body;
      } else {
        contentData.text = body;
      }
    } else {
      delete contentData.text;
      delete contentData.prompt;
      delete contentData.question;
    }

    if (url) {
      contentData.url = url;
      contentData.resourceUrl = url;
    } else {
      delete contentData.url;
      delete contentData.resourceUrl;
    }

    if (taskContextKey) {
      contentData.taskContextKey = taskContextKey;
    } else {
      delete contentData.taskContextKey;
    }

    contentData.journeyPlacementMode = adaptiveTag === 'baseline' ? 'baseline' : placementMode;

    if (contentModal.data?.id) {
      await scenarioApi.updateContent(contentModal.data.id, {
        contentType,
        adaptiveTag,
        scaffoldLevel,
        isEnrichment,
        sequenceOrder,
        contentData,
        status: contentModal.data.status,
      });
    } else {
      await scenarioApi.uploadContent({
        episodeId: selectedLessonId,
        contentType,
        adaptiveTag,
        scaffoldLevel,
        isEnrichment,
        contentData,
        status: selectedLesson?.status ?? 'draft',
      });
    }

    setContentModal({ open: false });
    await refreshBuilderData();
  }

  async function handleDeleteContent(contentId: string) {
    if (!window.confirm('سيتم حذف مكوّن الدرس الحالي. هل تريد المتابعة؟')) return;
    await scenarioApi.deleteContent(contentId);
    await refreshBuilderData();
  }

  async function handleReorderModules(nextItems: ModuleRecord[]) {
    if (!hasOrderChanged(modules, nextItems)) return;
    await scenarioApi.reorder(
      nextItems.map((module, index) => ({ type: 'module', id: module.id, sequenceOrder: index + 1 })),
    );
    await refreshBuilderData();
  }

  async function handleReorderLessons(nextItems: LessonRecord[]) {
    if (!selectedModule) return;
    if (!hasOrderChanged(selectedModule.episodes, nextItems)) return;
    await scenarioApi.reorder(
      nextItems.map((lesson, index) => ({ type: 'episode', id: lesson.id, sequenceOrder: index + 1 })),
    );
    await refreshBuilderData();
  }

  async function createResearchAssessment(scope: 'pretest' | 'posttest') {
    const existing = scope === 'pretest' ? pretests : posttests;
    if (existing.length > 0 && !window.confirm('يوجد اختبار مُنشأ بالفعل لهذا النوع. هل تريد إضافة نموذج جديد بجانبه؟')) {
      return;
    }

    const title = scope === 'pretest' ? 'الاختبار القبلي' : 'الاختبار البعدي';
    const description =
      scope === 'pretest'
        ? 'أداة بحثية إلزامية لقياس مستوى المتعلم قبل البدء في البرنامج.'
        : 'أداة بحثية إلزامية لقياس مستوى المتعلم بعد إتمام البرنامج.';
    const questionSet = scope === 'pretest' ? PRETEST_SAMPLE_QUESTIONS : POSTTEST_SAMPLE_QUESTIONS;

    const quizResponse = (await quizApi.createQuiz({
      title,
      description,
      scope,
      courseKey,
      passingScore: 70,
      attemptLimit: 1,
      showExplanationAfterSubmit: true,
      allowRetry: false,
      adaptiveOnFail: null,
      adaptiveOnPass: null,
      isPublished: false,
    })) as { data: { id: string } };

    for (const question of questionSet) {
      if (question.questionType === 'true_false') {
        const correctBoolean = question.choices.find((choice) => choice.isCorrect)?.choiceText.toLowerCase() === 'true';
        await quizApi.createQuestion(quizResponse.data.id, {
          questionType: 'true_false',
          questionText: question.questionText,
          explanation: question.explanation,
          hint: question.hint ?? null,
          dimension: null,
          weight: 1,
          correctBoolean,
        });
        continue;
      }

      await quizApi.createQuestion(quizResponse.data.id, {
        questionType: 'mcq',
        questionText: question.questionText,
        explanation: question.explanation,
        hint: question.hint ?? null,
        dimension: null,
        weight: 1,
        choices: question.choices,
      });
    }

    await refreshBuilderData();
    setOpenAssessmentPanels((current) => ({
      ...current,
      [scope === 'pretest' ? 'pre' : 'post']: true,
    }));
  }

  async function applySuggestedOutline() {
    const proceed = window.confirm(
      modules.length > 0
        ? 'سيتم استبدال الهيكل الحالي بالكامل بالهيكل المقترح، مع حذف الوحدات والدروس القديمة وإنشاء الدروس المعتمدة بمحتوى أولي صالح للتشغيل داخل حسابات المتدربين. هل تريد المتابعة؟'
        : 'سيتم إنشاء الهيكل المقترح كوحدات ودروس معتمدة وجاهزة للتشغيل. هل تريد المتابعة؟',
    );
    if (!proceed) return;

    await scenarioApi.applySuggestedOutline({
      units: SUGGESTED_OUTLINE,
      publicationStatus: 'published',
    });

    await refreshBuilderData();
    setSelectedModuleId(generateUnitId(1));
    setSelectedLessonId(generateLessonId(generateUnitId(1), 1));
  }

  async function handlePublish() {
    if (validation.blocking.length) {
      setSelectedStep('review');
      window.alert(`لا يمكن النشر الآن:\n- ${validation.blocking.join('\n- ')}`);
      return;
    }

    await Promise.all(
      modules.map((module) =>
        scenarioApi.updateModule(module.id, {
          status: 'published',
        }),
      ),
    );

    await Promise.all(
      flattenLessons(modules).map((lesson) =>
        scenarioApi.updateEpisode(lesson.id, {
          status: 'published',
        }),
      ),
    );

    await Promise.all(
      [...pretests, ...posttests, ...unitAssessments, ...lessonAssessments].map((quiz) =>
        quizApi.updateQuiz(quiz.id, {
          isPublished: true,
        }),
      ),
    );

    const nextDraft = { ...builderDraft, publicationStatus: 'published' as const };
    setBuilderDraft(nextDraft);
    saveCourseBuilderDraft(nextDraft);
    await refreshBuilderData();
    window.alert('تم تحديث حالة النشر بنجاح. المقرر الآن جاهز كنسخة منشورة.');
  }

  function handleSaveDraft() {
    const nextDraft = { ...builderDraft, publicationStatus: 'draft' as const };
    setBuilderDraft(nextDraft);
    saveCourseBuilderDraft(nextDraft);
    window.alert('تم حفظ مسودة إعدادات المقرر.');
  }

  const summaryChips = (
    <>
      <CountChip label="عدد الوحدات" value={modules.length} />
      <CountChip label="عدد الدروس" value={lessonCount} />
      <CountChip
        label="الاختبار القبلي"
        value={pretests.length ? 'مضاف' : 'مفقود'}
        tone={pretests.length ? 'success' : 'warning'}
      />
      <CountChip
        label="الاختبار البعدي"
        value={posttests.length ? 'مضاف' : 'مفقود'}
        tone={posttests.length ? 'success' : 'warning'}
      />
      <CountChip label="تقييمات الوحدات" value={unitAssessments.length} />
      <CountChip label="اختبارات الدروس" value={lessonAssessments.length} />
      <CountChip label="حالة النشر" value={builderDraft.publicationStatus === 'published' ? 'منشور' : 'مسودة'} />
    </>
  );

  return (
    <div className={styles.page} dir={direction}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>المقررات والدروس</span>
          <h1>المقررات والدروس</h1>
          <p>
            تجربة تأليف نظيفة وموجّهة لبناء المقرر البحثي خطوة بخطوة: معلومات أساسية، هيكل الوحدات والدروس، الاختبارات،
            سياسة الدعم التكيفي، ثم المراجعة والنشر.
          </p>
        </div>
        <div className={styles.heroMeta}>
          {summaryChips}
        </div>
      </section>

      <div className={styles.layout}>
        <aside className={styles.stepRail}>
          <div className={styles.railCard}>
            <div className={styles.railHead}>
              <LayoutTemplate size={18} />
              <div>
                <strong>تدفق البناء</strong>
                <p>خمس خطوات قصيرة بدل صفحة مؤلف طويلة ومشتتة.</p>
              </div>
            </div>

            <div className={styles.stepList}>
              {BUILDER_STEPS.map((step, index) => {
                const Icon = step.icon;
                const active = selectedStep === step.key;
                return (
                  <button
                    key={step.key}
                    type="button"
                    className={`${styles.stepButton} ${active ? styles.stepButtonActive : ''}`}
                    onClick={() => setSelectedStep(step.key)}
                  >
                    <span className={styles.stepIndex}>{index + 1}</span>
                    <span className={styles.stepIcon}><Icon size={16} /></span>
                    <span className={styles.stepCopy}>
                      <strong>{step.subtitle}</strong>
                      <small>{step.title}</small>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className={styles.validationBox}>
              <div className={styles.validationHead}>
                <Flag size={15} />
                <strong>التحقق السريع</strong>
              </div>
              <ul>
                <li>{validation.checks.hasUnits ? '✔' : '•'} وحدات المقرر</li>
                <li>{validation.checks.hasLessons ? '✔' : '•'} دروس المقرر</li>
                <li>{validation.checks.hasPreTest ? '✔' : '•'} الاختبار القبلي</li>
                <li>{validation.checks.hasPostTest ? '✔' : '•'} الاختبار البعدي</li>
              </ul>
            </div>
          </div>
        </aside>

        <main className={styles.workspace}>
          {selectedStep === 'basic' ? (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.sectionEyebrow}>الخطوة 1</span>
                  <h2>معلومات المقرر الأساسية</h2>
                  <p>هذه الخطوة مخصصة فقط لبيانات المقرر الأساسية، بدون خلطها بالتكيف أو الاختبارات أو عناصر المحتوى الدقيقة.</p>
                </div>
                <StatusChip status={builderDraft.publicationStatus} />
              </div>

              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>عنوان المقرر</span>
                  <input
                    className="input"
                    value={builderDraft.title}
                    onChange={(event) => setBuilderDraft((current) => ({ ...current, title: event.target.value }))}
                  />
                </label>
                <label className={styles.field}>
                  <span>الفئة المستهدفة</span>
                  <input
                    className="input"
                    value={builderDraft.targetAudience}
                    onChange={(event) => setBuilderDraft((current) => ({ ...current, targetAudience: event.target.value }))}
                  />
                </label>
              </div>

              <label className={styles.field}>
                <span>الوصف المختصر</span>
                <textarea
                  className="input"
                  rows={4}
                  value={builderDraft.description}
                  onChange={(event) => setBuilderDraft((current) => ({ ...current, description: event.target.value }))}
                />
              </label>

              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>لغة المقرر</span>
                  <select
                    className="input"
                    value={builderDraft.language}
                    onChange={(event) => setBuilderDraft((current) => ({ ...current, language: event.target.value }))}
                  >
                    <option value="العربية">العربية</option>
                    <option value="English">English</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>المدة التقديرية الإجمالية</span>
                  <input
                    className="input"
                    value={builderDraft.estimatedDuration}
                    onChange={(event) => setBuilderDraft((current) => ({ ...current, estimatedDuration: event.target.value }))}
                  />
                </label>
              </div>

              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>صورة غلاف / رابط بصري اختياري</span>
                  <input
                    className="input"
                    value={builderDraft.coverUrl}
                    placeholder="https://..."
                    onChange={(event) => setBuilderDraft((current) => ({ ...current, coverUrl: event.target.value }))}
                  />
                </label>
                <label className={styles.field}>
                  <span>نوع المقرر</span>
                  <input className="input" value="مقرر تدريبي بحثي" readOnly />
                </label>
              </div>

              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>حالة النشر المستهدفة</span>
                  <select
                    className="input"
                    value={builderDraft.publicationStatus}
                    onChange={(event) =>
                      setBuilderDraft((current) => ({
                        ...current,
                        publicationStatus: event.target.value as CoursePublicationStatus,
                      }))
                    }
                  >
                    <option value="draft">مسودة</option>
                    <option value="published">منشور</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>ملاحظات التجهيز</span>
                  <input className="input" value="الاختبار القبلي والبعدي مطلوبان قبل النشر" readOnly />
                </label>
              </div>

              <div className={styles.infoStrip}>
                <Languages size={16} />
                <p>
                  الإعدادات الافتراضية الحالية: اللغة = العربية، نوع المقرر = مقرر تدريبي بحثي، حالة النشر = مسودة.
                </p>
              </div>
            </section>
          ) : null}

          {selectedStep === 'units' ? (
            <>
              <section className={styles.sectionCard}>
                <div className={styles.sectionHead}>
                  <div>
                    <span className={styles.sectionEyebrow}>الخطوة 2</span>
                    <h2>الوحدات والدروس</h2>
                    <p>هيكل بسيط يبدأ بالوحدة ثم الدرس. الاقتراحات أدناه مستخلصة من محتوى المشروع والملفات المرجعية الحالية.</p>
                  </div>
                  <button type="button" className="btn btn-secondary" onClick={() => void applySuggestedOutline()}>
                    <Wand2 size={14} />
                    اعتماد الهيكل المقترح
                  </button>
                </div>

                <div className={styles.suggestionGrid}>
                  {SUGGESTED_OUTLINE.map((unit) => (
                    <article key={unit.title} className={styles.suggestionCard}>
                      <div className={styles.suggestionHead}>
                        <BookCopy size={16} />
                        <strong>{unit.title}</strong>
                      </div>
                      <p>{unit.shortSummary}</p>
                      <div className={styles.suggestionMeta}>
                        <CountChip label="الدروس المقترحة" value={unit.lessons.length} />
                        <CountChip label="المدة" value={`${unit.estimatedDurationMin} د`} />
                      </div>
                      <details className={styles.suggestionDetails}>
                        <summary>عرض الدروس المقترحة</summary>
                        <ul>
                          {unit.lessons.map((lesson) => (
                            <li key={lesson.title}>
                              <strong>{lesson.title}</strong>
                              <span>{getLessonTypeLabel(lesson.lessonType)}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </article>
                  ))}
                </div>
              </section>

              <section className={styles.sectionCard}>
                <div className={styles.sectionHead}>
                  <div>
                    <h3>هيكل المقرر الحالي</h3>
                    <p>أضف الوحدات والدروس بسرعة، ثم أعد ترتيبها عند الحاجة. لا نعرض هنا خرائط مسارات قديمة أو إعدادات فروع متشظية.</p>
                  </div>
                  <button type="button" className="btn btn-primary" onClick={() => setModuleModal({ open: true })}>
                    <Plus size={14} />
                    إضافة وحدة
                  </button>
                </div>

                {modulesQuery.isLoading ? (
                  <div className={styles.emptyState}>جاري تحميل هيكل المقرر...</div>
                ) : modules.length ? (
                  <div className={styles.structureLayout}>
                    <div className={styles.structureColumn}>
                      <Reorder.Group axis="y" values={modules} onReorder={(items) => void handleReorderModules(items)} className={styles.reorderList}>
                        {modules.map((module) => {
                          const active = selectedModuleId === module.id;
                          return (
                            <Reorder.Item key={module.id} value={module} className={styles.reorderItem}>
                              <article className={`${styles.unitCard} ${active ? styles.unitCardActive : ''}`}>
                                <button type="button" className={styles.unitButton} onClick={() => setSelectedModuleId(module.id)}>
                                  <GripVertical size={14} className={styles.dragHandle} />
                                  <div className={styles.unitCopy}>
                                    <div className={styles.unitTop}>
                                      <strong>{module.title}</strong>
                                      <StatusChip status={module.status} />
                                    </div>
                                    <p>{module.description || 'أضف وصفًا قصيرًا يوضح وظيفة هذه الوحدة داخل البرنامج.'}</p>
                                    <div className={styles.inlineMeta}>
                                      <CountChip label="الدروس" value={module.episodes.length} />
                                      <CountChip label="المدة" value={`${module.estimatedDurationMin ?? 0} د`} />
                                    </div>
                                  </div>
                                </button>
                                <div className={styles.cardActions}>
                                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModuleModal({ open: true, data: module })}>تعديل</button>
                                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => void handleDeleteModule(module.id)}>
                                    <Trash2 size={12} />
                                    حذف
                                  </button>
                                </div>
                              </article>
                            </Reorder.Item>
                          );
                        })}
                      </Reorder.Group>
                    </div>

                    <div className={styles.detailColumn}>
                      {selectedModule ? (
                        <>
                          <div className={styles.detailHeader}>
                            <div>
                              <span className={styles.sectionEyebrow}>الوحدة المحددة</span>
                              <h3>{selectedModule.title}</h3>
                              <p>{selectedModule.description || 'يمكنك كتابة هدف مختصر لهذه الوحدة ليتضح مسارها داخل البرنامج.'}</p>
                            </div>
                            <button type="button" className="btn btn-secondary" onClick={() => setLessonModal({ open: true })}>
                              <Plus size={14} />
                              إضافة درس
                            </button>
                          </div>

                          {selectedModule.episodes.length ? (
                            <Reorder.Group
                              axis="y"
                              values={selectedModule.episodes}
                              onReorder={(items) => void handleReorderLessons(items)}
                              className={styles.lessonList}
                            >
                              {selectedModule.episodes.map((lesson) => {
                                const active = selectedLessonId === lesson.id;
                                return (
                                  <Reorder.Item key={lesson.id} value={lesson} className={styles.reorderItem}>
                                    <article className={`${styles.lessonCard} ${active ? styles.lessonCardActive : ''}`}>
                                      <button type="button" className={styles.lessonButton} onClick={() => setSelectedLessonId(lesson.id)}>
                                        <GripVertical size={14} className={styles.dragHandle} />
                                        <div className={styles.lessonCopy}>
                                          <div className={styles.unitTop}>
                                            <strong>{lesson.title}</strong>
                                            <StatusChip status={lesson.status} />
                                          </div>
                                          <p>{lesson.objectives?.[0] || lesson.description || 'أضف هدفًا قصيرًا لهذا الدرس.'}</p>
                                          <div className={styles.inlineMeta}>
                                            <CountChip label="النوع" value={lessonTypeBadge(lesson.lessonType)} />
                                            <CountChip label="المدة" value={`${lesson.expectedDurationMin ?? 0} د`} />
                                          </div>
                                        </div>
                                      </button>
                                      <div className={styles.cardActions}>
                                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLessonModal({ open: true, data: lesson })}>تعديل</button>
                                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void handleDeleteLesson(lesson.id)}>
                                          <Trash2 size={12} />
                                          حذف
                                        </button>
                                      </div>
                                    </article>
                                  </Reorder.Item>
                                );
                              })}
                            </Reorder.Group>
                          ) : (
                            <div className={styles.emptyState}>لا توجد دروس داخل هذه الوحدة بعد. أضف أول درس للبدء.</div>
                          )}

                          <div className={styles.lessonContentPanel}>
                            <div className={styles.detailHeader}>
                              <div>
                                <span className={styles.sectionEyebrow}>مكونات الدرس</span>
                                <h3>{selectedLesson ? `عناصر ${selectedLesson.title}` : 'اختر درسًا أولًا'}</h3>
                                <p>
                                  أضف من هنا عناصر الدرس الفعلية: نص، صورة/ملف، فيديو، أو نشاط قصير. ويمكنك أيضًا
                                  ربط كل عنصر بالمسار الأساسي أو بسيناريو تكيفي محدد.
                                </p>
                              </div>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setContentModal({ open: true })}
                                disabled={!selectedLesson}
                              >
                                <Plus size={14} />
                                إضافة مكوّن
                              </button>
                            </div>

                            {selectedLesson ? (
                              selectedLessonContents.length ? (
                                <div className={styles.contentList}>
                                  {selectedLessonContents.map((content) => (
                                    <article key={content.id} className={styles.contentCard}>
                                      <div className={styles.contentCardHead}>
                                        <div>
                                          <strong>{getContentTitle(content)}</strong>
                                          <p>{getContentBodyPreview(content) || 'مكوّن جاهز للتحرير والتخصيص.'}</p>
                                        </div>
                                        <StatusChip status={content.status} />
                                      </div>
                                      <div className={styles.inlineMeta}>
                                        <CountChip label="النوع" value={getContentTypeLabel(content.contentType)} />
                                        <CountChip label="المسار" value={getAdaptiveLabel(content.adaptiveTag)} />
                                        <CountChip
                                          label="موضع الظهور"
                                          value={
                                            getAdaptivePlacementMode(content) === 'baseline'
                                              ? 'أساسي'
                                              : getAdaptivePlacementMode(content) === 'before'
                                                ? 'قبل'
                                                : getAdaptivePlacementMode(content) === 'instead'
                                                  ? 'بدل'
                                                  : 'بعد'
                                          }
                                        />
                                        <CountChip label="الترتيب" value={content.sequenceOrder} />
                                      </div>
                                      <div className={styles.cardActions}>
                                        <button
                                          type="button"
                                          className="btn btn-ghost btn-sm"
                                          onClick={() => setContentModal({ open: true, data: content })}
                                        >
                                          تعديل
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-ghost btn-sm"
                                          onClick={() => void handleDeleteContent(content.id)}
                                        >
                                          <Trash2 size={12} />
                                          حذف
                                        </button>
                                      </div>
                                    </article>
                                  ))}
                                </div>
                              ) : (
                                <div className={styles.emptyState}>
                                  لا توجد مكونات لهذا الدرس بعد. اضغط "إضافة مكوّن" لبدء بناء محتوى الدرس وربطه
                                  بالمسار الأساسي أو السيناريو التكيفي المطلوب.
                                </div>
                              )
                            ) : (
                              <div className={styles.emptyState}>اختر درسًا من القائمة أولًا حتى تتمكن من إضافة مكوناته.</div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className={styles.emptyState}>ابدأ بإضافة وحدة جديدة أو اختر وحدة موجودة لمتابعة تحريرها.</div>
                      )}
                    </div>

                    <div className={styles.infoColumn}>
                      <div className={styles.infoCard}>
                        <div className={styles.infoHead}>
                          <ListChecks size={16} />
                          <strong>ملخص الدرس المحدد</strong>
                        </div>
                        {selectedLesson ? (
                          <div className={styles.infoStack}>
                            <div>
                              <span>العنوان</span>
                              <strong>{selectedLesson.title}</strong>
                            </div>
                            <div>
                              <span>الهدف المختصر</span>
                              <strong>{selectedLesson.objectives?.[0] || selectedLesson.description || 'لم يُكتب بعد'}</strong>
                            </div>
                            <div>
                              <span>نوع الدرس</span>
                              <strong>{lessonTypeBadge(selectedLesson.lessonType)}</strong>
                            </div>
                            <div>
                              <span>السيناريو التكيفي المتوقع</span>
                              <strong>{selectedLessonScenarioTitle ?? 'لم يُحدَّد بعد'}</strong>
                            </div>
                            <div>
                              <span>المدة</span>
                              <strong>{selectedLesson.expectedDurationMin ?? 0} دقيقة</strong>
                            </div>
                            <div>
                              <span>عدد عناصر المحتوى الحالية</span>
                              <strong>{selectedLessonDetail?.learningContents?.length ?? 0}</strong>
                            </div>
                            <div>
                              <span>اختبارات الدرس الحالية</span>
                              <strong>{selectedLessonDetail?.quizzes?.length ?? 0}</strong>
                            </div>
                          </div>
                        ) : (
                          <p>اختر درسًا من القائمة لإظهار ملخصه هنا.</p>
                        )}
                      </div>

                      <div className={styles.infoCard}>
                        <div className={styles.infoHead}>
                          <Sparkles size={16} />
                          <strong>لماذا هذا التصميم أبسط؟</strong>
                        </div>
                        <ul className={styles.simpleList}>
                          <li>نبني الهيكل أولًا، قبل الدخول في تفاصيل دقيقة أو إعدادات مشتتة.</li>
                          <li>لا توجد خريطة فروع قديمة أو محرر مسارات انفعالية متشعب داخل هذه الخطوة.</li>
                          <li>كل درس يحتاج فقط: عنوان، هدف مختصر، مدة، ونوع.</li>
                        </ul>
                      </div>

                      <div className={styles.infoCard}>
                        <div className={styles.infoHead}>
                          <ShieldCheck size={16} />
                          <strong>كيف يتم ربط الدرس بسيناريو التكيف؟</strong>
                        </div>
                        <ul className={styles.simpleList}>
                          <li>نوع الدرس يحدد الشكل التعليمي للدرس، لكنه لا يشغّل التكيف وحده.</li>
                          <li>الربط الفعلي يتم عبر عناصر محتوى الدرس التي تحمل `adaptiveTag` وموضع الظهور داخل الرحلة.</li>
                          <li>حقل السيناريو المتوقع في نافذة التعديل يعمل كمرجع تأليفي يساعدك على ضبط محتوى الدعم المناسب لهذا الدرس.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>لا توجد وحدات بعد. يمكنك الاعتماد على الهيكل المقترح أو إضافة وحدتك الأولى يدويًا.</div>
                )}
              </section>
            </>
          ) : null}

          {selectedStep === 'assessments' ? (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.sectionEyebrow}>الخطوة 3</span>
                  <h2>الاختبارات والتقييمات</h2>
                  <p>هذه الخطوة تجمع أدوات الدراسة الحرجة في مكان واحد: الاختبار القبلي، الاختبار البعدي، اختبارات نهاية الوحدة، ونقاط التحقق داخل الدروس والأنشطة.</p>
                </div>
              </div>

              <div className={styles.assessmentSummaryGrid}>
                <article className={styles.assessmentSummaryCard}>
                  <div className={styles.infoHead}>
                    <CheckCircle2 size={16} />
                    <strong>الاختبار القبلي</strong>
                  </div>
                  <p>أداة بحثية إلزامية. لا يمكن نشر المقرر إذا كان هذا الاختبار غير موجود.</p>
                  <div className={styles.inlineMeta}>
                    <CountChip label="الحالة" value={pretests.length ? '✔ مضاف' : '✖ مفقود'} tone={pretests.length ? 'success' : 'warning'} />
                    <CountChip label="عدد الأسئلة" value={getQuizQuestionCount(pretests)} />
                  </div>
                  <div className={styles.cardActions}>
                    {!pretests.length ? (
                      <button type="button" className="btn btn-primary" onClick={() => void createResearchAssessment('pretest')}>
                        <Plus size={14} />
                        إنشاء نموذج من 5 أسئلة
                      </button>
                    ) : null}
                    <button type="button" className="btn btn-secondary" onClick={() => setOpenAssessmentPanels((current) => ({ ...current, pre: !current.pre }))}>
                      <ChevronDown size={14} className={openAssessmentPanels.pre ? styles.rotate180 : ''} />
                      إدارة
                    </button>
                  </div>
                </article>

                <article className={styles.assessmentSummaryCard}>
                  <div className={styles.infoHead}>
                    <CheckCircle2 size={16} />
                    <strong>الاختبار البعدي</strong>
                  </div>
                  <p>أداة بحثية إلزامية لقياس ما بعد التدريب. لا يمكن نشر المقرر من دونها.</p>
                  <div className={styles.inlineMeta}>
                    <CountChip label="الحالة" value={posttests.length ? '✔ مضاف' : '✖ مفقود'} tone={posttests.length ? 'success' : 'warning'} />
                    <CountChip label="عدد الأسئلة" value={getQuizQuestionCount(posttests)} />
                  </div>
                  <div className={styles.cardActions}>
                    {!posttests.length ? (
                      <button type="button" className="btn btn-primary" onClick={() => void createResearchAssessment('posttest')}>
                        <Plus size={14} />
                        إنشاء نموذج من 5 أسئلة
                      </button>
                    ) : null}
                    <button type="button" className="btn btn-secondary" onClick={() => setOpenAssessmentPanels((current) => ({ ...current, post: !current.post }))}>
                      <ChevronDown size={14} className={openAssessmentPanels.post ? styles.rotate180 : ''} />
                      إدارة
                    </button>
                  </div>
                </article>

                <article className={styles.assessmentSummaryCard}>
                  <div className={styles.infoHead}>
                    <BookOpen size={16} />
                    <strong>اختبارات نهاية الوحدة</strong>
                  </div>
                  <p>تقييم ختامي اختياري على مستوى الوحدة لتأكيد الجاهزية قبل الانتقال، دون تعقيد أو محررات مسارات قديمة.</p>
                  <div className={styles.inlineMeta}>
                    <CountChip label="الوحدة الحالية" value={selectedModule?.title ?? 'لم تُحدّد'} />
                    <CountChip label="اختبارات الوحدة" value={selectedModuleUnitAssessments.length} />
                    <CountChip label="الإجمالي" value={unitAssessments.length} />
                  </div>
                  <div className={styles.cardActions}>
                    <button type="button" className="btn btn-secondary" onClick={() => setOpenAssessmentPanels((current) => ({ ...current, unit: !current.unit }))}>
                      <ChevronDown size={14} className={openAssessmentPanels.unit ? styles.rotate180 : ''} />
                      إدارة
                    </button>
                  </div>
                </article>

                <article className={styles.assessmentSummaryCard}>
                  <div className={styles.infoHead}>
                    <BookOpen size={16} />
                    <strong>اختبارات الدرس وتقييمات الأنشطة</strong>
                  </div>
                  <p>هنا تدار نقاط التحقق القصيرة داخل الدروس، كما تستخدم التقييمات نفسها مع دروس الأنشطة والحالات التطبيقية.</p>
                  <div className={styles.inlineMeta}>
                    <CountChip label="الدرس الحالي" value={selectedLesson?.title ?? 'لم يُحدّد'} />
                    <CountChip label="اختبارات الدرس" value={selectedLessonDetail?.quizzes?.length ?? 0} />
                    <CountChip label="الإجمالي" value={lessonAssessments.length} />
                  </div>
                  <div className={styles.cardActions}>
                    <button type="button" className="btn btn-secondary" onClick={() => setOpenAssessmentPanels((current) => ({ ...current, lesson: !current.lesson }))}>
                      <ChevronDown size={14} className={openAssessmentPanels.lesson ? styles.rotate180 : ''} />
                      إدارة
                    </button>
                  </div>
                </article>
              </div>

              {openAssessmentPanels.pre ? (
                <div className={styles.assessmentPanel}>
                  <LessonQuizBuilder
                    scope="pretest"
                    courseKey={courseKey}
                    quizzes={pretests}
                    onRefresh={refreshBuilderData}
                    headerEyebrow="A. تقييم بحثي إلزامي"
                    headerTitle="الاختبار القبلي"
                    headerDescription="اختبار بحثي إلزامي قبل الدخول إلى الوحدات. يدعم الاختيار من متعدد والصواب/الخطأ مع حد محاولات افتراضي = 1."
                    addQuizLabel="إضافة اختبار قبلي"
                    emptyState="لا يوجد اختبار قبلي بعد. يمكنك إنشاء نموذج من 5 أسئلة أو بناء الاختبار يدويًا."
                  />
                </div>
              ) : null}

              {openAssessmentPanels.post ? (
                <div className={styles.assessmentPanel}>
                  <LessonQuizBuilder
                    scope="posttest"
                    courseKey={courseKey}
                    quizzes={posttests}
                    onRefresh={refreshBuilderData}
                    headerEyebrow="B. تقييم بحثي إلزامي"
                    headerTitle="الاختبار البعدي"
                    headerDescription="اختبار بحثي إلزامي بعد إتمام البرنامج. يبقى منفصلًا عن التكيف الإرشادي إلا في رسائل التطمين الإجرائي داخل المجموعة التجريبية."
                    addQuizLabel="إضافة اختبار بعدي"
                    emptyState="لا يوجد اختبار بعدي بعد. يمكنك إنشاء نموذج من 5 أسئلة أو بناء الاختبار يدويًا."
                  />
                </div>
              ) : null}

              {openAssessmentPanels.unit ? (
                <div className={styles.assessmentPanel}>
                  {selectedModule ? (
                    <LessonQuizBuilder
                      scope="unit"
                      moduleId={selectedModule.id}
                      quizzes={selectedModuleUnitAssessments}
                      onRefresh={refreshBuilderData}
                      headerEyebrow="C. تقييم تعليمي اختياري"
                      headerTitle={`اختبارات نهاية الوحدة: ${selectedModule.title}`}
                      headerDescription="أضف اختبار نهاية وحدة عندما تحتاج هذه الوحدة إلى تحقق ختامي واضح قبل الانتقال إلى وحدة أخرى."
                      addQuizLabel="إضافة اختبار نهاية الوحدة"
                      emptyState="لا يوجد اختبار نهاية وحدة لهذه الوحدة بعد. يمكنك تركها دون اختبار أو إضافة فحص ختامي مختصر عند الحاجة."
                    />
                  ) : (
                    <div className={styles.emptyState}>اختر وحدة أولًا من خطوة الوحدات والدروس حتى تتمكن من إضافة اختبار نهاية الوحدة.</div>
                  )}
                </div>
              ) : null}

              {openAssessmentPanels.lesson ? (
                <div className={styles.assessmentPanel}>
                  {selectedLesson ? (
                    <LessonQuizBuilder
                      scope="lesson"
                      lessonId={selectedLesson.id}
                      moduleId={selectedModule?.id}
                      quizzes={selectedLessonDetail?.quizzes ?? []}
                      onRefresh={refreshBuilderData}
                      headerEyebrow="D. تقييمات تعليمية اختيارية"
                      headerTitle={`اختبارات داخل الدرس: ${selectedLesson.title}`}
                      headerDescription="أضف نقاط تحقق قصيرة داخل الدرس، أو استخدمها كتقييم نشاط عندما يكون نوع الدرس نشاطًا تفاعليًا أو حالة تطبيقية."
                      addQuizLabel="إضافة اختبار داخل الدرس"
                      emptyState="لا توجد اختبارات داخل هذا الدرس بعد. يمكنك إبقاءه دون اختبار أو إضافة نقطة تحقق تعليمية عند الحاجة."
                    />
                  ) : (
                    <div className={styles.emptyState}>اختر درسًا أولًا من خطوة الوحدات والدروس حتى تتمكن من إضافة اختباراته الداخلية.</div>
                  )}
                </div>
              ) : null}

              <div className={styles.infoStrip}>
                <ClipboardCheck size={16} />
                <p>
                  تقييم الأداء / rubric يبقى جاهزًا للربط بمخرجات الأنشطة لاحقًا، لكننا لا نفرضه هنا حتى لا يتحول الباني إلى صفحة تقنية مزدحمة.
                </p>
              </div>
            </section>
          ) : null}

          {selectedStep === 'policy' ? (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.sectionEyebrow}>الخطوة 4</span>
                  <h2>سياسة الدعم التكيفي</h2>
                  <p>لا توجد هنا خرائط فروع قديمة أو تعيينات عاطفة-إلى-عنصر. السياسة معروضة كإطار واحد مع السيناريوهات السبعة المعتمدة فقط.</p>
                </div>
              </div>

              <div className={styles.policyBanner}>
                <div className={styles.infoHead}>
                  <ShieldCheck size={18} />
                  <strong>{ADAPTIVE_POLICY_OVERVIEW.label}</strong>
                </div>
                <ul className={styles.policyList}>
                  {ADAPTIVE_POLICY_OVERVIEW.summary.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className={styles.policyControls}>
                <label className={styles.toggleCard}>
                  <input
                    type="checkbox"
                    checked={builderDraft.adaptivePolicyEnabled}
                    onChange={(event) => setBuilderDraft((current) => ({ ...current, adaptivePolicyEnabled: event.target.checked }))}
                  />
                  <div>
                    <strong>تفعيل سياسة التكيف لهذا المقرر</strong>
                    <p>يؤثر هذا على المجموعة التجريبية فقط، ولا يضيف أي استشعار أو تنبيه عاطفي للمجموعة الضابطة.</p>
                  </div>
                </label>

                <label className={styles.toggleCard}>
                  <input
                    type="checkbox"
                    checked={builderDraft.allowHighEngagementPath}
                    onChange={(event) => setBuilderDraft((current) => ({ ...current, allowHighEngagementPath: event.target.checked }))}
                  />
                  <div>
                    <strong>تفعيل المسار المتقدم عند الانخراط العالي</strong>
                    <p>يفتح تحديًا أو مسارًا أعمق فقط عندما يكون الأداء قويًا ومستقرًا.</p>
                  </div>
                </label>

                <label className={styles.toggleCard}>
                  <input
                    type="checkbox"
                    checked={builderDraft.allowAssessmentReassurance}
                    onChange={(event) => setBuilderDraft((current) => ({ ...current, allowAssessmentReassurance: event.target.checked }))}
                  />
                  <div>
                    <strong>تفعيل التطمين الإجرائي داخل التقييمات</strong>
                    <p>يسمح برسائل إجرائية محايدة أثناء الاختبارات داخل المجموعة التجريبية دون كشف الإجابة أو تخفيف غير عادل للصعوبة.</p>
                  </div>
                </label>
              </div>

              <div className={styles.lessonTypeSelector}>
                <div className={styles.infoHead}>
                  <Target size={16} />
                  <strong>أنواع الدروس التي يمكن أن تستقبل دعمًا تكيفيًا</strong>
                </div>
                <div className={styles.selectorChips}>
                  {LESSON_TYPE_OPTIONS.map((option) => {
                    const active = builderDraft.adaptiveLessonTypes.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`${styles.selectorChip} ${active ? styles.selectorChipActive : ''}`}
                        onClick={() =>
                          setBuilderDraft((current) => ({
                            ...current,
                            adaptiveLessonTypes: active
                              ? current.adaptiveLessonTypes.filter((item) => item !== option.value)
                              : [...current.adaptiveLessonTypes, option.value],
                          }))
                        }
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={styles.policyGrid}>
                {ADAPTIVE_SCENARIO_CARDS.map((scenario) => (
                  <article key={scenario.key} className={styles.policyCard}>
                    <div className={styles.policyCardHead}>
                      <div>
                        <strong>{scenario.name}</strong>
                        <span>{scenario.uiShape}</span>
                      </div>
                      {scenario.locked ? <span className={styles.lockChip}><Lock size={12} /> مقفلة</span> : <span className={styles.editableChip}>قابلة للتفعيل فقط</span>}
                    </div>
                    <p>{scenario.interpretation}</p>
                    <div className={styles.policyMetaBlock}>
                      <span>منطق التفعيل</span>
                      <strong>{scenario.activationSummary}</strong>
                    </div>
                    <div className={styles.contextTags}>
                      {scenario.contexts.map((context) => (
                        <span key={context}>{context}</span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {selectedStep === 'review' ? (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.sectionEyebrow}>الخطوة 5</span>
                  <h2>المراجعة والنشر</h2>
                  <p>ملخص نهائي يراجع البنية والاختبارات والسياسة التكيفية، ثم يمنع النشر إذا غاب أي عنصر بحثي إلزامي.</p>
                </div>
                <StatusChip status={builderDraft.publicationStatus} />
              </div>

              <div className={styles.reviewGrid}>
                <article className={styles.reviewCard}>
                  <strong>معلومات المقرر</strong>
                  <ul className={styles.reviewList}>
                    <li><span>العنوان</span><strong>{builderDraft.title || '—'}</strong></li>
                    <li><span>الفئة المستهدفة</span><strong>{builderDraft.targetAudience || '—'}</strong></li>
                    <li><span>اللغة</span><strong>{builderDraft.language}</strong></li>
                    <li><span>النوع</span><strong>مقرر تدريبي بحثي</strong></li>
                  </ul>
                </article>

                <article className={styles.reviewCard}>
                  <strong>بنية المقرر</strong>
                  <ul className={styles.reviewList}>
                    <li><span>عدد الوحدات</span><strong>{modules.length}</strong></li>
                    <li><span>عدد الدروس</span><strong>{lessonCount}</strong></li>
                    <li><span>الوحدة المحددة الآن</span><strong>{selectedModule?.title ?? '—'}</strong></li>
                    <li><span>الدرس المحدد الآن</span><strong>{selectedLesson?.title ?? '—'}</strong></li>
                  </ul>
                </article>

                <article className={styles.reviewCard}>
                  <strong>الاختبارات</strong>
                  <ul className={styles.reviewList}>
                    <li><span>الاختبار القبلي</span><strong>{pretests.length ? `✔ (${getQuizQuestionCount(pretests)} سؤال)` : '✖ غير موجود'}</strong></li>
                    <li><span>الاختبار البعدي</span><strong>{posttests.length ? `✔ (${getQuizQuestionCount(posttests)} سؤال)` : '✖ غير موجود'}</strong></li>
                    <li><span>اختبارات نهاية الوحدة</span><strong>{unitAssessments.length}</strong></li>
                    <li><span>اختبارات الدروس</span><strong>{lessonAssessments.length}</strong></li>
                    <li><span>السياسة التكيفية</span><strong>{builderDraft.adaptivePolicyEnabled ? 'مفعّلة' : 'معطّلة'}</strong></li>
                  </ul>
                </article>
              </div>

              <div className={styles.validationPanels}>
                <article className={styles.validationCard}>
                  <div className={styles.infoHead}>
                    <Flag size={16} />
                    <strong>موانع النشر</strong>
                  </div>
                  {validation.blocking.length ? (
                    <ul className={styles.validationList}>
                      {validation.blocking.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.validationSuccess}>لا توجد موانع نشر. المتطلبات الأساسية للمقرر البحثي مستوفاة.</p>
                  )}
                </article>

                <article className={styles.validationCard}>
                  <div className={styles.infoHead}>
                    <Sparkles size={16} />
                    <strong>ملاحظات تحسين</strong>
                  </div>
                  {validation.warnings.length ? (
                    <ul className={styles.validationList}>
                      {validation.warnings.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.validationSuccess}>لا توجد ملاحظات تحسين حرجة في هذه المرحلة.</p>
                  )}
                </article>
              </div>

              <div className={styles.reviewActions}>
                <button type="button" className="btn btn-secondary" onClick={handleSaveDraft}>
                  حفظ مسودة
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setPreviewOpen(true)}>
                  <Eye size={14} />
                  معاينة
                </button>
                <button type="button" className="btn btn-primary" onClick={() => void handlePublish()}>
                  نشر
                </button>
              </div>
            </section>
          ) : null}

          <div className={styles.stepActions}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => canGoBack && setSelectedStep(BUILDER_STEPS[stepIndex - 1].key)}
              disabled={!canGoBack}
            >
              {isRtl ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
              رجوع
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => canGoNext && setSelectedStep(BUILDER_STEPS[stepIndex + 1].key)}
              disabled={!canGoNext}
            >
              متابعة
              {isRtl ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
            </button>
          </div>
        </main>
      </div>

      {moduleModal.open ? (
        <div className="modal-overlay">
          <div className={`card ${styles.modalCard}`}>
            <h3>{moduleModal.data?.id ? 'تعديل الوحدة' : 'إضافة وحدة'}</h3>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleSaveModule(new FormData(event.currentTarget));
              }}
              className={styles.modalForm}
            >
              <label className={styles.field}>
                <span>عنوان الوحدة</span>
                <input name="title" className="input" defaultValue={moduleModal.data?.title ?? ''} required />
              </label>
              <label className={styles.field}>
                <span>ملخص الوحدة</span>
                <textarea name="description" className="input" rows={4} defaultValue={moduleModal.data?.description ?? ''} />
              </label>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>المدة التقديرية (دقيقة)</span>
                  <input
                    name="estimatedDurationMin"
                    type="number"
                    className="input"
                    defaultValue={moduleModal.data?.estimatedDurationMin ?? ''}
                  />
                </label>
                <label className={styles.field}>
                  <span>أهداف الوحدة (اختياري)</span>
                  <textarea
                    name="objectives"
                    className="input"
                    rows={3}
                    defaultValue={(moduleModal.data?.objectives ?? []).join('\n')}
                    placeholder="هدف واحد في كل سطر"
                  />
                </label>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setModuleModal({ open: false })}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {lessonModal.open ? (
        <div className="modal-overlay">
          <div className={`card ${styles.modalCard}`}>
            <h3>{lessonModal.data?.id ? 'تعديل الدرس' : 'إضافة درس'}</h3>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleSaveLesson(new FormData(event.currentTarget));
              }}
              className={styles.modalForm}
            >
              <label className={styles.field}>
                <span>عنوان الدرس</span>
                <input name="title" className="input" defaultValue={lessonModal.data?.title ?? ''} required />
              </label>
              <label className={styles.field}>
                <span>هدف الدرس المختصر</span>
                <textarea
                  name="objective"
                  className="input"
                  rows={3}
                  defaultValue={lessonModal.data?.objectives?.[0] ?? lessonModal.data?.description ?? ''}
                  placeholder="اكتب الهدف الذي يجب أن يحققه المتعلم من هذا الدرس"
                />
              </label>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>المدة (دقيقة)</span>
                  <input
                    name="expectedDurationMin"
                    type="number"
                    className="input"
                    defaultValue={lessonModal.data?.expectedDurationMin ?? ''}
                  />
                </label>
                <label className={styles.field}>
                  <span>نوع الدرس</span>
                  <select
                    name="lessonType"
                    className="input"
                    value={lessonTypePreview}
                    onChange={(event) => setLessonTypePreview(event.target.value as ResearchLessonType)}
                  >
                    {LESSON_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className={styles.field}>
                <span>السيناريو التكيفي المتوقع (اختياري)</span>
                <select
                  name="emotionalTriggerExpected"
                  className="input"
                  defaultValue={lessonModal.data?.emotionalTriggerExpected ?? ''}
                >
                  <option value="">يُترك للنظام/لعناصر المحتوى</option>
                  {ADAPTIVE_SCENARIO_CARDS.map((scenario) => (
                    <option key={scenario.key} value={scenario.key}>
                      {scenario.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.policyMetaBlock}>
                <strong>مهم</strong>
                <p>{getLessonAdaptiveGuidance(lessonTypePreview)}</p>
                <p>
                  السيناريوهات الأنسب لهذا النوع:
                  {' '}
                  <strong>{suggestedScenarioTitles.join('، ')}</strong>
                </p>
                <p>
                  نوع الدرس هنا يحدد الإطار التعليمي فقط، أما عرض الدعم التكيفي نفسه فيرتبط بعناصر محتوى الدرس
                  التي تحمل السيناريو المناسب داخل المسار.
                </p>
              </div>
              <label className={styles.field}>
                <span>وصف موجز إضافي (اختياري)</span>
                <textarea name="description" className="input" rows={3} defaultValue={lessonModal.data?.description ?? ''} />
              </label>
              <div className={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setLessonModal({ open: false })}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {contentModal.open ? (
        <div className="modal-overlay">
          <div className={`card ${styles.modalCard}`}>
            <h3>{contentModal.data?.id ? 'تعديل مكوّن الدرس' : 'إضافة مكوّن للدرس'}</h3>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleSaveContent(new FormData(event.currentTarget));
              }}
              className={styles.modalForm}
            >
              <div className={styles.infoStrip}>
                <LayoutTemplate size={16} />
                <p>
                  هذا هو المكان الفعلي لإضافة عناصر الدرس وربطها بالمسار الأساسي أو بسيناريو تكيفي. هنا يتم تحديد
                  نوع المكوّن، وسيناريوه، وموضع ظهوره داخل تجربة المتعلم.
                </p>
              </div>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <FieldHint
                    label="نوع المكوّن"
                    hint="يحدد طبيعة هذا العنصر: شرح نصي، مادة مرئية، فيديو، أو نشاط قصير. اختر النوع الأقرب لطريقة عرض المحتوى للمتعلم."
                  />
                  <select
                    name="contentType"
                    className="input"
                    defaultValue={contentModal.data?.contentType ?? 'TEXT'}
                  >
                    {CONTENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <FieldHint
                    label="السيناريو / المسار"
                    hint="يحدد ما إذا كان هذا المكوّن جزءًا من المسار الأساسي، أو محتوى دعم/تحدٍ يظهر عند تحقق سيناريو تكيفي محدد مثل الارتباك أو الإحباط."
                  />
                  <select
                    name="adaptiveTag"
                    className="input"
                    defaultValue={contentModal.data?.adaptiveTag ?? 'baseline'}
                  >
                    {CONTENT_ADAPTIVE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <FieldHint
                    label="عنوان المكوّن"
                    hint="اسم قصير يوضح وظيفة هذا العنصر داخل الدرس، مثل: مقدمة، مثال مصغر، سؤال قرار، أو توضيح إضافي."
                  />
                  <input
                    name="contentTitle"
                    className="input"
                    defaultValue={contentModal.data ? getContentTitle(contentModal.data) : ''}
                    placeholder="مثال: توضيح إضافي، حالة سريعة، نشاط قرار..."
                  />
                </label>
                <label className={styles.field}>
                  <FieldHint
                    label="سياق المهمة (اختياري)"
                    hint="يربط المكوّن بمهمة أو مهارة محددة داخل الدرس، مثل تحليل النطاق أو WBS. يفيد هذا الربط في جعل التدخل التكيفي أكثر دقة."
                  />
                  <input
                    name="taskContextKey"
                    className="input"
                    defaultValue={asText(contentModal.data?.contentData?.taskContextKey)}
                    placeholder="مثل: scope_analysis أو wbs أو cost_management"
                  />
                </label>
              </div>
              <label className={styles.field}>
                <FieldHint
                  label="النص / الوصف / التعليمات"
                  hint="هذا هو المحتوى الذي سيظهر للمتعلم داخل هذا المكوّن. استخدمه للشرح، أو صياغة المهمة، أو كتابة التوجيهات أو نص الدعم."
                />
                <textarea
                  name="contentBody"
                  className="input"
                  rows={4}
                  defaultValue={
                    asText(contentModal.data?.contentData?.text) ||
                    asText(contentModal.data?.contentData?.prompt) ||
                    asText(contentModal.data?.contentData?.description)
                  }
                  placeholder="اكتب النص الذي سيظهر للمتعلم داخل هذا المكوّن."
                />
              </label>
              <label className={styles.field}>
                <FieldHint
                  label="رابط مورد مرئي أو فيديو (اختياري)"
                  hint="أضف رابط صورة أو فيديو أو مورد داعم إذا كان هذا المكوّن يعتمد على وسائط خارجية. اتركه فارغًا إذا كان العنصر نصيًا فقط."
                />
                <input
                  name="resourceUrl"
                  className="input"
                  defaultValue={
                    asText(contentModal.data?.contentData?.url) ||
                    asText(contentModal.data?.contentData?.resourceUrl)
                  }
                  placeholder="https://..."
                />
              </label>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <FieldHint
                    label="موضع الظهور"
                    hint="يحدد أين يظهر هذا المكوّن بالنسبة للخطوة الأساسية: داخل المسار المعتاد، قبلها، بعدها، أو بدلها بالكامل."
                  />
                  <select
                    name="placementMode"
                    className="input"
                    defaultValue={contentModal.data ? getAdaptivePlacementMode(contentModal.data) : 'after'}
                  >
                    <option value="baseline">داخل المسار الأساسي</option>
                    <option value="before">قبل الخطوة الأساسية</option>
                    <option value="after">بعد الخطوة الأساسية</option>
                    <option value="instead">بدل الخطوة الأساسية</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <FieldHint
                    label="مستوى الدعم"
                    hint="درجة عمق المساعدة داخل هذا المكوّن. استخدم مستوى أقل للدعم الخفيف، ومستوى أعلى إذا كان العنصر يقدم شرحًا أعمق أو تفكيكًا للمهمة."
                  />
                  <input
                    name="scaffoldLevel"
                    type="number"
                    className="input"
                    min={1}
                    max={5}
                    defaultValue={contentModal.data?.scaffoldLevel ?? 3}
                  />
                </label>
              </div>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <FieldHint
                    label="ترتيب الظهور"
                    hint="الرقم الذي يحدد موضع هذا المكوّن بين بقية عناصر الدرس. الأصغر يظهر أولًا داخل نفس المسار."
                  />
                  <input
                    name="sequenceOrder"
                    type="number"
                    className="input"
                    min={1}
                    defaultValue={contentModal.data?.sequenceOrder ?? selectedLessonContents.length + 1}
                  />
                </label>
                <label className={`${styles.field} ${styles.checkboxField}`}>
                  <FieldHint
                    label="خيار إثرائي / تحدٍّ اختياري"
                    hint="فعّل هذا الخيار إذا كان المكوّن مخصصًا للتعمق أو التحدي الإضافي، وليس جزءًا إلزاميًا من المسار الأساسي للمتعلم."
                  />
                  <input
                    name="isEnrichment"
                    type="checkbox"
                    defaultChecked={contentModal.data ? asBoolean(contentModal.data.isEnrichment) : false}
                  />
                </label>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setContentModal({ open: false })} title="إغلاق النافذة بدون حفظ التعديلات الحالية">إلغاء</button>
                <button type="submit" className="btn btn-primary" title="حفظ هذا المكوّن داخل الدرس المحدد وإتاحته ضمن المسار أو السيناريو الذي اخترته">حفظ المكوّن</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {previewOpen ? (
        <div className="modal-overlay">
          <div className={`card ${styles.previewModal}`}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.sectionEyebrow}>معاينة المقرر</span>
                <h3>{builderDraft.title}</h3>
                <p>{builderDraft.description}</p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => setPreviewOpen(false)}>إغلاق</button>
            </div>
            <div className={styles.reviewGrid}>
              <article className={styles.reviewCard}>
                <strong>الوحدات المقترنة بالمقرر</strong>
                <ul className={styles.previewList}>
                  {modules.map((module) => (
                    <li key={module.id}>
                      <span>{module.title}</span>
                      <small>{module.episodes.length} درس</small>
                    </li>
                  ))}
                </ul>
              </article>
              <article className={styles.reviewCard}>
                <strong>التقييمات الحرجة بحثيًا</strong>
                <ul className={styles.previewList}>
                  <li><span>الاختبار القبلي</span><small>{pretests.length ? `${getQuizQuestionCount(pretests)} سؤال` : 'غير مضاف'}</small></li>
                  <li><span>الاختبار البعدي</span><small>{posttests.length ? `${getQuizQuestionCount(posttests)} سؤال` : 'غير مضاف'}</small></li>
                  <li><span>اختبارات نهاية الوحدة</span><small>{unitAssessments.length}</small></li>
                  <li><span>اختبارات الدروس</span><small>{lessonAssessments.length}</small></li>
                </ul>
              </article>
              <article className={styles.reviewCard}>
                <strong>سياسة الدعم التكيفي</strong>
                <ul className={styles.previewList}>
                  <li><span>الحالة</span><small>{builderDraft.adaptivePolicyEnabled ? 'مفعّلة' : 'معطّلة'}</small></li>
                  <li><span>مسار الانخراط العالي</span><small>{builderDraft.allowHighEngagementPath ? 'مفعّل' : 'معطّل'}</small></li>
                  <li><span>التطمين أثناء التقييم</span><small>{builderDraft.allowAssessmentReassurance ? 'مفعّل' : 'معطّل'}</small></li>
                </ul>
              </article>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
