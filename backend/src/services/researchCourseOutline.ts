import type { Prisma, PublishStatus, QuizQuestionType, QuizScope } from '@prisma/client';

export type OutlineLessonType =
  | 'introduction'
  | 'core_lesson'
  | 'interactive_activity'
  | 'case_scenario'
  | 'assessment_checkpoint'
  | 'summary_closure';

export type OutlineLesson = {
  title: string;
  objective: string;
  durationMin: number;
  lessonType: OutlineLessonType;
  taskContextKey?: string;
};

export type OutlineUnit = {
  title: string;
  shortSummary: string;
  estimatedDurationMin: number;
  lessons: OutlineLesson[];
};

type BootstrapContentDescriptor = {
  id: string;
  contentType: 'TEXT' | 'VISUAL' | 'VIDEO' | 'ASSESSMENT';
  adaptiveTag: null | 'confusion' | 'frustration' | 'boredom_disengagement' | 'high_engagement';
  scaffoldLevel: number;
  isEnrichment: boolean;
  sequenceOrder: number;
  contentData: Record<string, unknown>;
  status: PublishStatus;
};

type BootstrapQuizDescriptor = {
  title: string;
  description: string;
  scope: QuizScope;
  passingScore: number;
  attemptLimit: number;
  showExplanationAfterSubmit: boolean;
  allowRetry: boolean;
  adaptiveOnFail: string | null;
  adaptiveOnPass: string | null;
  sequenceOrder: number;
  isPublished: boolean;
  questions: Array<{
    questionType: QuizQuestionType;
    questionText: string;
    explanation: string;
    hint: string | null;
    weight: number;
    sequenceOrder: number;
    choices: Array<{
      choiceText: string;
      isCorrect: boolean;
      sequenceOrder: number;
    }>;
  }>;
};

const TASK_KEYWORD_MAP: Array<{ key: string; tokens: string[] }> = [
  { key: 'wbs', tokens: ['wbs', 'work breakdown', 'تقسيم العمل', 'حزم العمل'] },
  { key: 'scope_analysis', tokens: ['scope', 'النطاق', 'ميثاق المشروع'] },
  { key: 'risk_analysis', tokens: ['risk', 'المخاطر', 'سجل المخاطر'] },
  { key: 'schedule_management', tokens: ['schedule', 'timeline', 'gantt', 'الجدول', 'الجدولة', 'جانت'] },
  { key: 'cost_management', tokens: ['cost', 'budget', 'التكلفة', 'الميزانية'] },
  { key: 'resource_management', tokens: ['resource', 'resources', 'الموارد', 'تخصيص الموارد'] },
  { key: 'communication_management', tokens: ['communication', 'الاتصال', 'التواصل'] },
  { key: 'stakeholder_management', tokens: ['stakeholder', 'stakeholders', 'أصحاب المصلحة'] },
  { key: 'integration_management', tokens: ['integration', 'التكامل'] },
  { key: 'quality_management', tokens: ['quality', 'الجودة'] },
  { key: 'decision_making', tokens: ['decision', 'decisions', 'القرار', 'اتخاذ القرار'] },
  { key: 'documentation_follow_up', tokens: ['documentation', 'follow-up', 'التوثيق', 'المتابعة'] },
];

const CANONICAL_TASK_KEYWORD_MAP: Array<{ key: string; tokens: string[] }> = [
  { key: 'wbs', tokens: ['wbs', 'work breakdown', 'هيكل تقسيم العمل', 'تقسيم العمل', 'حزم العمل'] },
  { key: 'scope_analysis', tokens: ['scope', 'scope analysis', 'إدارة نطاق المشروع', 'ادارة نطاق المشروع', 'خطة إدارة نطاق المشروع', 'خطة ادارة نطاق المشروع', 'النطاق', 'ميثاق المشروع'] },
  { key: 'risk_analysis', tokens: ['risk', 'risk analysis', 'إدارة المخاطر', 'ادارة المخاطر', 'تحليل المخاطر', 'المخاطر', 'سجل المخاطر'] },
  { key: 'schedule_management', tokens: ['schedule', 'timeline', 'gantt', 'الجدول الزمني', 'الجدول', 'الجدولة', 'الاعتماديات'] },
  { key: 'cost_management', tokens: ['cost', 'budget', 'التكاليف', 'التكلفة', 'الميزانية', 'الميزانيه'] },
  { key: 'resource_management', tokens: ['resource', 'resources', 'الموارد', 'الموارد البشرية', 'الموارد البشريه', 'الموارد المادية', 'الموارد الماديه', 'تخصيص الموارد'] },
  { key: 'communication_management', tokens: ['communication', 'communications', 'الاتصالات', 'التواصل', 'التقارير'] },
  { key: 'stakeholder_management', tokens: ['stakeholder', 'stakeholders', 'أصحاب المصلحة', 'اصحاب المصلحة', 'إشراك أصحاب المصلحة', 'اشراك اصحاب المصلحة'] },
  { key: 'integration_management', tokens: ['integration', 'التكامل', 'تكامل الخطة', 'تكامل الخطه'] },
  { key: 'quality_management', tokens: ['quality', 'الجودة', 'الجوده', 'معايير الجودة', 'معايير الجوده', 'خطة جودة المشروع', 'خطة جوده المشروع'] },
  { key: 'decision_making', tokens: ['decision', 'decisions', 'القرار', 'القرارات', 'اتخاذ القرار', 'اتخاذ القرارات'] },
  { key: 'documentation_follow_up', tokens: ['documentation', 'follow-up', 'التوثيق', 'المتابعة', 'المتابعه', 'تقارير الحالة', 'تقارير حاله المشروع'] },
];

const APPROVED_OUTLINE_TASK_CONTEXT_BY_POSITION: Record<string, string> = {
  '2:4': 'stakeholder_management',
  '3:1': 'scope_analysis',
  '3:2': 'wbs',
  '3:3': 'schedule_management',
  '3:4': 'cost_management',
  '3:5': 'resource_management',
  '3:6': 'quality_management',
  '3:7': 'communication_management',
  '3:8': 'risk_analysis',
  '3:10': 'stakeholder_management',
  '5:1': 'cost_management',
  '5:3': 'risk_analysis',
  '5:4': 'decision_making',
  '5:5': 'documentation_follow_up',
  '5:6': 'communication_management',
  '7:4': 'decision_making',
  '7:10': 'decision_making',
  '7:12': 'cost_management',
  '7:14': 'decision_making',
  '7:15': 'resource_management',
  '7:16': 'decision_making',
  '7:17': 'documentation_follow_up',
};

const APPROVED_EPISODE_TASK_CONTEXT_BY_ID: Record<string, string> = {
  'RC-U02-L04': 'stakeholder_management',
  'RC-U03-L01': 'scope_analysis',
  'RC-U03-L02': 'wbs',
  'RC-U03-L03': 'schedule_management',
  'RC-U03-L04': 'cost_management',
  'RC-U03-L05': 'resource_management',
  'RC-U03-L06': 'quality_management',
  'RC-U03-L07': 'communication_management',
  'RC-U03-L08': 'risk_analysis',
  'RC-U03-L10': 'stakeholder_management',
  'RC-U05-L01': 'cost_management',
  'RC-U05-L03': 'risk_analysis',
  'RC-U05-L04': 'decision_making',
  'RC-U05-L05': 'documentation_follow_up',
  'RC-U05-L06': 'communication_management',
  'RC-U07-L04': 'decision_making',
  'RC-U07-L10': 'decision_making',
  'RC-U07-L12': 'cost_management',
  'RC-U07-L14': 'decision_making',
  'RC-U07-L15': 'resource_management',
  'RC-U07-L16': 'decision_making',
  'RC-U07-L17': 'documentation_follow_up',
};

const FRUSTRATION_TASK_KEYS = new Set(['schedule_management', 'cost_management', 'resource_management']);
const CONFUSION_TASK_KEYS = new Set(['wbs', 'scope_analysis', 'risk_analysis']);

function toStoredAdaptiveTag(
  value: 'confusion' | 'frustration' | 'boredom_disengagement' | 'high_engagement',
) {
  switch (value) {
    case 'confusion':
      return 'confusion' as const;
    case 'frustration':
      return 'frustration' as const;
    case 'boredom_disengagement':
      return 'boredom_disengagement' as const;
    case 'high_engagement':
      return 'high_engagement' as const;
    default:
      return 'confusion' as const;
  }
}

export function generateUnitId(order: number) {
  return `RC-U${String(order).padStart(2, '0')}`;
}

export function generateLessonId(unitId: string, order: number) {
  return `${unitId}-L${String(order).padStart(2, '0')}`;
}

export function toStoredLessonType(type: OutlineLessonType) {
  switch (type) {
    case 'introduction':
    case 'core_lesson':
      return 'guided';
    case 'interactive_activity':
      return 'interactive';
    case 'case_scenario':
      return 'scenario';
    case 'assessment_checkpoint':
      return 'assessment';
    case 'summary_closure':
      return 'reflection';
    default:
      return 'guided';
  }
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ');
}

export function deriveTaskContextKey(unitTitle: string, lesson: OutlineLesson) {
  const source = normalizeText(`${unitTitle} ${lesson.title} ${lesson.objective}`);
  const matched = CANONICAL_TASK_KEYWORD_MAP.find((entry) =>
    entry.tokens.some((token) => source.includes(normalizeText(token))),
  );
  if (matched) return matched.key;

  if (lesson.lessonType === 'assessment_checkpoint') return 'assessment_review';
  if (lesson.lessonType === 'case_scenario') return 'decision_making';
  if (lesson.lessonType === 'interactive_activity') return 'practice_application';
  return 'concept_review';
}

export function getApprovedOutlineTaskContext(unitOrder: number, lessonOrder: number) {
  return APPROVED_OUTLINE_TASK_CONTEXT_BY_POSITION[`${unitOrder}:${lessonOrder}`] ?? null;
}

function baselineNoteForLesson(type: OutlineLessonType) {
  if (type === 'introduction') return 'ابدأ بفهم فكرة الدرس ودوره داخل مسار المقرر قبل الانتقال إلى التطبيق.';
  if (type === 'summary_closure') return 'راجع أهم النقاط ثم انتقل عندما تصبح الصورة أوضح لديك.';
  if (type === 'assessment_checkpoint') return 'هذا الدرس يقود إلى نقطة تحقق قصيرة تربط الفهم بالتطبيق.';
  return 'ركّز على الفكرة الأساسية في هذه الخطوة، ثم انتقل إلى الخطوة التالية بوضوح.';
}

function assessmentPromptForLesson(lesson: OutlineLesson) {
  if (lesson.lessonType === 'case_scenario') {
    return {
      question: `كيف ستتعامل مع موقف "${lesson.title}" داخل المشروع؟`,
      prompt: `${lesson.objective}\n\nاكتب قرارًا مختصرًا أو اختر الخطوة التي تراها مناسبة في هذا السياق.`,
      hint: 'ركّز على القرار أو الإجراء الأول الذي يدعم سير المشروع بوضوح.',
    };
  }

  return {
    question: `ما الإجراء الأنسب بعد فهم "${lesson.title}"؟`,
    prompt: `${lesson.objective}\n\nاكتب استجابة قصيرة توضّح كيف ستطبّق ما تعلمته في هذه الخطوة.`,
    hint: 'اكتب قرارًا أو إجراءً قصيرًا يترجم الفكرة إلى تطبيق مباشر.',
  };
}

function buildAssessmentChoices(lesson: OutlineLesson, taskContextKey: string) {
  return [
    `أبدأ بتوضيح المطلوب في سياق ${lesson.title}`,
    `أتجاوز التحليل وأنتقل مباشرة إلى التنفيذ`,
    `أؤجل القرار حتى تظهر مشكلة لاحقًا`,
    `أتجاهل أثر ${taskContextKey.replace(/_/g, ' ')} على بقية المشروع`,
  ];
}

export function buildBootstrapContents(
  episodeId: string,
  unitTitle: string,
  lesson: OutlineLesson,
  status: PublishStatus,
): BootstrapContentDescriptor[] {
  const taskContextKey =
    lesson.taskContextKey ??
    APPROVED_EPISODE_TASK_CONTEXT_BY_ID[episodeId] ??
    deriveTaskContextKey(unitTitle, lesson);
  const contents: BootstrapContentDescriptor[] = [
    {
      id: `${episodeId}-BASE-TEXT`,
      contentType: 'TEXT',
      adaptiveTag: null,
      scaffoldLevel: 3,
      isEnrichment: false,
      sequenceOrder: 1,
      status,
      contentData: {
        title: lesson.title,
        text: `${lesson.objective}\n\nفي هذا الدرس ستركّز على الفكرة أو القرار الذي يدعم تقدّم المشروع التعليمي في هذا السياق.`,
        note: baselineNoteForLesson(lesson.lessonType),
        taskContextKey,
        autoGenerated: true,
        bootstrapKind: 'baseline_text',
      },
    },
  ];

  if (lesson.lessonType === 'interactive_activity' || lesson.lessonType === 'case_scenario') {
    const assessment = assessmentPromptForLesson(lesson);
    contents.push({
      id: `${episodeId}-BASE-ACTIVITY`,
      contentType: 'ASSESSMENT',
      adaptiveTag: null,
      scaffoldLevel: 3,
      isEnrichment: false,
      sequenceOrder: 2,
      status,
      contentData: {
        title: lesson.lessonType === 'case_scenario' ? `حالة تطبيقية: ${lesson.title}` : `نشاط تطبيقي: ${lesson.title}`,
        taskContextKey,
        question: assessment.question,
        prompt: assessment.prompt,
        hint: assessment.hint,
        options: buildAssessmentChoices(lesson, taskContextKey),
        autoGenerated: true,
        bootstrapKind: 'baseline_activity',
      },
    });
  }

  if (
    lesson.lessonType === 'introduction' ||
    lesson.lessonType === 'core_lesson' ||
    lesson.lessonType === 'summary_closure'
  ) {
    contents.push({
      id: `${episodeId}-ADAPTIVE-BOREDOM`,
      contentType: 'ASSESSMENT',
      adaptiveTag: toStoredAdaptiveTag('boredom_disengagement'),
      scaffoldLevel: 3,
      isEnrichment: false,
      sequenceOrder: 30,
      status,
      contentData: {
        title: `تنشيط سريع: ${lesson.title}`,
        taskContextKey,
        question: 'لنحوّل هذه الفكرة إلى موقف عملي قصير.',
        prompt: `${lesson.objective}\n\nاختر الإجراء الأقرب للتطبيق أو اكتب كيف ستستخدم هذه الفكرة في مشروعك.`,
        hint: 'هذا النشاط القصير يعيد الانتباه إلى القيمة العملية للدرس قبل المتابعة.',
        options: buildAssessmentChoices(lesson, taskContextKey),
        adaptiveTriggerLabel: 'boredom_disengagement',
        autoGenerated: true,
        bootstrapKind: 'boredom_popup',
      },
    });
  }

  if (CONFUSION_TASK_KEYS.has(taskContextKey)) {
    contents.push({
      id: `${episodeId}-ADAPTIVE-CONFUSION`,
      contentType: 'TEXT',
      adaptiveTag: toStoredAdaptiveTag('confusion'),
      scaffoldLevel: 3,
      isEnrichment: false,
      sequenceOrder: 31,
      status,
      contentData: {
        title: `توضيح إضافي: ${lesson.title}`,
        text: `يبدو أن هذه الخطوة تحتاج إلى دعم إضافي.\n\n${lesson.objective}\n\nركّز أولًا على المطلوب الحالي فقط، ثم طبّق المثال المصغر قبل العودة إلى المهمة الرئيسية.`,
        note: 'يمكنك مراجعة المثال المصغر قبل المتابعة.',
        taskContextKey,
        adaptiveTriggerLabel: 'confusion',
        autoGenerated: true,
        bootstrapKind: 'confusion_support',
      },
    });
  }

  if (FRUSTRATION_TASK_KEYS.has(taskContextKey)) {
    contents.push({
      id: `${episodeId}-ADAPTIVE-FRUSTRATION`,
      contentType: 'TEXT',
      adaptiveTag: toStoredAdaptiveTag('frustration'),
      scaffoldLevel: 4,
      isEnrichment: false,
      sequenceOrder: 32,
      status,
      contentData: {
        title: `تقسيم المهمة: ${lesson.title}`,
        text: `لنقسّم المهمة إلى خطوات أصغر.\n\n${lesson.objective}\n\nابدأ بتحديد الإجراء الأول فقط، ثم راجع أثره قبل الانتقال إلى الخطوة التالية.`,
        note: 'مراجعة قصيرة قد تساعدك قبل المتابعة.',
        taskContextKey,
        adaptiveTriggerLabel: 'frustration',
        autoGenerated: true,
        bootstrapKind: 'frustration_support',
      },
    });
  }

  contents.push({
    id: `${episodeId}-ADAPTIVE-ENGAGEMENT`,
    contentType: 'TEXT',
    adaptiveTag: toStoredAdaptiveTag('high_engagement'),
    scaffoldLevel: 2,
    isEnrichment: true,
    sequenceOrder: 33,
    status,
    contentData: {
      title: `تحدٍ إضافي: ${lesson.title}`,
      text: `أداؤك مستقر، ويمكنك الآن تطبيق "${lesson.title}" في موقف أعمق.\n\nفكّر في كيف ستكيّف هذه الخطوة إذا تغيّر النطاق أو ظهرت قيود جديدة في المشروع.`,
      note: 'هذا التحدي اختياري ولا يوقف المسار الأساسي.',
      taskContextKey,
      adaptiveTriggerLabel: 'high_engagement',
      autoGenerated: true,
      bootstrapKind: 'high_engagement_path',
    },
  });

  return contents;
}

export function buildBootstrapQuiz(
  moduleId: string,
  episodeId: string,
  lesson: OutlineLesson,
  status: PublishStatus,
): BootstrapQuizDescriptor | null {
  if (lesson.lessonType !== 'assessment_checkpoint') return null;

  return {
    title: `نقطة تحقق: ${lesson.title}`,
    description: `اختبار قصير تلقائي يراجع الفكرة الأساسية في هذا الدرس. يمكنك تعديله لاحقًا من منشئ المقرر.`,
    scope: 'lesson',
    passingScore: 70,
    attemptLimit: 2,
    showExplanationAfterSubmit: true,
    allowRetry: true,
    adaptiveOnFail: 'clarification_support',
    adaptiveOnPass: 'challenge_path',
    sequenceOrder: 1,
    isPublished: status === 'published',
    questions: [
      {
        questionType: 'mcq',
        questionText: `أي إجراء يرتبط مباشرة بدرس "${lesson.title}"؟`,
        explanation: 'الإجابة الصحيحة هي التي تعبّر عن الهدف التعليمي المباشر لهذا الدرس داخل مسار المشروع.',
        hint: 'اختر الخيار الذي يطابق الهدف المختصر للدرس.',
        weight: 1,
        sequenceOrder: 1,
        choices: [
          { choiceText: lesson.objective, isCorrect: true, sequenceOrder: 1 },
          { choiceText: 'تجاوز التحليل والانتقال المباشر إلى التنفيذ', isCorrect: false, sequenceOrder: 2 },
          { choiceText: 'إلغاء دور أصحاب المصلحة في هذه المرحلة', isCorrect: false, sequenceOrder: 3 },
          { choiceText: 'تأجيل توثيق القرار حتى نهاية المشروع', isCorrect: false, sequenceOrder: 4 },
        ],
      },
      {
        questionType: 'true_false',
        questionText: `صواب أم خطأ: يركّز هذا الدرس على "${lesson.title}" بوصفها خطوة مرتبطة بتحسين إدارة المشروع التعليمي.`,
        explanation: 'هذه العبارة صحيحة لأن هذا الدرس جزء من مسار إدارة مشروع التصميم التعليمي ويقود إلى تطبيق مباشر داخل العمل.',
        hint: 'اربط عنوان الدرس بهدفه المختصر قبل الإجابة.',
        weight: 1,
        sequenceOrder: 2,
        choices: [
          { choiceText: 'صحيح', isCorrect: true, sequenceOrder: 1 },
          { choiceText: 'خطأ', isCorrect: false, sequenceOrder: 2 },
        ],
      },
    ],
  };
}

function buildContentUpdatePayload(content: BootstrapContentDescriptor) {
  return {
    contentType: content.contentType,
    // Keep bootstrap generation aligned with the canonical policy values even
    // while the generated Prisma client may lag behind enum/schema refreshes.
    adaptiveTag: content.adaptiveTag as any,
    contentData: content.contentData as Prisma.InputJsonValue,
    scaffoldLevel: content.scaffoldLevel,
    isEnrichment: content.isEnrichment,
    sequenceOrder: content.sequenceOrder,
    status: content.status,
  };
}

export async function ensureEpisodeBootstrap(
  tx: Prisma.TransactionClient,
  params: {
    moduleId: string;
    unitTitle: string;
    episodeId: string;
    lesson: OutlineLesson;
    status: PublishStatus;
  },
) {
  const desiredContents = buildBootstrapContents(
    params.episodeId,
    params.unitTitle,
    params.lesson,
    params.status,
  );
  const existingAutoContents = await tx.learningContent.findMany({
    where: {
      episodeId: params.episodeId,
    },
  });

  const desiredByKind = new Map(
    desiredContents.map((content) => [String(content.contentData.bootstrapKind), content]),
  );

  for (const content of existingAutoContents) {
    const bootstrapKind = String((content.contentData as Record<string, unknown>)?.bootstrapKind ?? '');
    const autoGenerated = Boolean((content.contentData as Record<string, unknown>)?.autoGenerated);
    if (!autoGenerated) continue;

    const desired = desiredByKind.get(bootstrapKind);
    if (!desired) {
      await tx.learningContent.delete({ where: { id: content.id } });
      continue;
    }

    await tx.learningContent.update({
      where: { id: content.id },
      data: buildContentUpdatePayload(desired),
    });
    desiredByKind.delete(bootstrapKind);
  }

  for (const content of desiredByKind.values()) {
    // Upsert, not create: a row may already exist at this deterministic id
    // without the autoGenerated marker (e.g. content authored before this
    // bootstrap logic), so the reconciliation loop above won't have claimed
    // it. A plain create would then hit a unique-constraint error on `id`.
    await tx.learningContent.upsert({
      where: { id: content.id },
      update: buildContentUpdatePayload(content),
      create: {
        id: content.id,
        episodeId: params.episodeId,
        ...buildContentUpdatePayload(content),
      },
    });
  }

  const desiredQuiz = buildBootstrapQuiz(params.moduleId, params.episodeId, params.lesson, params.status);
  if (!desiredQuiz) return;

  const existingQuiz = await tx.quiz.findFirst({
    where: {
      episodeId: params.episodeId,
      title: { startsWith: 'نقطة تحقق:' },
    },
    include: {
      questions: {
        include: { choices: true },
      },
    },
  });

  if (existingQuiz) {
    await tx.quiz.update({
      where: { id: existingQuiz.id },
      data: {
        title: desiredQuiz.title,
        description: desiredQuiz.description,
        moduleId: params.moduleId,
        passingScore: desiredQuiz.passingScore,
        attemptLimit: desiredQuiz.attemptLimit,
        showExplanationAfterSubmit: desiredQuiz.showExplanationAfterSubmit,
        allowRetry: desiredQuiz.allowRetry,
        adaptiveOnFail: desiredQuiz.adaptiveOnFail,
        adaptiveOnPass: desiredQuiz.adaptiveOnPass,
        sequenceOrder: desiredQuiz.sequenceOrder,
        isPublished: desiredQuiz.isPublished,
      },
    });

    for (const question of existingQuiz.questions) {
      await tx.quizChoice.deleteMany({ where: { questionId: question.id } });
      await tx.quizQuestion.delete({ where: { id: question.id } });
    }
  }

  const quiz = await tx.quiz.create({
    data: {
      title: desiredQuiz.title,
      description: desiredQuiz.description,
      scope: desiredQuiz.scope,
      moduleId: params.moduleId,
      episodeId: params.episodeId,
      passingScore: desiredQuiz.passingScore,
      attemptLimit: desiredQuiz.attemptLimit,
      showExplanationAfterSubmit: desiredQuiz.showExplanationAfterSubmit,
      allowRetry: desiredQuiz.allowRetry,
      adaptiveOnFail: desiredQuiz.adaptiveOnFail,
      adaptiveOnPass: desiredQuiz.adaptiveOnPass,
      sequenceOrder: desiredQuiz.sequenceOrder,
      isPublished: desiredQuiz.isPublished,
    },
  });

  for (const question of desiredQuiz.questions) {
    const createdQuestion = await tx.quizQuestion.create({
      data: {
        quizId: quiz.id,
        questionType: question.questionType,
        questionText: question.questionText,
        explanation: question.explanation,
        hint: question.hint,
        weight: question.weight,
        sequenceOrder: question.sequenceOrder,
      },
    });

    for (const choice of question.choices) {
      await tx.quizChoice.create({
        data: {
          questionId: createdQuestion.id,
          choiceText: choice.choiceText,
          isCorrect: choice.isCorrect,
          sequenceOrder: choice.sequenceOrder,
        },
      });
    }
  }
}

export async function deleteEpisodeGraph(tx: Prisma.TransactionClient, episodeId: string) {
  const promptIds = (
    await tx.reflectionPrompt.findMany({
      where: { episodeId },
      select: { id: true },
    })
  ).map((item) => item.id);

  const quizIds = (
    await tx.quiz.findMany({
      where: { episodeId },
      select: { id: true },
    })
  ).map((item) => item.id);

  const nodeIds = (
    await tx.branchingNode.findMany({
      where: { episodeId },
      select: { id: true },
    })
  ).map((item) => item.id);

  if (promptIds.length) {
    await tx.reflectionEntry.deleteMany({ where: { promptId: { in: promptIds } } });
    await tx.reflectionPrompt.deleteMany({ where: { id: { in: promptIds } } });
  }

  if (nodeIds.length) {
    await tx.branchingOutcome.deleteMany({ where: { nodeId: { in: nodeIds } } });
    await tx.branchingNode.deleteMany({ where: { id: { in: nodeIds } } });
  }

  await tx.emotionEvent.deleteMany({ where: { episodeId } });
  await tx.behaviorWindow.deleteMany({ where: { episodeId } });
  await tx.adaptiveEvent.deleteMany({ where: { episodeId } });
  await tx.learningContent.deleteMany({ where: { episodeId } });

  if (quizIds.length) {
    await tx.quizQuestionAttempt.deleteMany({ where: { attempt: { quizId: { in: quizIds } } } });
    await tx.quizAttempt.deleteMany({ where: { quizId: { in: quizIds } } });
    await tx.quiz.deleteMany({ where: { id: { in: quizIds } } });
  }

  await tx.quizAttempt.updateMany({
    where: { episodeId },
    data: { episodeId: null },
  });

  // Use raw deletion here because some legacy rows still carry pre-v2 enum
  // values in emotional_trigger_expected, and Prisma may try to deserialize
  // them even when the new outline is replacing the old structure entirely.
  await tx.$executeRaw`DELETE FROM "episode" WHERE "id" = ${episodeId}`;
}

export async function deleteModuleGraph(tx: Prisma.TransactionClient, moduleId: string) {
  const episodeIds = (
    await tx.episode.findMany({
      where: { moduleId },
      select: { id: true },
      orderBy: { sequenceOrder: 'asc' },
    })
  ).map((item) => item.id);

  const sessionIds = (
    await tx.session.findMany({
      where: { moduleId },
      select: { id: true },
    })
  ).map((item) => item.id);

  const modulePromptIds = (
    await tx.reflectionPrompt.findMany({
      where: { moduleId },
      select: { id: true },
    })
  ).map((item) => item.id);

  if (modulePromptIds.length) {
    await tx.reflectionEntry.deleteMany({ where: { promptId: { in: modulePromptIds } } });
    await tx.reflectionPrompt.deleteMany({ where: { id: { in: modulePromptIds } } });
  }

  if (sessionIds.length) {
    await tx.artifactSubmission.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.reflectionEntry.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.emotionEvent.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.behaviorWindow.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.adaptiveEvent.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.quizQuestionAttempt.deleteMany({ where: { attempt: { sessionId: { in: sessionIds } } } });
    await tx.quizAttempt.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.session.deleteMany({ where: { id: { in: sessionIds } } });
  }

  await tx.moduleProgress.deleteMany({ where: { moduleId } });
  await tx.competencyRecord.deleteMany({ where: { moduleId } });

  const unitQuizIds = (
    await tx.quiz.findMany({
      where: { moduleId, scope: 'unit' },
      select: { id: true },
    })
  ).map((item) => item.id);

  if (unitQuizIds.length) {
    await tx.quizQuestionAttempt.deleteMany({ where: { attempt: { quizId: { in: unitQuizIds } } } });
    await tx.quizAttempt.deleteMany({ where: { quizId: { in: unitQuizIds } } });
    await tx.quiz.deleteMany({ where: { id: { in: unitQuizIds } } });
  }

  for (const episodeId of episodeIds) {
    await deleteEpisodeGraph(tx, episodeId);
  }

  await tx.quizAttempt.updateMany({
    where: { moduleId },
    data: { moduleId: null },
  });

  // Match the legacy-safe deletion approach used for episodes above.
  await tx.$executeRaw`DELETE FROM "module" WHERE "id" = ${moduleId}`;
}
