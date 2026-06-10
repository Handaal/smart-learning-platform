import {
  CANONICAL_ADAPTIVE_SCENARIOS,
  type CanonicalAdaptiveScenarioKey,
} from '@policy/adaptive-alerts-policy';

export type CoursePublicationStatus = 'draft' | 'published';

export type ResearchLessonType =
  | 'introduction'
  | 'core_lesson'
  | 'interactive_activity'
  | 'case_scenario'
  | 'assessment_checkpoint'
  | 'summary_closure';

export type CourseShellDraft = {
  title: string;
  description: string;
  targetAudience: string;
  language: string;
  estimatedDuration: string;
  coverUrl: string;
  courseType: 'research_training_course';
  publicationStatus: CoursePublicationStatus;
  adaptivePolicyEnabled: boolean;
  allowHighEngagementPath: boolean;
  allowAssessmentReassurance: boolean;
  adaptiveLessonTypes: ResearchLessonType[];
};

export type SuggestedLesson = {
  title: string;
  objective: string;
  durationMin: number;
  lessonType: ResearchLessonType;
  source: 'drive' | 'docs';
};

export type SuggestedUnit = {
  title: string;
  shortSummary: string;
  estimatedDurationMin: number;
  lessons: SuggestedLesson[];
};

export type AdaptiveScenarioCard = {
  key: CanonicalAdaptiveScenarioKey;
  name: string;
  interpretation: string;
  uiShape: string;
  activationSummary: string;
  contexts: string[];
  locked: boolean;
};

export type BuilderValidation = {
  blocking: string[];
  warnings: string[];
  checks: {
    hasCourseTitle: boolean;
    hasDescription: boolean;
    hasTargetAudience: boolean;
    hasDuration: boolean;
    hasUnits: boolean;
    hasLessons: boolean;
    hasPreTest: boolean;
    hasPostTest: boolean;
    preTestHasQuestions: boolean;
    postTestHasQuestions: boolean;
  };
};

export type AssessmentTemplateQuestion = {
  questionType: 'mcq' | 'true_false';
  questionText: string;
  explanation: string;
  hint?: string;
  choices: Array<{ choiceText: string; isCorrect: boolean; sequenceOrder: number }>;
};

export const RESEARCH_COURSE_KEY = 'step-adaptive-training';
export const COURSE_BUILDER_DRAFT_KEY = 'step.research-course-builder.v2';

export const DEFAULT_COURSE_SHELL: CourseShellDraft = {
  title: 'برنامج التدريب الذكي لإدارة مشاريع التصميم التعليمي',
  description:
    'برنامج تدريبي بحثي يطوّر مهارات إدارة مشاريع التصميم التعليمي من خلال محتوى منظم، أنشطة تطبيقية، واختبارات قبلية وبعدية داخل بيئة تدريب ذكية.',
  targetAudience: 'مطورو المحتوى والمصممون التعليميون وفرق تطوير التعلم الإلكتروني',
  language: 'العربية',
  estimatedDuration: '6 وحدات تدريبية + مقدمة وتمهيد + اختبارات قبلية وبعدية',
  coverUrl: '',
  courseType: 'research_training_course',
  publicationStatus: 'draft',
  adaptivePolicyEnabled: true,
  allowHighEngagementPath: true,
  allowAssessmentReassurance: true,
  adaptiveLessonTypes: ['core_lesson', 'interactive_activity', 'case_scenario', 'assessment_checkpoint'],
};

export const LESSON_TYPE_OPTIONS: Array<{ value: ResearchLessonType; label: string }> = [
  { value: 'introduction', label: 'تمهيد / مقدمة' },
  { value: 'core_lesson', label: 'درس أساسي' },
  { value: 'interactive_activity', label: 'نشاط تفاعلي' },
  { value: 'case_scenario', label: 'حالة / سيناريو' },
  { value: 'assessment_checkpoint', label: 'نقطة تحقق / تقييم' },
  { value: 'summary_closure', label: 'ملخص / إغلاق' },
];

export function toStoredLessonType(type: ResearchLessonType) {
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

export function fromStoredLessonType(type: string | null | undefined): ResearchLessonType {
  switch (String(type ?? '').trim()) {
    case 'scenario':
      return 'case_scenario';
    case 'interactive':
      return 'interactive_activity';
    case 'assessment':
      return 'assessment_checkpoint';
    case 'reflection':
      return 'summary_closure';
    case 'guided':
      return 'core_lesson';
    default:
      return 'core_lesson';
  }
}

export const ADAPTIVE_POLICY_OVERVIEW = {
  label: 'Adaptive Support Policy v2',
  summary: [
    'النموذج الهجين مفعّل للمجموعة التجريبية فقط.',
    'عتبة الثقة الانفعالية: 0.70',
    'نافذة القرار المتحركة: 15 ثانية',
    'التهدئة بين التدخلات: 60–90 ثانية',
    'الرجوع إلى منطق الأداء فقط عند غياب الوجه أو انخفاض الثقة.',
    'لا يتم حفظ الفيديو الخام افتراضيًا.',
  ],
};

export const ADAPTIVE_SCENARIO_CARDS: AdaptiveScenarioCard[] = [
  {
    key: 'confusion',
    name: 'الارتباك',
    interpretation: 'مؤشر على حاجة المتعلم إلى تبسيط الخطوة أو توضيحها عندما يستمر التردد ويترافق مع أخطاء ذات معنى.',
    uiShape: 'لوحة جانبية',
    activationSummary: 'ثقة ≥ 0.70، استمرار 12–15 ثانية، وسياق مهمة منظمة مع خطأين أو تردد متكرر.',
    contexts: ['هيكل تقسيم العمل WBS', 'تحليل النطاق', 'تحليل المخاطر', 'ربط الاعتماديات'],
    locked: true,
  },
  {
    key: 'frustration',
    name: 'الإحباط',
    interpretation: 'مؤشر على فقدان السيطرة المتصورة بعد محاولات غير ناجحة أو تجاوز الزمن المتوقع للمهمة.',
    uiShape: 'شريط مهام مصغرة',
    activationSummary: 'ثقة ≥ 0.70، استمرار 15–20 ثانية، مع 3 أخطاء أو تجاوز واضح للزمن المتوقع.',
    contexts: ['الجدولة', 'التكلفة', 'تخصيص الموارد', 'المهام المركبة والمتسلسلة'],
    locked: true,
  },
  {
    key: 'boredom_disengagement',
    name: 'الملل / انخفاض الانخراط',
    interpretation: 'مؤشر على ضعف القيمة المدركة أو طول التعرض السلبي للمحتوى النظري دون تفاعل كافٍ.',
    uiShape: 'بطاقة منبثقة',
    activationSummary: 'ثقة ≥ 0.70، استمرار 15–20 ثانية، مع محتوى نظري وخمول أو ضعف في التفاعل.',
    contexts: ['المحتوى النظري', 'القراءة الطويلة', 'العروض التوضيحية قليلة التفاعل'],
    locked: true,
  },
  {
    key: 'high_engagement',
    name: 'الانخراط العالي',
    interpretation: 'مؤشر على جاهزية للانتقال إلى مستوى أعمق أو مهمة تحويلية أكثر تقدمًا دون مقاطعة مشتتة.',
    uiShape: 'مسار متقدم',
    activationSummary: 'ثقة ≥ 0.70، أداء قوي ومستقر، ودقة مرتفعة مع سلوك إكمال يدل على الجاهزية.',
    contexts: ['أنشطة الإتقان', 'حالات النقل والتطبيق', 'التحديات الإثرائية'],
    locked: false,
  },
  {
    key: 'test_anxiety',
    name: 'القلق أثناء الاختبار',
    interpretation: 'مؤشر على تحول الانتباه من المطلوب الأكاديمي إلى التردد أو الخوف الإجرائي أثناء التقييم.',
    uiShape: 'نافذة معلومات',
    activationSummary: 'ثقة ≥ 0.70، استمرار 10–15 ثانية، وسياق تقييم مع مؤشرات تردد أو تجمد.',
    contexts: ['الاختبار القبلي', 'الاختبار البعدي', 'نقاط التحقق', 'الاختبارات داخل الدرس'],
    locked: false,
  },
  {
    key: 'neutral',
    name: 'الحياد',
    interpretation: 'حالة مستقرة بأداء مقبول لا تستدعي أي تدخل عاطفي إضافي حفاظًا على تركيز المتعلم.',
    uiShape: 'مسار أساسي',
    activationSummary: 'أداء مقبول، لا أخطاء متكررة، ولا خمول أو مؤشرات سلبية مستمرة.',
    contexts: ['جميع سياقات التعلم المستقرة'],
    locked: true,
  },
  {
    key: 'no_face_low_confidence',
    name: 'فقدان الوجه / انخفاض الثقة',
    interpretation: 'لا توجد إشارة بصرية موثوقة كافية، لذا تتحول المنصة إلى منطق الأداء فقط دون استنتاج انفعالي.',
    uiShape: 'بروتوكول الأمان التشغيلي',
    activationSummary: 'لا وجه، أو ثقة أقل من 0.70، أو زاوية/إضاءة/حجب يمنع الاستدلال الموثوق.',
    contexts: ['جميع الجلسات التكيفية عند انخفاض الجودة البصرية'],
    locked: true,
  },
];

export const SUGGESTED_OUTLINE: SuggestedUnit[] = [
  {
    title: 'مقدمة الدورة',
    shortSummary: 'تهيئة المتدرب لمسار التدريب، تعريفه بطبيعة البرنامج، وبناء تصور أولي عن المشروع ودور المصمم التعليمي فيه.',
    estimatedDurationMin: 30,
    lessons: [
      {
        title: 'مقدمة الدورة التدريبية',
        objective: 'التعرف إلى الهدف العام للدورة ومسار التعلّم البحثي داخل البيئة التدريبية.',
        durationMin: 10,
        lessonType: 'introduction',
        source: 'drive',
      },
      {
        title: 'الدرس التمهيدي: ما هو المشروع؟ ولماذا يجب أن أفهمه كمصمم تعليمي؟',
        objective: 'بناء فهم أولي للمشروع التعليمي بوصفه جهدًا منظمًا يحتاج إلى إدارة واعية للوقت والنطاق والموارد.',
        durationMin: 20,
        lessonType: 'core_lesson',
        source: 'drive',
      },
    ],
  },
  {
    title: 'الوحدة الأولى',
    shortSummary: 'إدارة مرحلة بدء المشروع وربط أهدافه بالسياق الاستراتيجي وتحديد أصحاب المصلحة والموارد الأولية.',
    estimatedDurationMin: 110,
    lessons: [
      {
        title: 'مقدمة إلى مرحلة ما قبل البدء وأهدافها',
        objective: 'فهم دور مرحلة البدء في تأسيس المشروع قبل الدخول في التخطيط والتنفيذ.',
        durationMin: 15,
        lessonType: 'introduction',
        source: 'drive',
      },
      {
        title: 'ربط أهداف المشروع بالأهداف الاستراتيجية',
        objective: 'تحليل علاقة المشروع بالأهداف الاستراتيجية للمؤسسة قبل تحديد نطاقه.',
        durationMin: 20,
        lessonType: 'core_lesson',
        source: 'drive',
      },
      {
        title: 'إعداد ميثاق المشروع',
        objective: 'صياغة ميثاق مشروع أولي يوضح الغاية، الحدود، والالتزامات الأساسية.',
        durationMin: 20,
        lessonType: 'interactive_activity',
        source: 'drive',
      },
      {
        title: 'تحديد أصحاب المصلحة وتحليل احتياجاتهم',
        objective: 'تحديد الفئات المؤثرة في المشروع وتحليل احتياجاتها وتوقعاتها.',
        durationMin: 20,
        lessonType: 'case_scenario',
        source: 'drive',
      },
      {
        title: 'الحصول على الموافقات والموارد',
        objective: 'تأمين الموافقات والموارد الأولية اللازمة لبدء المشروع بشكل رسمي.',
        durationMin: 15,
        lessonType: 'core_lesson',
        source: 'drive',
      },
      {
        title: 'تشكيل فريق المشروع الابتدائي',
        objective: 'اختيار الأدوار الأساسية للفريق وتحديد مسؤوليات الانطلاق المبكر.',
        durationMin: 10,
        lessonType: 'interactive_activity',
        source: 'drive',
      },
      {
        title: 'عقد الاجتماع الافتتاحي',
        objective: 'إدارة الاجتماع الافتتاحي لتوحيد الفهم والاتفاق على الانطلاق.',
        durationMin: 10,
        lessonType: 'summary_closure',
        source: 'drive',
      },
    ],
  },
  {
    title: 'الوحدة الثانية',
    shortSummary: 'تخطيط المشروع وتصميم عملياته من خلال النطاق، WBS، الجدول، التكلفة، الجودة، الاتصالات، المخاطر، والمشتريات.',
    estimatedDurationMin: 180,
    lessons: [
      {
        title: 'وضع خطة إدارة نطاق المشروع',
        objective: 'بناء خطة عملية لإدارة النطاق والمحافظة على الحدود المتفق عليها.',
        durationMin: 18,
        lessonType: 'core_lesson',
        source: 'drive',
      },
      {
        title: 'إعداد هيكل تقسيم العمل',
        objective: 'تفكيك المشروع إلى حزم عمل يمكن متابعتها وتقديرها بدقة.',
        durationMin: 22,
        lessonType: 'interactive_activity',
        source: 'drive',
      },
      {
        title: 'تطوير الجدول الزمني التفصيلي للمشروع',
        objective: 'تحويل حزم العمل إلى تسلسل زمني واضح مع المدد والاعتماديات.',
        durationMin: 20,
        lessonType: 'core_lesson',
        source: 'drive',
      },
      {
        title: 'تقدير التكاليف وإعداد الميزانية',
        objective: 'تقدير التكاليف وبناء ميزانية متسقة مع متطلبات المشروع.',
        durationMin: 18,
        lessonType: 'core_lesson',
        source: 'drive',
      },
      {
        title: 'تخطيط الموارد البشرية والمادية',
        objective: 'توزيع الموارد البشرية والمادية بما يضمن فاعلية التنفيذ.',
        durationMin: 18,
        lessonType: 'interactive_activity',
        source: 'drive',
      },
      {
        title: 'وضع خطة جودة المشروع',
        objective: 'تحديد معايير الجودة وآليات التحقق منها خلال العمل.',
        durationMin: 15,
        lessonType: 'core_lesson',
        source: 'drive',
      },
      {
        title: 'إعداد خطة الاتصالات',
        objective: 'تخطيط تدفق المعلومات والتقارير بين الأطراف المعنية.',
        durationMin: 15,
        lessonType: 'core_lesson',
        source: 'drive',
      },
      {
        title: 'تحليل وتخطيط إدارة المخاطر',
        objective: 'التعرف إلى المخاطر المحتملة ووضع استجابات أولية لها.',
        durationMin: 20,
        lessonType: 'case_scenario',
        source: 'drive',
      },
      {
        title: 'تخطيط المشتريات والتوريدات',
        objective: 'تحديد ما يجب شراؤه أو توريده وكيفية متابعة ذلك ضمن الخطة.',
        durationMin: 12,
        lessonType: 'core_lesson',
        source: 'drive',
      },
      {
        title: 'تطوير خطة إشراك أصحاب المصلحة',
        objective: 'بناء خطة عملية للحفاظ على تفاعل أصحاب المصلحة والتأثير الإيجابي لهم.',
        durationMin: 12,
        lessonType: 'summary_closure',
        source: 'drive',
      },
    ],
  },
  {
    title: 'الوحدة الثالثة',
    shortSummary: 'تنفيذ خطة المشروع وتنسيق المهام وتحويل التخطيط إلى متابعة عملية متماسكة داخل بيئة العمل.',
    estimatedDurationMin: 95,
    lessons: [
      {
        title: 'إطلاق تنفيذ خطة المشروع',
        objective: 'بدء تنفيذ الخطة وتحويل القرارات التخطيطية إلى مهام تشغيلية واضحة.',
        durationMin: 20,
        lessonType: 'introduction',
        source: 'docs',
      },
      {
        title: 'تنسيق المهام والمسؤوليات اليومية',
        objective: 'تنظيم تدفق المهام بين أعضاء الفريق ومتابعة المسؤوليات الحرجة.',
        durationMin: 25,
        lessonType: 'interactive_activity',
        source: 'docs',
      },
      {
        title: 'معالجة الانحرافات أثناء التنفيذ',
        objective: 'التعامل مع العوائق والانحرافات التشغيلية قبل تحولها إلى مشكلات كبرى.',
        durationMin: 25,
        lessonType: 'case_scenario',
        source: 'docs',
      },
      {
        title: 'ملخص الوحدة الثالثة: تنفيذ الخطة وتنسيق المهام',
        objective: 'تلخيص مهارات التنفيذ والتنسيق وربطها بما يسبقها من تخطيط.',
        durationMin: 15,
        lessonType: 'summary_closure',
        source: 'drive',
      },
    ],
  },
  {
    title: 'الوحدة الرابعة',
    shortSummary: 'مراقبة أداء المشروع وضبطه من خلال المتابعة المالية والجودة والمخاطر والتغيير والتقارير.',
    estimatedDurationMin: 135,
    lessons: [
      {
        title: 'متابعة وضبط التكلفة والميزانية',
        objective: 'مراجعة الأداء المالي واتخاذ إجراءات تصحيحية عند ظهور انحرافات.',
        durationMin: 18,
        lessonType: 'core_lesson',
        source: 'drive',
      },
      {
        title: 'ضبط جودة المخرجات',
        objective: 'التأكد من أن مخرجات المشروع تحقق المعايير المتفق عليها.',
        durationMin: 18,
        lessonType: 'interactive_activity',
        source: 'drive',
      },
      {
        title: 'مراقبة وتحديث خطط المخاطر',
        objective: 'تحديث مصفوفة المخاطر واستجاباتها بناءً على ما يحدث أثناء التنفيذ.',
        durationMin: 18,
        lessonType: 'case_scenario',
        source: 'drive',
      },
      {
        title: 'إدارة طلبات التغيير الرسمية',
        objective: 'معالجة طلبات التغيير رسميًا دون الإضرار بضبط المشروع.',
        durationMin: 18,
        lessonType: 'core_lesson',
        source: 'drive',
      },
      {
        title: 'توثيق المشكلات والمعوقات وحلها',
        objective: 'رصد المشكلات وتوثيقها وبناء مسار واضح للمعالجة والتتبع.',
        durationMin: 18,
        lessonType: 'interactive_activity',
        source: 'drive',
      },
      {
        title: 'إعداد تقارير حالة المشروع',
        objective: 'إعداد تقارير حالة واضحة تدعم اتخاذ القرار والمتابعة.',
        durationMin: 18,
        lessonType: 'core_lesson',
        source: 'drive',
      },
      {
        title: 'ملخص الوحدة الرابعة: مراقبة الأداء وضبطه',
        objective: 'تجميع عناصر المتابعة والضبط في صورة تشغيلية مترابطة.',
        durationMin: 12,
        lessonType: 'summary_closure',
        source: 'drive',
      },
    ],
  },
  {
    title: 'الوحدة الخامسة',
    shortSummary: 'إغلاق المشروع وتوثيق نتائجه والقبول النهائي والدروس المستفادة والإجراءات الختامية.',
    estimatedDurationMin: 110,
    lessons: [
      {
        title: 'التحقق من إتمام جميع أنشطة المشروع',
        objective: 'مراجعة جميع الأنشطة والتأكد من اكتمالها قبل الإغلاق الرسمي.',
        durationMin: 18,
        lessonType: 'core_lesson',
        source: 'drive',
      },
      {
        title: 'الحصول على القبول النهائي الرسمي',
        objective: 'استكمال متطلبات القبول النهائي للمشروع مع الجهة المعنية.',
        durationMin: 18,
        lessonType: 'interactive_activity',
        source: 'drive',
      },
      {
        title: 'إعداد التقرير النهائي للمشروع',
        objective: 'صياغة تقرير نهائي يوجز المخرجات والدروس والحالة الختامية.',
        durationMin: 18,
        lessonType: 'core_lesson',
        source: 'drive',
      },
      {
        title: 'توثيق الدروس المستفادة',
        objective: 'استخلاص الدروس المستفادة وتحويلها إلى معرفة قابلة للاستخدام لاحقًا.',
        durationMin: 18,
        lessonType: 'case_scenario',
        source: 'drive',
      },
      {
        title: 'إتمام الإجراءات الإدارية والمالية',
        objective: 'إغلاق الالتزامات الإدارية والمالية المرتبطة بالمشروع.',
        durationMin: 18,
        lessonType: 'core_lesson',
        source: 'drive',
      },
      {
        title: 'عقد الاجتماع الختامي',
        objective: 'إدارة الاجتماع الختامي وتثبيت المعارف والخلاصات النهائية.',
        durationMin: 12,
        lessonType: 'summary_closure',
        source: 'drive',
      },
    ],
  },
  {
    title: 'الوحدة السادسة',
    shortSummary: 'تطبيق المهارات المهنية لقيادة المشروع عبر المسؤوليات، التحليل، التفاوض، الذكاء العاطفي، والقيادة واتخاذ القرار.',
    estimatedDurationMin: 240,
    lessons: [
      { title: 'فهم دور ومسؤوليات مدير المشروع', objective: 'فهم الدور القيادي والإجرائي لمدير المشروع داخل المشاريع التعليمية.', durationMin: 12, lessonType: 'introduction', source: 'drive' },
      { title: 'الإلمام بالمهارات التقنية الخاصة بالمجال', objective: 'ربط قيادة المشروع بالمعرفة التقنية الضرورية للمجال.', durationMin: 12, lessonType: 'core_lesson', source: 'drive' },
      { title: 'تطبيق مهارات تحليل الأعمال', objective: 'استخدام تحليل الأعمال لدعم قرارات المشروع ومتطلباته.', durationMin: 12, lessonType: 'interactive_activity', source: 'drive' },
      { title: 'إظهار مهارات التفاوض', objective: 'تطبيق التفاوض لحل تضارب المصالح أو المواعيد أو الموارد.', durationMin: 12, lessonType: 'case_scenario', source: 'drive' },
      { title: 'التخطيط الاستراتيجي والتكتيكي', objective: 'التوازن بين النظرة الاستراتيجية وإدارة الخطوات التنفيذية القريبة.', durationMin: 12, lessonType: 'core_lesson', source: 'drive' },
      { title: 'الاهتمام بالتفاصيل', objective: 'تعزيز دقة المتابعة دون فقدان الرؤية الكلية للمشروع.', durationMin: 12, lessonType: 'core_lesson', source: 'drive' },
      { title: 'تعزيز الذكاء العاطفي', objective: 'دعم الذكاء العاطفي في مواقف التعاون والضغط واتخاذ القرار.', durationMin: 12, lessonType: 'interactive_activity', source: 'drive' },
      { title: 'السلوك الأخلاقي والاحترافي', objective: 'ترسيخ السلوك الأخلاقي والمهني في إدارة الفرق والمخرجات.', durationMin: 12, lessonType: 'core_lesson', source: 'drive' },
      { title: 'قيادة فرق المشروع', objective: 'إدارة الفريق وتوجيهه وتحفيزه في سياقات المشروع المختلفة.', durationMin: 14, lessonType: 'interactive_activity', source: 'drive' },
      { title: 'إدارة وتنسيق عدة مشاريع متزامنة', objective: 'تنظيم العمل عند تعدد المشاريع أو المبادرات المتوازية.', durationMin: 14, lessonType: 'case_scenario', source: 'drive' },
      { title: 'إدارة الانتقالات بين المراحل', objective: 'تأمين الانتقال السلس بين مراحل المشروع المختلفة.', durationMin: 12, lessonType: 'core_lesson', source: 'drive' },
      { title: 'التوازن بين الموارد والميزانية والنتائج', objective: 'اتخاذ قرارات مهنية متوازنة بين الكلفة والموارد والنتيجة المتوقعة.', durationMin: 14, lessonType: 'interactive_activity', source: 'drive' },
      { title: 'تنسيق تنفيذ العمليات الرئيسية', objective: 'ضبط العمليات الحرجة وضمان تكاملها أثناء القيادة الفعلية للمشروع.', durationMin: 12, lessonType: 'core_lesson', source: 'drive' },
      { title: 'التدخل لحل الأهداف الغامضة', objective: 'توضيح الأهداف الغامضة وتوجيه الفريق نحو فهم مشترك.', durationMin: 12, lessonType: 'case_scenario', source: 'drive' },
      { title: 'إزالة حواجز الموارد', objective: 'معالجة العوائق المتعلقة بالموارد قبل تأثيرها على الإنجاز.', durationMin: 12, lessonType: 'interactive_activity', source: 'drive' },
      { title: 'تمكين الأعضاء من اتخاذ القرار', objective: 'توسيع المشاركة في القرار مع الحفاظ على ضبط المشروع.', durationMin: 12, lessonType: 'interactive_activity', source: 'drive' },
      { title: 'توثيق القرارات الحاسمة', objective: 'توثيق القرارات الحرجة بما يضمن الشفافية وسهولة الرجوع.', durationMin: 12, lessonType: 'summary_closure', source: 'drive' },
    ],
  },
];

export const PRETEST_SAMPLE_QUESTIONS: AssessmentTemplateQuestion[] = [
  {
    questionType: 'mcq',
    questionText: 'ما الهدف الأساسي من الاختبار القبلي داخل هذه البيئة التدريبية؟',
    explanation: 'الاختبار القبلي يستخدم لرصد المستوى المبدئي للمتعلم قبل بدء البرنامج وليس للحكم النهائي عليه.',
    choices: [
      { choiceText: 'قياس المستوى المبدئي قبل بدء التدريب', isCorrect: true, sequenceOrder: 1 },
      { choiceText: 'إعلان النجاح النهائي في المقرر', isCorrect: false, sequenceOrder: 2 },
      { choiceText: 'استبدال الأنشطة التطبيقية بالكامل', isCorrect: false, sequenceOrder: 3 },
      { choiceText: 'إلغاء الحاجة إلى التقييم البعدي', isCorrect: false, sequenceOrder: 4 },
    ],
  },
  {
    questionType: 'mcq',
    questionText: 'أي خيار يعبّر بدقة عن وظيفة هيكل تقسيم العمل WBS؟',
    explanation: 'وظيفة WBS هي تفكيك المشروع إلى مكونات وحزم عمل منظمة يمكن متابعتها وتقديرها.',
    choices: [
      { choiceText: 'تفكيك المشروع إلى حزم عمل منظمة', isCorrect: true, sequenceOrder: 1 },
      { choiceText: 'إظهار شكل التقرير النهائي فقط', isCorrect: false, sequenceOrder: 2 },
      { choiceText: 'استبدال جدول المشروع بالكامل', isCorrect: false, sequenceOrder: 3 },
      { choiceText: 'تحديد علامات الاختبار البعدي فقط', isCorrect: false, sequenceOrder: 4 },
    ],
  },
  {
    questionType: 'true_false',
    questionText: 'تحديد أصحاب المصلحة وتحليل احتياجاتهم يحدث فقط بعد انتهاء تنفيذ المشروع.',
    explanation: 'تحليل أصحاب المصلحة يبدأ مبكرًا جدًا لأنه يؤثر في النطاق، التواصل، والموافقات منذ البداية.',
    choices: [
      { choiceText: 'صحيح', isCorrect: false, sequenceOrder: 1 },
      { choiceText: 'خطأ', isCorrect: true, sequenceOrder: 2 },
    ],
  },
  {
    questionType: 'mcq',
    questionText: 'أي عنصر يُعد جزءًا مباشرًا من تخطيط المخاطر؟',
    explanation: 'تخطيط المخاطر يشمل تحديد المخاطر وتقدير أثرها واحتمالها ووضع استجابات مناسبة لها.',
    choices: [
      { choiceText: 'تحديد المخاطر ووضع استجابات لها', isCorrect: true, sequenceOrder: 1 },
      { choiceText: 'تجاهل المتغيرات غير المؤكدة', isCorrect: false, sequenceOrder: 2 },
      { choiceText: 'تأجيل مراجعة الجودة إلى ما بعد الإغلاق فقط', isCorrect: false, sequenceOrder: 3 },
      { choiceText: 'الاعتماد على التخمين بدل التوثيق', isCorrect: false, sequenceOrder: 4 },
    ],
  },
  {
    questionType: 'true_false',
    questionText: 'التواصل الفعّال مع أصحاب المصلحة يساعد على تقليل سوء الفهم ودعم سير المشروع.',
    explanation: 'التواصل الواضح يرفع من وضوح التوقعات ويقلل تضارب الفهم أثناء تنفيذ المشروع.',
    choices: [
      { choiceText: 'صحيح', isCorrect: true, sequenceOrder: 1 },
      { choiceText: 'خطأ', isCorrect: false, sequenceOrder: 2 },
    ],
  },
];

export const POSTTEST_SAMPLE_QUESTIONS: AssessmentTemplateQuestion[] = [
  {
    questionType: 'mcq',
    questionText: 'عند ظهور طلب تغيير رسمي أثناء التنفيذ، ما الخطوة الأكثر اتساقًا مع إدارة المشروع؟',
    explanation: 'إدارة التغيير تتطلب توثيق الطلب وتحليل أثره قبل اعتماده أو رفضه.',
    choices: [
      { choiceText: 'توثيق الطلب وتحليل أثره قبل اتخاذ القرار', isCorrect: true, sequenceOrder: 1 },
      { choiceText: 'تنفيذ الطلب مباشرة دون مراجعة', isCorrect: false, sequenceOrder: 2 },
      { choiceText: 'رفض الطلب تلقائيًا في جميع الحالات', isCorrect: false, sequenceOrder: 3 },
      { choiceText: 'إخفاء أثر الطلب عن الفريق', isCorrect: false, sequenceOrder: 4 },
    ],
  },
  {
    questionType: 'mcq',
    questionText: 'أي مخرج يعكس الإغلاق الجيد للمشروع؟',
    explanation: 'الإغلاق الجيد يشمل القبول النهائي، التقرير الختامي، وتوثيق الدروس المستفادة.',
    choices: [
      { choiceText: 'توثيق الدروس المستفادة واستكمال التقرير النهائي', isCorrect: true, sequenceOrder: 1 },
      { choiceText: 'إيقاف التواصل دون توثيق', isCorrect: false, sequenceOrder: 2 },
      { choiceText: 'ترك الالتزامات الإدارية دون إغلاق', isCorrect: false, sequenceOrder: 3 },
      { choiceText: 'تأجيل القبول النهائي إلى إشعار آخر', isCorrect: false, sequenceOrder: 4 },
    ],
  },
  {
    questionType: 'true_false',
    questionText: 'الحياد مع أداء مقبول في السياسة التكيفية الجديدة يعني غالبًا عدم الحاجة إلى تنبيه إضافي.',
    explanation: 'السياسة الجديدة تمنع الإفراط في التكيف عندما يكون الأداء مستقرًا ولا توجد مؤشرات سلبية مستمرة.',
    choices: [
      { choiceText: 'صحيح', isCorrect: true, sequenceOrder: 1 },
      { choiceText: 'خطأ', isCorrect: false, sequenceOrder: 2 },
    ],
  },
  {
    questionType: 'mcq',
    questionText: 'ما أفضل تفسير لتدخل "الانخراط العالي" في البيئة الذكية؟',
    explanation: 'هذا التدخل لا يقاطع المتعلم، بل يفتح مسارًا أكثر عمقًا عندما يكون الأداء قويًا ومستقرًا.',
    choices: [
      { choiceText: 'فتح مهمة أو مسار متقدم لتعميق التعلم', isCorrect: true, sequenceOrder: 1 },
      { choiceText: 'إيقاف النشاط الحالي لتخفيف التحدي', isCorrect: false, sequenceOrder: 2 },
      { choiceText: 'إجبار المتعلم على إعادة كل الخطوات السابقة', isCorrect: false, sequenceOrder: 3 },
      { choiceText: 'تعطيل المتابعة حتى نهاية الجلسة', isCorrect: false, sequenceOrder: 4 },
    ],
  },
  {
    questionType: 'true_false',
    questionText: 'إذا لم تُلتقط إشارة وجه موثوقة، تنتقل المنصة إلى منطق الأداء فقط بدل الاستدلال الانفعالي.',
    explanation: 'بروتوكول الأمان التشغيلي يمنع بناء قرار تكيفي انفعالي على بيانات ضعيفة أو غير موثوقة.',
    choices: [
      { choiceText: 'صحيح', isCorrect: true, sequenceOrder: 1 },
      { choiceText: 'خطأ', isCorrect: false, sequenceOrder: 2 },
    ],
  },
];

export function generateUnitId(order: number) {
  return `RC-U${String(order).padStart(2, '0')}`;
}

export function generateLessonId(unitId: string, order: number) {
  return `${unitId}-L${String(order).padStart(2, '0')}`;
}

export function getLessonTypeLabel(type: ResearchLessonType) {
  return LESSON_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function getScenarioTitle(key: CanonicalAdaptiveScenarioKey) {
  return CANONICAL_ADAPTIVE_SCENARIOS[key]?.learnerTitle.ar ?? ADAPTIVE_SCENARIO_CARDS.find((card) => card.key === key)?.name ?? key;
}

export function validateResearchCourseBuilder(input: {
  draft: CourseShellDraft;
  modules: Array<{ title: string; episodes?: Array<{ title: string }> }>;
  pretests: Array<{ questions?: unknown[] }>;
  posttests: Array<{ questions?: unknown[] }>;
}) : BuilderValidation {
  const lessons = input.modules.flatMap((module) => module.episodes ?? []);
  const firstPreTest = input.pretests[0];
  const firstPostTest = input.posttests[0];
  const missingUnitTitles = input.modules.some((module) => !module.title?.trim());
  const missingLessonTitles = lessons.some((lesson) => !lesson.title?.trim());

  const checks = {
    hasCourseTitle: input.draft.title.trim().length > 0,
    hasDescription: input.draft.description.trim().length > 0,
    hasTargetAudience: input.draft.targetAudience.trim().length > 0,
    hasDuration: input.draft.estimatedDuration.trim().length > 0,
    hasUnits: input.modules.length > 0,
    hasLessons: lessons.length > 0,
    hasPreTest: input.pretests.length > 0,
    hasPostTest: input.posttests.length > 0,
    preTestHasQuestions: (firstPreTest?.questions?.length ?? 0) > 0,
    postTestHasQuestions: (firstPostTest?.questions?.length ?? 0) > 0,
  };

  const blocking: string[] = [];
  const warnings: string[] = [];

  if (!checks.hasCourseTitle) blocking.push('عنوان المقرر مطلوب.');
  if (!checks.hasDescription) blocking.push('وصف المقرر مطلوب.');
  if (!checks.hasTargetAudience) blocking.push('الفئة المستهدفة مطلوبة.');
  if (!checks.hasDuration) blocking.push('المدة التقديرية الإجمالية مطلوبة.');
  if (!checks.hasUnits) blocking.push('يجب إضافة وحدة واحدة على الأقل.');
  if (!checks.hasLessons) blocking.push('يجب إضافة درس واحد على الأقل داخل المقرر.');
  if (!checks.hasPreTest) blocking.push('الاختبار القبلي إلزامي قبل النشر.');
  if (!checks.hasPostTest) blocking.push('الاختبار البعدي إلزامي قبل النشر.');
  if (checks.hasPreTest && !checks.preTestHasQuestions) blocking.push('الاختبار القبلي موجود لكن لا يحتوي على أسئلة.');
  if (checks.hasPostTest && !checks.postTestHasQuestions) blocking.push('الاختبار البعدي موجود لكن لا يحتوي على أسئلة.');
  // Research publishing is intentionally strict so the builder cannot ship an incomplete study instrument.
  if (missingUnitTitles) blocking.push('هناك وحدة واحدة على الأقل بدون عنوان واضح.');
  if (missingLessonTitles) blocking.push('هناك درس واحد على الأقل بدون عنوان واضح.');

  if (checks.hasPreTest && (firstPreTest?.questions?.length ?? 0) < 5) {
    warnings.push('يُستحسن أن يحتوي الاختبار القبلي على 5 أسئلة نموذجية على الأقل في النسخة الحالية.');
  }
  if (checks.hasPostTest && (firstPostTest?.questions?.length ?? 0) < 5) {
    warnings.push('يُستحسن أن يحتوي الاختبار البعدي على 5 أسئلة نموذجية على الأقل في النسخة الحالية.');
  }
  if (lessons.some((lesson) => lesson.title?.trim() && lesson.title.trim().length < 5)) {
    warnings.push('بعض عناوين الدروس قصيرة جدًا، ويُستحسن جعلها أكثر وضوحًا قبل النشر.');
  }

  return { blocking, warnings, checks };
}
