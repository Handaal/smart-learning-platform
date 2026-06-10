import {
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  Camera,
  CircleHelp,
  Database,
  FileBarChart2,
  Layers3,
  LineChart,
  ListChecks,
  Network,
  Radar,
  ScanFace,
  Sparkles,
  Workflow,
} from 'lucide-react';
import HelpCenterLayout, { type HelpFaqItem, type HelpSection } from '@/components/help/HelpCenterLayout';
import { useI18n } from '@/i18n';
import styles from './ResearchAdminHelpPage.module.css';

type FlowShape = 'terminator' | 'process' | 'decision' | 'io' | 'data';
type ChartMockType = 'bars' | 'line' | 'heatmap' | 'table' | 'scatter' | 'timeline' | 'matrix';

type LocalizedReportMock = {
  title: string;
  chart: ChartMockType;
  shows: string;
  interpretation: string;
  callouts: string[];
};

type LocalizedContent = {
  eyebrow: string;
  title: string;
  lead: string;
  introPoints: string[];
  heroHighlights: string[];
  heroReferenceTitle: string;
  heroReferenceLead: string;
  heroMetrics: Array<{ label: string; value: string }>;
  sections: HelpSection[];
  faqTitle: string;
  faqItems: HelpFaqItem[];
  tipsTitle: string;
  tips: string[];
  reportMocks: LocalizedReportMock[];
  architectureLayers: Array<{ layer: string; purpose: string }>;
  adaptiveMatrixRows: Array<{ emotion: string; condition: string; content: string; objective: string; effect: string }>;
  presentationStages: Array<{ title: string; purpose: string; question: string }>;
  overviewSpaces: Array<{ title: string; detail: string }>;
};

type FlowNodeProps = {
  label: string;
  note?: string;
  shape: FlowShape;
  tone?: 'default' | 'accent' | 'warn' | 'soft';
};

const SHAPE_CLASS: Record<FlowShape, string> = {
  terminator: styles.shapeTerminator,
  process: styles.shapeProcess,
  decision: styles.shapeDecision,
  io: styles.shapeIo,
  data: styles.shapeData,
};

const TONE_CLASS: Record<NonNullable<FlowNodeProps['tone']>, string> = {
  default: '',
  accent: styles.nodeAccent,
  warn: styles.nodeWarn,
  soft: styles.nodeSoft,
};

function FlowNode({ label, note, shape, tone = 'default' }: FlowNodeProps) {
  const className = `${styles.flowNode} ${SHAPE_CLASS[shape]} ${TONE_CLASS[tone]}`.trim();

  if (shape === 'decision') {
    return (
      <div className={className}>
        <div className={styles.decisionInner}>
          <strong>{label}</strong>
          {note ? <span>{note}</span> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <strong>{label}</strong>
      {note ? <span>{note}</span> : null}
    </div>
  );
}

function FlowArrow({ label }: { label?: string }) {
  return (
    <div className={styles.flowArrowWrap} aria-hidden>
      <ArrowRight size={16} className={styles.flowArrowIcon} />
      {label ? <span className={styles.arrowLabel}>{label}</span> : null}
    </div>
  );
}

function ReportMockChart({ type }: { type: ChartMockType }) {
  if (type === 'bars') {
    return (
      <div className={styles.mockBars} aria-hidden>
        <span style={{ height: '30%' }} />
        <span style={{ height: '54%' }} />
        <span style={{ height: '78%' }} />
        <span style={{ height: '60%' }} />
        <span style={{ height: '88%' }} />
      </div>
    );
  }

  if (type === 'line') {
    return (
      <svg viewBox="0 0 200 80" className={styles.mockSvg} aria-hidden>
        <polyline points="0,58 30,44 65,50 95,30 130,38 165,24 200,16" className={styles.mockLine} />
        <polyline points="0,66 30,60 65,54 95,48 130,44 165,36 200,30" className={styles.mockLineSoft} />
      </svg>
    );
  }

  if (type === 'heatmap') {
    return (
      <div className={styles.mockHeatmap} aria-hidden>
        {[0.2, 0.6, 0.3, 0.8, 0.5, 0.7, 0.2, 0.4, 0.5, 0.9, 0.4, 0.7, 0.3, 0.6, 0.85, 0.25].map(
          (value, index) => (
            <span key={index} style={{ opacity: value }} />
          ),
        )}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className={styles.mockTable} aria-hidden>
        <div><span /><span /><span /></div>
        <div><span /><span /><span /></div>
        <div><span /><span /><span /></div>
        <div><span /><span /><span /></div>
      </div>
    );
  }

  if (type === 'scatter') {
    return (
      <svg viewBox="0 0 200 90" className={styles.mockSvg} aria-hidden>
        <circle cx="24" cy="66" r="5" className={styles.mockDotSoft} />
        <circle cx="52" cy="52" r="5" className={styles.mockDot} />
        <circle cx="81" cy="58" r="6" className={styles.mockDot} />
        <circle cx="108" cy="38" r="5" className={styles.mockDotSoft} />
        <circle cx="138" cy="34" r="6" className={styles.mockDot} />
        <circle cx="170" cy="20" r="7" className={styles.mockDot} />
      </svg>
    );
  }

  if (type === 'timeline') {
    return (
      <div className={styles.mockTimeline} aria-hidden>
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    );
  }

  return (
    <div className={styles.mockMatrix} aria-hidden>
      {[...Array(25)].map((_, index) => (
        <span key={index} style={{ opacity: 0.25 + ((index % 5) * 0.14) }} />
      ))}
    </div>
  );
}

function inferFaqCategory(language: 'ar' | 'en', question: string) {
  if (language === 'ar') {
    if (question.includes('المحتوى') || question.includes('الدرس') || question.includes('التأليف')) return 'التأليف';
    if (question.includes('الكاميرا') || question.includes('الثقة') || question.includes('الوجه')) return 'التحقق';
    if (question.includes('التقارير') || question.includes('التحليل')) return 'التحليلات';
    if (question.includes('التصدير')) return 'التصدير';
    return 'التشغيل';
  }

  if (question.includes('content') || question.includes('lesson') || question.includes('authoring')) return 'Authoring';
  if (question.includes('camera') || question.includes('confidence') || question.includes('face')) return 'Validation';
  if (question.includes('report') || question.includes('analysis')) return 'Analytics';
  if (question.includes('export')) return 'Export';
  return 'Operations';
}

const EN_CONTENT: LocalizedContent = {
  eyebrow: 'Research System Reference',
  title: 'Visual Research Admin Documentation Hub',
  lead:
    'Primary academic walkthrough page for explaining platform logic, architecture, learner-group behavior, adaptive intelligence, and research analytics during supervision and dissertation review.',
  introPoints: [
    'Use this page as the first stop when presenting the platform to supervisors and examiners.',
    'Each section combines concise research narration with visual diagrams and interpretation cards.',
    'The content reflects the current implementation: content-first learner flow, group-specific help, and facial-expression sensing only for the experimental group.',
  ],
  heroHighlights: ['Academic walkthrough', 'Temporal decision rules', 'Seven adaptive scenarios', 'Research-ready analytics'],
  heroReferenceTitle: 'Why this page matters',
  heroReferenceLead:
    'A presentation-first reference that explains what the system does, how the adaptive engine decides, what each group sees, and how to interpret the resulting data defensibly.',
  heroMetrics: [
    { label: 'Reference sections', value: '11 structured sections' },
    { label: 'Decision timing', value: '15-second evidence window / 5-second decision cycle' },
    { label: 'Adaptive scenarios', value: '7 documented learner-state pathways' },
    { label: 'Sensing scope', value: 'Facial expressions only' },
  ],
  sections: [
    { id: 'overview', title: '1) Platform Overview', summary: 'High-level visual map of platform spaces and how learner, researcher, and analytics workflows connect.' },
    { id: 'algorithms', title: '2) Core Algorithms (Flowcharts)', summary: 'Flow models for sensing, temporal decisioning, and adaptive feedback behavior.' },
    { id: 'architecture', title: '3) System Architecture', summary: 'Layered architecture from webcam sensing to analytics, content delivery, and researcher controls.' },
    { id: 'authoring', title: '4) Content Authoring Workflow', summary: 'How courses, units, lessons, and adaptive lesson elements are authored and previewed.' },
    { id: 'adaptive-mapping', title: '5) Adaptive Mapping and Trigger Logic', summary: 'Seven adaptive scenarios and the pedagogical response tied to each one.' },
    { id: 'reports', title: '6) Reports Explained with Visual Mockups', summary: 'Annotated report models for progress, pre/post, adaptation, and comparative analysis.' },
    { id: 'presentation-flow', title: '7) Academic Presentation Sequence', summary: 'A presentation-ready order for walking supervisors through the evidence.' },
    { id: 'validation-limits', title: '8) Validation Boundaries and Scientific Limits', summary: 'What the platform supports, what it does not claim, and how to explain confidence limits.' },
    { id: 'camera-protocol', title: '9) Camera and Environment Protocol', summary: 'How to prepare reliable experimental sessions and how fallback behavior is handled ethically.' },
    { id: 'raw-vs-interpreted', title: '10) Raw Signal vs Educational Interpretation', summary: 'How frame-level readings are smoothed into conservative educational states.' },
    { id: 'experiment-groups', title: '11) Experimental Groups In The Platform', summary: 'How control, experimental, and researcher experiences differ in the implemented environment.' },
  ],
  faqTitle: 'Research Admin FAQ',
  faqItems: [
    {
      question: 'How should I explain the difference between raw emotion output and interpreted educational state?',
      answer:
        'Use the Raw vs Interpreted section: raw reading is frame-level and unstable, while educational state is smoothed across time and gated by context and confidence before any intervention appears.',
    },
    {
      question: 'How do I explain the temporal decision logic to reviewers?',
      answer:
        'State that the engine does not react to a single frame. It watches a 15-second evidence window, evaluates every 5 seconds, requires confidence around 0.70 for adaptive action, and falls back to performance-only logic when quality is too weak.',
    },
    {
      question: 'What should I say when confidence is low or no face is detected?',
      answer:
        'Explain that the system does not guess. It records low-confidence or no-face conditions, then continues with conservative performance-based logic until signal quality improves.',
    },
    {
      question: 'How do I explain adaptive content mapping to non-technical reviewers?',
      answer:
        'Use the scenario matrix. Show the learner state, the trigger condition, the selected pedagogical response, and the expected educational effect in one line.',
    },
    {
      question: 'How should I explain the difference between the control and experimental groups?',
      answer:
        'Both groups study the same core content and assessments. The control group follows the standard path with no camera or emotion-based adaptation, while the experimental group can receive facial-expression-based contextual support.',
    },
    {
      question: 'What if one report section has empty data?',
      answer:
        'Use explicit empty-state rationale. Explain the conditions needed to populate that section, such as matched pre/post rows, intervention logs, or experimental-group emotion events.',
    },
    {
      question: 'How should exports be interpreted in statistical analysis?',
      answer:
        'Each export keeps anonymised learner codes and session continuity. Use area-specific exports, then merge them by research identifiers inside your statistical workflow.',
    },
  ],
  tipsTitle: 'Operating Recommendations',
  tips: [
    'Start every presentation from this page before opening live dashboards.',
    'Use the temporal-decision panels when discussing scientific credibility and explainable adaptation.',
    'When presenting learner flow, remind reviewers that content appears first, then any adaptive cue, then the next action.',
    'Interpret emotion events together with context, duration, confidence, and performance instead of treating them as isolated labels.',
    'State sample limitations and low-confidence conditions explicitly during academic discussion.',
  ],
  reportMocks: [
    { title: 'Overview Dashboard', chart: 'bars', shows: 'Participants, completion, adaptive coverage, and readiness indicators.', interpretation: 'Use as the opening frame for the study context.', callouts: ['Population size', 'Completion baseline', 'Adaptive coverage'] },
    { title: 'Learner Progress Analytics', chart: 'line', shows: 'Progress trajectory, pacing, and continuity over time.', interpretation: 'Explains where learner flow accelerates or slows down.', callouts: ['Progress trend', 'Session rhythm', 'Drop zones'] },
    { title: 'Pre/Post Performance', chart: 'bars', shows: 'Matched pre/post outcomes and gain differences by group.', interpretation: 'Primary evidence for learning gain and group effect.', callouts: ['Matched rows only', 'Gain delta', 'Exp vs Control'] },
    { title: 'Emotion Sensing Summary', chart: 'matrix', shows: 'Dominant states, confidence spread, and event concentration for the experimental group.', interpretation: 'Introduces the affective profile before timeline discussion.', callouts: ['Dominant state', 'Confidence spread', 'Event mix'] },
    { title: 'Intervention Effectiveness', chart: 'table', shows: 'Trigger reason, intervention type, learner action, and outcome change.', interpretation: 'Shows which interventions were most useful and when.', callouts: ['Trigger source', 'Learner action', 'Outcome change'] },
    { title: 'Emotion vs Performance', chart: 'scatter', shows: 'Relationship between learner state burden and completion or score outcomes.', interpretation: 'Supports discussion of affect-performance coupling.', callouts: ['Performance clusters', 'Struggle signals', 'Focus effect'] },
    { title: 'Group Comparison', chart: 'line', shows: 'Comparative trend between control and experimental groups.', interpretation: 'Useful for presenting study-level differences clearly.', callouts: ['Cohort delta', 'Comparative trend', 'Group gap'] },
    { title: 'Participant Session Detail', chart: 'timeline', shows: 'Step-level sequence for one learner, including interventions and fallback periods.', interpretation: 'Useful for a case narrative or debugging walkthrough.', callouts: ['Event order', 'State transitions', 'Intervention trace'] },
  ],
  architectureLayers: [
    { layer: 'Sensor Layer', purpose: 'Webcam capture, face detection, facial-expression inference, confidence scoring, and no-face quality checks.' },
    { layer: 'Temporal Decision Layer', purpose: 'Applies the 15-second evidence window, 5-second decision cycle, confidence thresholds, and cooldown logic.' },
    { layer: 'Adaptive Engine Layer', purpose: 'Combines learner state, task context, performance, hesitation, and errors to decide whether a pedagogical response is needed.' },
    { layer: 'Content Layer', purpose: 'Delivers baseline steps, adaptive content, checkpoints, reassurance, and optional challenges inside the same lesson flow.' },
    { layer: 'Analytics Layer', purpose: 'Stores progress, assessments, emotion events, interventions, and response-quality indicators for research analysis.' },
    { layer: 'Research Control Layer', purpose: 'Course Builder, learner preview, validation lab, reports, and export tools.' },
  ],
  adaptiveMatrixRows: [
    {
      emotion: 'Confusion',
      condition: 'Confidence >= 0.70, persistence >= 12-15 seconds, error present, and task context such as WBS / scope / risk analysis.',
      content: 'Clarification or scaffolded hint',
      objective: 'Reduce ambiguity and restore task comprehension',
      effect: 'Improved continuation and fewer repeated errors',
    },
    {
      emotion: 'Frustration',
      condition: 'Confidence >= 0.70, persistence >= 15 seconds, and repeated errors inside scheduling, cost, or resource tasks.',
      content: 'Supportive breakdown or task decomposition',
      objective: 'Lower cognitive load and recover task confidence',
      effect: 'Higher recovery and completion likelihood',
    },
    {
      emotion: 'Boredom / disengagement',
      condition: 'Confidence >= 0.70, persistence >= 15-20 seconds, low interaction, and theoretical content.',
      content: 'Interactive case or quick engagement activity',
      objective: 'Restore momentum and active participation',
      effect: 'Stronger interaction rhythm',
    },
    {
      emotion: 'High engagement',
      condition: 'Confidence >= 0.70 with stable progress and mastery-level performance.',
      content: 'Optional challenge or enrichment path',
      objective: 'Deepen mastery without blocking the main pathway',
      effect: 'Extended higher-order practice',
    },
    {
      emotion: 'Assessment anxiety',
      condition: 'Confidence >= 0.70 during pre-test, post-test, or checkpoint assessment with hesitation signals.',
      content: 'Neutral procedural reassurance',
      objective: 'Lower pressure without revealing answers',
      effect: 'Calmer assessment continuation',
    },
    {
      emotion: 'Neutral',
      condition: 'Performance acceptable and no meaningful need detected.',
      content: 'Do nothing / continue normal path',
      objective: 'Avoid unnecessary interruption',
      effect: 'Stable baseline flow',
    },
    {
      emotion: 'Face lost / low confidence',
      condition: 'No face detected or confidence < 0.55, or quality not strong enough for a trustworthy inference.',
      content: 'Performance-only fallback',
      objective: 'Prevent inaccurate interpretation',
      effect: 'Safe continuation without forced emotion labels',
    },
  ],
  presentationStages: [
    { title: 'Overview -> Progress', purpose: 'Set participant context, pacing, and completion baseline.', question: 'Who is learning and how far did they progress?' },
    { title: 'Pre/Post -> Group Comparison', purpose: 'Show learning gain and the difference between control and experimental pathways.', question: 'Did performance improve, and how did the two groups differ?' },
    { title: 'Emotion Summary -> Intervention Effectiveness', purpose: 'Link learner states to adaptive responses for the experimental group only.', question: 'Which learner states appeared and which interventions helped most?' },
    { title: 'Timeline -> Participant Detail', purpose: 'Show when shifts happened and how the system responded over time.', question: 'What happened during one session and how did the pathway change?' },
    { title: 'Exports -> Limits', purpose: 'End with reproducible evidence and methodological clarity.', question: 'What is ready for analysis, and what are the scientific boundaries?' },
  ],
  overviewSpaces: [
    { title: 'Learner Workspace', detail: 'Content-first lesson player for both groups, with adaptive support visible only in the experimental path.' },
    { title: 'Learner Dashboard', detail: 'Progress, next step, and unit access for each participant.' },
    { title: 'Course Builder', detail: 'Course -> Unit -> Lesson -> Element authoring with adaptive mappings and preview.' },
    { title: 'Emotion Validation Lab', detail: 'Live webcam-based plausibility checks for facial-expression sensing in the experimental environment.' },
    { title: 'Research Reports', detail: 'Progress, assessments, interventions, and group comparison analytics.' },
    { title: 'Exports Center', detail: 'Research-ready datasets using anonymised participant identifiers.' },
  ],
};

const AR_CONTENT: LocalizedContent = {
  eyebrow: 'مرجع النظام البحثي',
  title: 'مركز التوثيق البصري لمسؤول البحث',
  lead:
    'الصفحة المرجعية الأساسية لشرح منطق المنصة، وسلوك المجموعات، والخوارزميات التكيفية، والتحليلات البحثية أثناء الإشراف والعرض الأكاديمي.',
  introPoints: [
    'استخدم هذه الصفحة كنقطة البداية الأولى عند عرض المنصة على المشرفين والممتحنين.',
    'يجمع كل قسم بين شرح بحثي مختصر ومخططات بصرية وبطاقات تفسير تساعدك على العرض الواضح.',
    'يعكس هذا المرجع التنفيذ الحالي فعلًا: محتوى أولًا، دعم داخل التدفق، وكاميرا وتحليل تعبيرات وجه للمجموعة التجريبية فقط.',
  ],
  heroHighlights: ['عرض أكاديمي جاهز', 'قواعد قرار زمنية', 'سبعة سيناريوهات تكيفية', 'تحليلات جاهزة للبحث'],
  heroReferenceTitle: 'لماذا هذه الصفحة مهمة',
  heroReferenceLead:
    'مرجع تقديمي يشرح ما الذي يفعله النظام، وكيف يتخذ القرار التكيفي، وما الذي تراه كل مجموعة، وكيف تُفسَّر البيانات الناتجة بطريقة علمية قابلة للدفاع.',
  heroMetrics: [
    { label: 'الأقسام المرجعية', value: '11 قسمًا منظمًا' },
    { label: 'توقيت القرار', value: 'نافذة 15 ثانية / قرار كل 5 ثوانٍ' },
    { label: 'السيناريوهات التكيفية', value: '7 مسارات موثقة لحالات المتعلم' },
    { label: 'نطاق الاستشعار', value: 'تعبيرات الوجه فقط' },
  ],
  sections: [
    { id: 'overview', title: '1) نظرة عامة على المنصة', summary: 'خريطة بصرية للمساحات الأساسية وكيف يتصل مسار المتعلم والباحث والتحليلات داخل البيئة التجريبية.' },
    { id: 'algorithms', title: '2) الخوارزميات الأساسية (Flowcharts)', summary: 'نماذج انسيابية للاستشعار، والقرار الزمني، والتغذية الراجعة التكيفية.' },
    { id: 'architecture', title: '3) معمارية النظام', summary: 'طبقات النظام من الاستشعار عبر الكاميرا حتى التحليلات ومركز تحكم الباحث.' },
    { id: 'authoring', title: '4) سير تأليف المحتوى', summary: 'كيف يُنشأ المحتوى والوحدات والدروس والعناصر التكيفية وتتم معاينتها.' },
    { id: 'adaptive-mapping', title: '5) الربط التكيفي ومنطق المحفزات', summary: 'السيناريوهات السبعة والاستجابة التربوية المقابلة لكل منها.' },
    { id: 'reports', title: '6) شرح التقارير عبر نماذج بصرية', summary: 'نماذج تقارير مشروحة للتقدم، والاختبارات، والتدخلات، والمقارنات بين المجموعات.' },
    { id: 'presentation-flow', title: '7) تسلسل العرض الأكاديمي', summary: 'ترتيب مقترح لعرض الأدلة أمام المشرفين ولجان التقييم.' },
    { id: 'validation-limits', title: '8) حدود التحقق والقيود العلمية', summary: 'ما الذي تدعمه المنصة، وما الذي لا تدّعيه، وكيف يُشرح انخفاض الثقة أو فقدان الوجه.' },
    { id: 'camera-protocol', title: '9) بروتوكول الكاميرا والبيئة', summary: 'إعداد الجلسات التجريبية الموثوقة وكيفية التعامل الأخلاقي مع حالات الفشل أو انخفاض الجودة.' },
    { id: 'raw-vs-interpreted', title: '10) الإشارة الخام مقابل التفسير التعليمي', summary: 'كيف تتحول قراءات الإطارات الخام إلى حالة تعليمية محافظة وقابلة للتفسير.' },
    { id: 'experiment-groups', title: '11) المجموعات داخل المنصة', summary: 'كيف تختلف تجربة المجموعة الضابطة والمجموعة التجريبية، وما الذي يبقى خاصًا بحساب الباحث.' },
  ],
  faqTitle: 'الأسئلة الشائعة لمسؤول البحث',
  faqItems: [
    {
      question: 'كيف أشرح الفرق بين الإخراج الانفعالي الخام والحالة التعليمية المفسرة؟',
      answer:
        'اعرض قسم الإشارة الخام مقابل التفسير التعليمي: القراءة الخام لحظية ومتأثرة بالضوضاء، أما الحالة التعليمية فتنتج عن تنعيم زمني وسياق تعلّم وبوابات ثقة قبل أي تدخل.',
    },
    {
      question: 'كيف أشرح منطق القرار الزمني للمراجعين؟',
      answer:
        'وضّح أن المحرك لا يتفاعل مع إطار واحد. بل يراقب نافذة أدلة مدتها 15 ثانية، ويقيّم كل 5 ثوانٍ، ويحتاج إلى ثقة تقارب 0.70 للتدخل، ويعود إلى منطق يعتمد على الأداء إذا انخفضت الجودة أو الثقة.',
    },
    {
      question: 'ماذا أقول عند انخفاض الثقة أو عدم رصد الوجه؟',
      answer:
        'اشرح أن النظام لا يخمّن. بل يسجل حالة انخفاض الثقة أو غياب الوجه، ثم يواصل بمنطق محافظ يعتمد على الأداء حتى تتحسن الإشارة.',
    },
    {
      question: 'كيف أشرح الربط التكيفي لغير المتخصصين تقنيًا؟',
      answer:
        'استخدم مصفوفة السيناريوهات: اعرض حالة المتعلم، وشرط التفعيل، والاستجابة التربوية، والأثر المتوقع في سطر واحد واضح.',
    },
    {
      question: 'كيف أشرح الفرق بين المجموعة الضابطة والتجريبية؟',
      answer:
        'كلتا المجموعتين تتعلمان المحتوى والاختبارات نفسها. المجموعة الضابطة تستخدم المسار القياسي بلا كاميرا ولا تكيف قائم على تعبيرات الوجه، بينما المجموعة التجريبية قد تتلقى دعمًا سياقيًا مبنيًا على تعبيرات الوجه فقط.',
    },
    {
      question: 'ماذا أفعل إذا ظهر قسم تقارير فارغًا؟',
      answer:
        'اشرح سبب الحالة الفارغة بوضوح، مثل غياب صفوف قبلية/بعدية متطابقة، أو عدم وجود سجل تدخلات، أو نقص أحداث المجموعة التجريبية في هذا القسم.',
    },
    {
      question: 'كيف أستخدم ملفات التصدير في التحليل الإحصائي؟',
      answer:
        'تحافظ ملفات التصدير على معرفات بحثية مجهولة واتساق الجلسات. استخدم كل ملف في مجاله، ثم اربط الملفات ببعضها داخل سير العمل الإحصائي باستخدام هذه المعرفات.',
    },
  ],
  tipsTitle: 'توصيات تشغيلية',
  tips: [
    'ابدأ كل عرض من هذه الصفحة قبل فتح التقارير الحية.',
    'استخدم لوحات القرار الزمني عند مناقشة الموثوقية وقابلية التفسير.',
    'عند شرح مسار المتعلم، أكّد أن المحتوى يظهر أولًا ثم أي دعم مرتبط ثم الإجراء التالي.',
    'فسّر أحداث الانفعال مع السياق والمدة والثقة والأداء، لا كوسوم منفصلة.',
    'اذكر حدود العينة وحالات انخفاض الثقة صراحة أثناء العرض الأكاديمي.',
  ],
  reportMocks: [
    { title: 'لوحة النظرة العامة', chart: 'bars', shows: 'المشاركون، والإكمال، وتغطية التكيف، ومؤشرات الجاهزية.', interpretation: 'تستخدم كبداية للعرض وتثبيت السياق العام.', callouts: ['حجم العينة', 'خط الإكمال', 'تغطية التكيف'] },
    { title: 'تحليلات تقدم المتعلمين', chart: 'line', shows: 'مسار التقدم، والإيقاع، واستمرارية الجلسات عبر الزمن.', interpretation: 'توضح أين يتسارع أو يتباطأ مسار التعلم.', callouts: ['اتجاه التقدم', 'إيقاع الجلسات', 'مناطق التباطؤ'] },
    { title: 'الاختبار القبلي/البعدي', chart: 'bars', shows: 'نتائج قبلية/بعدية متطابقة وفروق الكسب بين المجموعات.', interpretation: 'الدليل الرئيس على تحسن التعلم وأثر المجموعة.', callouts: ['صفوف متطابقة', 'فرق الكسب', 'تجريبية مقابل ضابطة'] },
    { title: 'ملخص الاستشعار الانفعالي', chart: 'matrix', shows: 'الحالات المهيمنة، وانتشار الثقة، وكثافة الأحداث للمجموعة التجريبية.', interpretation: 'يمهّد لقراءة الخط الزمني الانفعالي.', callouts: ['الحالة المهيمنة', 'انتشار الثقة', 'مزيج الأحداث'] },
    { title: 'فعالية التدخلات', chart: 'table', shows: 'سبب التفعيل، ونوع التدخل، واستجابة المتعلم، والتغير بعد التدخل.', interpretation: 'يبين أي التدخلات كان أنفع وفي أي سياق.', callouts: ['مصدر التفعيل', 'استجابة المتعلم', 'تغير النتيجة'] },
    { title: 'الانفعال مقابل الأداء', chart: 'scatter', shows: 'العلاقة بين عبء الحالة الوجدانية ونتائج الأداء أو الإكمال.', interpretation: 'يدعم مناقشة أثر الحالة الوجدانية على النتائج.', callouts: ['عناقيد الأداء', 'إشارات التعثر', 'أثر التركيز'] },
    { title: 'مقارنة المجموعات', chart: 'line', shows: 'الفروق العامة بين المجموعة الضابطة والتجريبية.', interpretation: 'مفيد لعرض الفروق الكلية على مستوى الدراسة.', callouts: ['فجوة المجموعات', 'اتجاه المقارنة', 'فرق الأثر'] },
    { title: 'تفصيل جلسة المشارك', chart: 'timeline', shows: 'تسلسل خطوة بخطوة لمشارك واحد، بما في ذلك التدخلات وفترات الرجوع للأداء فقط.', interpretation: 'مفيد لعرض حالة فردية أو شرح تقني مفصل.', callouts: ['تسلسل الأحداث', 'تحولات الحالة', 'أثر التدخل'] },
  ],
  architectureLayers: [
    { layer: 'طبقة الاستشعار', purpose: 'التقاط الكاميرا، وكشف الوجه، واستدلال تعبيرات الوجه، وحساب الثقة، والتحقق من غياب الوجه.' },
    { layer: 'طبقة القرار الزمني', purpose: 'تطبيق نافذة الأدلة 15 ثانية، ودورة القرار كل 5 ثوانٍ، وعتبات الثقة، وفترة التهدئة بين التدخلات.' },
    { layer: 'طبقة المحرك التكيفي', purpose: 'دمج حالة المتعلم مع سياق المهمة، والأداء، والتردد، والأخطاء لتحديد الحاجة إلى تدخل تربوي.' },
    { layer: 'طبقة المحتوى', purpose: 'تقديم الخط الأساسي، والعناصر التكيفية، ونقاط التحقق، والتطمين، والتحديات الاختيارية داخل مسار درس واحد.' },
    { layer: 'طبقة التحليلات', purpose: 'تخزين التقدم، والاختبارات، والأحداث الانفعالية، والتدخلات، ومؤشرات جودة الاستجابة.' },
    { layer: 'طبقة التحكم البحثي', purpose: 'منشئ المقرر، ومعاينة المتعلم، ومختبر التحقق، والتقارير، والتصدير.' },
  ],
  adaptiveMatrixRows: [
    {
      emotion: 'الارتباك',
      condition: 'ثقة >= 0.70، واستمرار 12-15 ثانية، مع وجود خطأ وسياق مهمة مثل WBS أو تحليل النطاق أو المخاطر.',
      content: 'توضيح أو تلميح مساند',
      objective: 'تقليل الغموض واستعادة فهم المهمة',
      effect: 'تحسن الاستمرار وتقليل تكرار الخطأ',
    },
    {
      emotion: 'الإحباط',
      condition: 'ثقة >= 0.70، واستمرار >= 15 ثانية، مع أخطاء متكررة في مهام الجدولة أو التكلفة أو الموارد.',
      content: 'تبسيط داعم أو تقسيم للمهمة',
      objective: 'خفض الحمل المعرفي واستعادة الثقة',
      effect: 'زيادة احتمالية التعافي والإكمال',
    },
    {
      emotion: 'الملل / انخفاض الاندماج',
      condition: 'ثقة >= 0.70، واستمرار 15-20 ثانية، مع خمول ومحتوى نظري.',
      content: 'حالة تفاعلية أو نشاط قصير يعيد التفاعل',
      objective: 'استعادة الزخم والمشاركة',
      effect: 'ارتفاع وتيرة التفاعل',
    },
    {
      emotion: 'الاندماج المرتفع',
      condition: 'ثقة >= 0.70 مع تقدم مستقر وأداء يبلغ عتبة الإتقان.',
      content: 'تحدٍ اختياري أو مسار إثرائي',
      objective: 'تعميق الإتقان دون تعطيل المسار الأساسي',
      effect: 'توسيع الممارسة العليا',
    },
    {
      emotion: 'قلق التقييم',
      condition: 'ثقة >= 0.70 أثناء الاختبار القبلي أو البعدي أو نقطة تحقق تقييمية مع تردد ظاهر.',
      content: 'تطمين إجرائي محايد',
      objective: 'خفض الضغط دون كشف الإجابة',
      effect: 'استمرار أكثر هدوءًا في التقييم',
    },
    {
      emotion: 'الحالة المحايدة',
      condition: 'الأداء مقبول ولا توجد حاجة تعليمية واضحة.',
      content: 'لا تدخل / استمرار طبيعي',
      objective: 'تجنب المقاطعة غير الضرورية',
      effect: 'استقرار المسار الأساسي',
    },
    {
      emotion: 'فقدان الوجه / انخفاض الثقة',
      condition: 'غياب الوجه أو ثقة أقل من 0.55 أو جودة غير كافية لقرار موثوق.',
      content: 'العودة إلى منطق يعتمد على الأداء فقط',
      objective: 'منع التفسير غير الدقيق',
      effect: 'استمرار آمن بلا تخمين انفعالي',
    },
  ],
  presentationStages: [
    { title: 'النظرة العامة -> التقدم', purpose: 'تثبيت سياق العينة وخط الأساس للتقدم والإيقاع.', question: 'من الذي يتعلم؟ وإلى أي مدى وصل؟' },
    { title: 'القبلي/البعدي -> مقارنة المجموعات', purpose: 'عرض تحسن التعلم والفروق بين الضابطة والتجريبية.', question: 'هل حدث تحسن؟ وكيف اختلفت المجموعتان؟' },
    { title: 'ملخص الانفعال -> فعالية التدخل', purpose: 'ربط حالات المتعلم بالتدخلات داخل المجموعة التجريبية فقط.', question: 'ما الحالات التي ظهرت؟ وأي تدخل كان أكثر فائدة؟' },
    { title: 'الخط الزمني -> تفصيل المشارك', purpose: 'إظهار توقيت التحولات وكيف استجاب النظام عبر الجلسة.', question: 'ماذا حدث داخل الجلسة؟ وكيف تغيّر المسار؟' },
    { title: 'التصدير -> الحدود العلمية', purpose: 'إغلاق العرض بأدلة قابلة للتحليل وحدود منهجية واضحة.', question: 'ما البيانات الجاهزة للتحليل؟ وما حدود التفسير؟' },
  ],
  overviewSpaces: [
    { title: 'مساحة المتعلم', detail: 'مشغل درس متمحور حول المحتوى للمجموعتين، مع دعم تكيفي ظاهر فقط في المسار التجريبي.' },
    { title: 'لوحة المتعلم', detail: 'التقدم، والخطوة التالية، والوصول إلى الوحدات لكل مشارك.' },
    { title: 'منشئ المقرر', detail: 'تأليف Course -> Unit -> Lesson -> Element مع ربط تكيفي ومعاينة.' },
    { title: 'مختبر تحقق الانفعالات', detail: 'اختبار حي لمعقولية استشعار تعبيرات الوجه في البيئة التجريبية.' },
    { title: 'تقارير البحث', detail: 'تحليلات التقدم، والاختبارات، والتدخلات، ومقارنة المجموعات.' },
    { title: 'مركز التصدير', detail: 'حزم بيانات بحثية بمعرفات مجهولة جاهزة للتحليل الإحصائي.' },
  ],
};

export default function ResearchAdminHelpPage() {
  const { language } = useI18n();
  const isArabic = language === 'ar';
  const content = isArabic ? AR_CONTENT : EN_CONTENT;

  const categorizedFaq = content.faqItems.map((item) => ({
    ...item,
    category: inferFaqCategory(language, item.question),
  }));
  const adaptiveBindingSteps = isArabic
    ? [
        {
          title: '1) ابنِ المسار الأساسي أولًا',
          detail: 'أنشئ الوحدة والدرس ثم أضف عناصر المحتوى الأساسية التي يجب أن يراها كل متعلم قبل أي تكيف.',
        },
        {
          title: '2) أضف نوع المحتوى المناسب',
          detail: 'اختر عنصر الدرس الأقرب للهدف: نص، صورة، مخطط، فيديو، نشاط تفاعلي، أو نقطة تحقق.',
        },
        {
          title: '3) حدّد السيناريو التكيفي',
          detail: 'من إعدادات العنصر اختر وسم السيناريو المناسب مثل الارتباك أو الإحباط أو الملل أو الانخراط العالي.',
        },
        {
          title: '4) اختر موضع الظهور',
          detail: 'حدد هل يظهر العنصر قبل الخطوة الأساسية، أو بعدها، أو بدلها، ثم انشر العنصر ليصبح قابلًا للمعاينة.',
        },
        {
          title: '5) راجع المعاينة والسياسة',
          detail: 'افتح معاينة المتعلم وتأكد أن العنصر يظهر في السيناريو الصحيح، مع بقاء القرار النهائي خاضعًا لسياسة التكيف الهجينة.',
        },
      ]
    : [
        {
          title: '1) Build the baseline path first',
          detail: 'Create the unit and lesson, then add the core lesson elements every learner should see before any adaptation.',
        },
        {
          title: '2) Add the right content type',
          detail: 'Choose the lesson element that best fits the goal: text, image, diagram, video, interactive activity, or checkpoint.',
        },
        {
          title: '3) Select the adaptive scenario',
          detail: 'From the element settings, choose the matching scenario tag such as confusion, frustration, boredom, or high engagement.',
        },
        {
          title: '4) Choose the placement',
          detail: 'Set whether the element appears before, after, or instead of the baseline step, then publish it for preview.',
        },
        {
          title: '5) Review preview and policy',
          detail: 'Open the learner preview and verify that the content appears in the intended scenario while the final decision remains policy-driven.',
        },
      ];
  const adaptiveBindingGuide = isArabic
    ? [
        {
          scenario: 'الارتباك',
          contentTypes: 'توضيح نصي، مثال محلول، مخطط، أو فيديو قصير يشرح الخطوة الحالية.',
          builderControl: 'اربط العنصر بوسم الارتباك داخل الدرس نفسه، ويفضّل موضع "بعد" أو "بدل" للخطوة المربكة.',
          note: 'لا تكشف الإجابة كاملة؛ الهدف هو تقليل الغموض واستعادة الفهم.',
        },
        {
          scenario: 'الإحباط',
          contentTypes: 'شرح مبسط، تقسيم للمهمة، مراجعة قصيرة، أو فيديو دعم مختصر.',
          builderControl: 'اربط العنصر بوسم الإحباط، واجعله جزءًا داعمًا قريبًا من المهمة ذات الأخطاء المتكررة.',
          note: 'يستخدم عندما يحتاج المتعلم إلى تخفيف الحمل واستعادة التحكم بالمهمة.',
        },
        {
          scenario: 'الملل / انخفاض الانخراط',
          contentTypes: 'حالة تطبيقية، سؤال قرار سريع، نشاط تنشيطي، أو بطاقة تحدٍ قصيرة غير مرهقة.',
          builderControl: 'اربط العنصر بوسم الملل/انخفاض الانخراط، ويظهر غالبًا بعد محتوى نظري طويل أو منخفض التفاعل.',
          note: 'الهدف إعادة التفاعل لا إضافة شرح أطول.',
        },
        {
          scenario: 'الانخراط العالي',
          contentTypes: 'مسار متقدم، مهمة نقل، تحدٍ أعمق، أو حالة تطبيقية موسعة.',
          builderControl: 'فعّل هذا النوع من المحتوى كتحدٍ اختياري أو إثراء في الدرس أو في خطوة سياسة الدعم التكيفي.',
          note: 'لا يقاطع المسار الأساسي، بل يفتح عند الاستعداد المرتفع والأداء القوي.',
        },
        {
          scenario: 'القلق أثناء الاختبار',
          contentTypes: 'نافذة معلومات، إعادة صياغة تعليمات، أو تطمين إجرائي داخل صفحة التقييم.',
          builderControl: 'يدار هذا السيناريو من خطوة التقييمات وسياسة الدعم، لا من فرع درس عادي.',
          note: 'لا يكشف الحل، بل يوضح المطلوب ويهدئ الإجراء فقط.',
        },
        {
          scenario: 'الحياد',
          contentTypes: 'لا يحتاج عنصرًا تكيفيًا منفصلًا؛ يبقى المتعلم في المسار الأساسي المعتمد.',
          builderControl: 'أنشئ محتوى الدرس الأساسي جيدًا، لأن هذا هو المسار الذي يستخدم عند الاستقرار.',
          note: 'الحياد مع أداء مقبول يعني عدم إضافة تنبيه أو فرع غير ضروري.',
        },
        {
          scenario: 'فقدان الوجه / انخفاض الثقة',
          contentTypes: 'لا يؤلف له محتوى انفعالي خاص؛ يعتمد النظام على بروتوكول الأمان التشغيلي ومنطق الأداء فقط.',
          builderControl: 'يضبط من السياسة العامة، وليس من ربط عنصر درس جديد.',
          note: 'يستمر التعلم بهدوء دون استدلال انفعالي أو إلحاح على المتعلم.',
        },
      ]
    : [
        {
          scenario: 'Confusion',
          contentTypes: 'Text clarification, worked example, diagram, or short video explaining the current step.',
          builderControl: 'Tag the element for confusion inside the same lesson, usually with an "after" or "instead" placement.',
          note: 'Do not reveal the full answer; the goal is to reduce ambiguity and restore understanding.',
        },
        {
          scenario: 'Frustration',
          contentTypes: 'Simplified explanation, task breakdown, short review, or brief support video.',
          builderControl: 'Tag the element for frustration and place it close to the task generating repeated errors.',
          note: 'Use it when the learner needs lower load and a stronger sense of control.',
        },
        {
          scenario: 'Boredom / disengagement',
          contentTypes: 'Interactive case, quick decision question, re-engagement activity, or a short challenge card.',
          builderControl: 'Tag the element for boredom/disengagement and surface it after long theoretical or low-interaction content.',
          note: 'The goal is to restore momentum, not to add more explanation.',
        },
        {
          scenario: 'High engagement',
          contentTypes: 'Advanced path, transfer task, deeper challenge, or expanded application case.',
          builderControl: 'Enable this content as optional challenge/enrichment in the lesson or adaptive policy step.',
          note: 'It should not interrupt the baseline path; it opens when performance is strong and stable.',
        },
        {
          scenario: 'Test anxiety',
          contentTypes: 'Information window, restated instructions, or neutral reassurance inside the assessment flow.',
          builderControl: 'This scenario is managed through assessments and adaptive policy rather than a normal lesson branch.',
          note: 'It never reveals the answer; it only clarifies the procedure and reduces pressure.',
        },
        {
          scenario: 'Neutral',
          contentTypes: 'No separate adaptive block is needed; the learner remains in the approved baseline path.',
          builderControl: 'Author the baseline lesson carefully because this is the stable default flow.',
          note: 'Neutral with acceptable performance should suppress unnecessary alerts.',
        },
        {
          scenario: 'No face / low confidence',
          contentTypes: 'No emotion-specific authored content; the system uses the operational safety fallback and performance-only logic.',
          builderControl: 'This is controlled by the global policy, not by authoring a new lesson branch.',
          note: 'Learning continues calmly without unreliable emotional inference or repeated nagging.',
        },
      ];
  const lessonScenarioWorkflow = isArabic
    ? [
        {
          title: '1) افتح منشئ المقرر ثم انتقل إلى الوحدات والدروس',
          detail:
            'من حساب الباحث افتح منشئ المقرر، ثم انتقل إلى الخطوة الثانية "الوحدات والدروس"، واختر الوحدة ثم الدرس الذي تريد ربطه بسيناريو تكيفي.',
        },
        {
          title: '2) اضغط تعديل الدرس',
          detail:
            'داخل بطاقة الدرس اضغط "تعديل". ستظهر نافذة تحتوي على عنوان الدرس، الهدف المختصر، المدة، نوع الدرس، والسيناريو التكيفي المتوقع.',
        },
        {
          title: '3) اختر نوع الدرس أولًا',
          detail:
            'نوع الدرس يحدد الإطار التعليمي للخطوة: تمهيد، درس أساسي، نشاط تفاعلي، حالة/سيناريو، نقطة تحقق/تقييم، أو ملخص/إغلاق. هذا الاختيار لا يطلق التكيف وحده، لكنه يحدد ما السيناريوهات الأنسب لهذا الدرس.',
        },
        {
          title: '4) حدّد السيناريو التكيفي المتوقع',
          detail:
            'بعد اختيار نوع الدرس، استخدم حقل "السيناريو التكيفي المتوقع" لتحديد السيناريو المرجعي لهذا الدرس مثل: الارتباك، الإحباط، الملل/انخفاض الانخراط، الانخراط العالي، أو القلق أثناء الاختبار.',
        },
        {
          title: '5) احفظ الدرس بوصفه مرجعًا تأليفيًا',
          detail:
            'عند الحفظ، يسجل النظام هذا السيناريو على مستوى الدرس كمرجع تأليفي يساعدك أنت والباحثين على معرفة الوظيفة التكيفية المتوقعة لهذا الدرس.',
        },
        {
          title: '6) افهم أين يتم التنفيذ الفعلي',
          detail:
            'التنفيذ الفعلي للدعم لا يعتمد على اسم الدرس فقط، بل على عناصر محتوى الدرس المرتبطة داخليًا بعلامات تكيفية مثل adaptiveTag، وعلى سياق المهمة taskContextKey، ثم على قرار المحرك الهجين وقت الجلسة.',
        },
        {
          title: '7) راجع المعاينة في حساب المتدرب',
          detail:
            'بعد حفظ الدرس، افتح المعاينة أو ادخل بحساب متدرب. إذا تحققت شروط السيناريو في المجموعة التجريبية، سيظهر المحتوى التكيفي الموافق لهذا الدرس وفق السياسة المعتمدة.',
        },
      ]
    : [
        {
          title: '1) Open Course Builder and go to Units & Lessons',
          detail:
            'From the researcher account, open the Course Builder, move to step 2 "Units & Lessons", then choose the unit and lesson you want to link to an adaptive scenario.',
        },
        {
          title: '2) Click Edit Lesson',
          detail:
            'Inside the lesson card, click "Edit". The modal includes lesson title, short objective, duration, lesson type, and expected adaptive scenario.',
        },
        {
          title: '3) Choose the lesson type first',
          detail:
            'Lesson type defines the instructional frame: introduction, core lesson, interactive activity, case/scenario, assessment checkpoint, or summary/closure. It does not trigger adaptation by itself, but it narrows the most suitable scenarios.',
        },
        {
          title: '4) Select the expected adaptive scenario',
          detail:
            'After choosing lesson type, use "Expected adaptive scenario" to mark the lesson with its intended scenario such as confusion, frustration, boredom/disengagement, high engagement, or test anxiety.',
        },
        {
          title: '5) Save the lesson as an authoring reference',
          detail:
            'When you save, the system stores this scenario at the lesson level as an authoring reference so the research team can understand the expected adaptive role of the lesson.',
        },
        {
          title: '6) Understand where execution really happens',
          detail:
            'Actual adaptive delivery does not depend on the lesson title alone. It depends on lesson content elements tied to adaptiveTag, the taskContextKey, and the live hybrid decision engine during the session.',
        },
        {
          title: '7) Review the learner preview',
          detail:
            'After saving, open learner preview or sign in with a trainee account. When the scenario conditions are met in the experimental group, the matching adaptive content will appear according to policy.',
        },
      ];
  const lessonScenarioNotes = isArabic
    ? [
        'الدرس الأساسي يناسب غالبًا سيناريو الارتباك أو الملل إذا كان المحتوى مفاهيميًا أو نظريًا.',
        'النشاط التفاعلي يناسب غالبًا الإحباط عند تكرار الأخطاء، أو الانخراط العالي عند الأداء القوي.',
        'الحالة/السيناريو يناسب الارتباك أو الإحباط أو الانخراط العالي بحسب صعوبة القرار وسلوك المتعلم.',
        'نقطة التحقق/التقييم تناسب القلق أثناء الاختبار، مع إمكانية فتح مسار الانخراط العالي عند الأداء المستقر.',
        'الحياد وفقدان الوجه/انخفاض الثقة لا يتطلبان عادة تأليف محتوى يدوي جديد داخل الدرس؛ فهما يداران أساسًا من سياسة التكيف نفسها.',
      ]
    : [
        'Core lessons usually align with confusion or boredom when the content is conceptual or theoretical.',
        'Interactive activities usually align with frustration when errors repeat, or high engagement when performance is strong.',
        'Case/scenario lessons can align with confusion, frustration, or high engagement depending on the decision load and learner behavior.',
        'Assessment checkpoints usually align with test anxiety, with optional high-engagement upgrade when performance stays strong.',
        'Neutral and no-face/low-confidence usually do not require manually authored extra content inside the lesson; they are mainly policy-governed states.',
      ];

  const renderHeroExtra = (
    <div className={styles.heroReference}>
      <h3>{content.heroReferenceTitle}</h3>
      <p>{content.heroReferenceLead}</p>
      <div className={styles.heroMetrics}>
        {content.heroMetrics.map((metric) => (
          <article key={metric.label}>
            <strong>{metric.label}</strong>
            <span>{metric.value}</span>
          </article>
        ))}
      </div>
    </div>
  );

  const renderSectionExtra = (section: HelpSection) => {
    if (section.id === 'overview') {
      return (
        <div className={styles.visualStack}>
          <article className={styles.panel}>
            <header className={styles.panelHead}>
              <Network size={18} />
              <h3>{isArabic ? 'خريطة مساحات المنصة' : 'Platform space map'}</h3>
            </header>
            <div className={styles.spaceMapGrid}>
              {content.overviewSpaces.map((space) => (
                <article key={space.title} className={styles.spaceCard}>
                  <strong>{space.title}</strong>
                  <p>{space.detail}</p>
                </article>
              ))}
            </div>
          </article>

          <article className={styles.panel}>
            <header className={styles.panelHead}>
              <ArrowLeftRight size={18} />
              <h3>{isArabic ? 'بيئة تعلم تقليدية مقابل بيئة تدريب ذكية تكيفية' : 'Standard learning environment vs smart adaptive environment'}</h3>
            </header>
            <div className={styles.compareGrid}>
              <article className={styles.compareCard}>
                <h4>{isArabic ? 'المسار القياسي' : 'Standard path'}</h4>
                <ul>
                  <li>{isArabic ? 'المحتوى والأنشطة نفسها من دون تكيّف قائم على الكاميرا.' : 'Same content and activities without camera-based adaptation.'}</li>
                  <li>{isArabic ? 'تحليلات تعلم وتقدم وأداء فقط.' : 'Progress, activity, and performance analytics only.'}</li>
                  <li>{isArabic ? 'تجربة المجموعة الضابطة.' : 'Control-group learner experience.'}</li>
                </ul>
              </article>
              <article className={styles.compareCard}>
                <h4>{isArabic ? 'المسار التكيفي' : 'Adaptive path'}</h4>
                <ul>
                  <li>{isArabic ? 'المحتوى الأساسي نفسه مع دعم سياقي عند الحاجة.' : 'Same core content with contextual support when needed.'}</li>
                  <li>{isArabic ? 'تحليل تعبيرات وجه فقط داخل الجلسات النشطة.' : 'Facial-expression analysis only during active sessions.'}</li>
                  <li>{isArabic ? 'تجربة المجموعة التجريبية.' : 'Experimental-group learner experience.'}</li>
                </ul>
              </article>
            </div>
          </article>
        </div>
      );
    }

    if (section.id === 'algorithms') {
      return (
        <div className={styles.visualStack}>
          <article className={styles.panel}>
            <header className={styles.panelHead}>
              <Workflow size={18} />
              <h3>{isArabic ? 'مخطط الاستشعار حتى حدث الوجه' : 'Sensing pipeline flowchart'}</h3>
            </header>
            <div className={styles.flowLane}>
              <FlowNode shape="terminator" label={isArabic ? 'بداية الجلسة' : 'Session start'} />
              <FlowArrow />
              <FlowNode shape="io" label={isArabic ? 'موافقة + تفعيل الكاميرا' : 'Consent + webcam activation'} tone="soft" />
              <FlowArrow />
              <FlowNode shape="process" label={isArabic ? 'كشف الوجه' : 'Detect face'} />
              <FlowArrow />
              <FlowNode shape="decision" label={isArabic ? 'هل الوجه مرصود؟' : 'Face detected?'} />
            </div>
            <div className={styles.flowBranches}>
              <div className={styles.branchCol}>
                <span className={styles.branchLabel}>{isArabic ? 'نعم' : 'YES'}</span>
                <FlowNode shape="process" label={isArabic ? 'تحليل التعبير + الثقة' : 'Infer expression + confidence'} />
                <FlowArrow />
                <FlowNode shape="data" label={isArabic ? 'تجميع نافذة 15 ثانية' : 'Build 15-second window'} tone="accent" />
                <FlowArrow />
                <FlowNode shape="process" label={isArabic ? 'إرسال للمحرك كل 5 ثوانٍ' : 'Evaluate every 5 seconds'} />
              </div>
              <div className={styles.branchCol}>
                <span className={styles.branchLabel}>{isArabic ? 'لا' : 'NO'}</span>
                <FlowNode
                  shape="process"
                  label={isArabic ? 'تسجيل غياب الوجه' : 'Log no-face event'}
                  note={isArabic ? 'العودة لمنطق الأداء فقط' : 'fallback to performance-only logic'}
                  tone="warn"
                />
              </div>
            </div>
          </article>

          <article className={styles.panel}>
            <header className={styles.panelHead}>
              <Radar size={18} />
              <h3>{isArabic ? 'قواعد القرار الزمني الحالية' : 'Current temporal decision rules'}</h3>
            </header>
            <div className={styles.compareGrid}>
              <article className={styles.compareCard}>
                <h4>{isArabic ? 'شروط التدخل التكيفي' : 'Adaptive intervention gates'}</h4>
                <ul>
                  <li>{isArabic ? 'ثقة 0.70 أو أعلى' : 'Confidence at 0.70 or above'}</li>
                  <li>{isArabic ? 'استمرار زمني كافٍ داخل النافذة' : 'Sufficient persistence inside the evidence window'}</li>
                  <li>{isArabic ? 'دمج الحالة مع السياق والأداء والأخطاء' : 'Combine state with task context, performance, and errors'}</li>
                </ul>
              </article>
              <article className={styles.compareCard}>
                <h4>{isArabic ? 'حالات المراقبة أو الرجوع' : 'Monitor or fallback states'}</h4>
                <ul>
                  <li>{isArabic ? 'أقل من 0.70: مراقبة فقط دون تدخل' : 'Below 0.70: monitor only, no adaptive action yet'}</li>
                  <li>{isArabic ? 'أقل من 0.55: أداء فقط / لا استنتاج انفعالي' : 'Below 0.55: performance-only, no emotion inference'}</li>
                  <li>{isArabic ? 'فترة تهدئة افتراضية 75 ثانية بين التدخلات' : 'Default 75-second cooldown between interventions'}</li>
                </ul>
              </article>
            </div>
          </article>

          <article className={styles.panel}>
            <header className={styles.panelHead}>
              <Layers3 size={18} />
              <h3>{isArabic ? 'كيف تربط أنواع المحتوى التكيفي بكل سيناريو؟' : 'How to bind adaptive content types to each scenario'}</h3>
            </header>
            <div className={styles.bindingInstructionBlock}>
              <strong>{isArabic ? 'المسار الدقيق من تعديل الدرس إلى الربط التكيفي' : 'Exact flow from lesson editing to adaptive binding'}</strong>
              <p>
                {isArabic
                  ? 'هذا التسلسل يشرح بدقة كيف تستخدم نافذة تعديل الدرس الحالية، وما الفرق بين نوع الدرس، والسيناريو التكيفي المتوقع، والتنفيذ الفعلي للمحتوى التكيفي داخل الجلسة.'
                  : 'This sequence explains exactly how to use the current lesson edit modal, and how lesson type, expected adaptive scenario, and actual adaptive content delivery differ.'}
              </p>
            </div>
            <div className={styles.bindingStepsGrid}>
              {lessonScenarioWorkflow.map((step) => (
                <article key={step.title} className={styles.bindingStepCard}>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                </article>
              ))}
            </div>
            <div className={styles.bindingInstructionBlock}>
              <strong>{isArabic ? 'ملاحظات تفسيرية سريعة' : 'Quick interpretation notes'}</strong>
              <ul className={styles.bindingNotesList}>
                {lessonScenarioNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
            <div className={styles.bindingStepsGrid}>
              {adaptiveBindingSteps.map((step) => (
                <article key={step.title} className={styles.bindingStepCard}>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                </article>
              ))}
            </div>
            <div className={styles.bindingGuideGrid}>
              {adaptiveBindingGuide.map((item) => (
                <article key={item.scenario} className={styles.bindingGuideCard}>
                  <header>
                    <span className={styles.bindingScenarioBadge}>{item.scenario}</span>
                  </header>
                  <div className={styles.bindingGuideCopy}>
                    <strong>{isArabic ? 'أنسب أنواع المحتوى' : 'Best-fit content types'}</strong>
                    <p>{item.contentTypes}</p>
                    <strong>{isArabic ? 'أين يضبط في منشئ المقرر' : 'Where to configure it in the builder'}</strong>
                    <p>{item.builderControl}</p>
                    <strong>{isArabic ? 'ملاحظة تشغيلية' : 'Operational note'}</strong>
                    <p>{item.note}</p>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className={styles.panel}>
            <header className={styles.panelHead}>
              <LineChart size={18} />
              <h3>{isArabic ? 'حلقة التغذية الراجعة الوجدانية' : 'Affective feedback loop'}</h3>
            </header>
            <div className={styles.relationChain}>
              <span>{isArabic ? 'إشارة الوجه' : 'Face signal'}</span>
              <FlowArrow />
              <span>{isArabic ? 'ثقة + مدة' : 'Confidence + duration'}</span>
              <FlowArrow />
              <span>{isArabic ? 'سياق المهمة + الأداء' : 'Task context + performance'}</span>
              <FlowArrow />
              <span>{isArabic ? 'اختيار الاستجابة التربوية' : 'Instructional response selection'}</span>
              <FlowArrow />
              <span>{isArabic ? 'تحديث مسار المتعلم' : 'Updated learner path'}</span>
            </div>
          </article>
        </div>
      );
    }

    if (section.id === 'architecture') {
      return (
        <div className={styles.visualStack}>
          <article className={styles.panel}>
            <header className={styles.panelHead}>
              <Layers3 size={18} />
              <h3>{isArabic ? 'المخطط المعماري الطبقي' : 'Layered architecture diagram'}</h3>
            </header>
            <div className={styles.archStack}>
              {content.architectureLayers.map((layer, index) => (
                <div key={layer.layer} className={styles.archLayer}>
                  <strong>{layer.layer}</strong>
                  <p>{layer.purpose}</p>
                  {index < content.architectureLayers.length - 1 ? <ArrowRight size={16} className={styles.archArrow} /> : null}
                </div>
              ))}
            </div>
          </article>

          <article className={styles.panel}>
            <header className={styles.panelHead}>
              <ListChecks size={18} />
              <h3>{isArabic ? 'خريطة ما يراه الباحث' : 'Researcher-facing applied map'}</h3>
            </header>
            <div className={styles.appliedMap}>
              <article><strong>{isArabic ? 'الاستشعار' : 'Sensing'}</strong><span>{isArabic ? '-> مختبر التحقق الحي' : '-> Live validation lab'}</span></article>
              <article><strong>{isArabic ? 'المحتوى' : 'Content'}</strong><span>{isArabic ? '-> مشغل الدرس ومسار الخطوات' : '-> Lesson player and step flow'}</span></article>
              <article><strong>{isArabic ? 'المحرك التكيفي' : 'Adaptive engine'}</strong><span>{isArabic ? '-> منطق السيناريوهات السبعة' : '-> Seven-scenario decision logic'}</span></article>
              <article><strong>{isArabic ? 'التحليلات' : 'Analytics'}</strong><span>{isArabic ? '-> تقارير وتصدير ومقارنة مجموعات' : '-> Reports, exports, and group comparison'}</span></article>
              <article><strong>{isArabic ? 'التحكم البحثي' : 'Research control'}</strong><span>{isArabic ? '-> منشئ المقرر ومعاينة المسارات' : '-> Course builder and learner-path preview'}</span></article>
            </div>
          </article>
        </div>
      );
    }

    if (section.id === 'authoring') {
      return (
        <div className={styles.visualStack}>
          <article className={styles.panel}>
            <header className={styles.panelHead}>
              <Workflow size={18} />
              <h3>{isArabic ? 'مخطط سير التأليف' : 'Authoring process diagram'}</h3>
            </header>
            <div className={styles.flowLane}>
              <FlowNode shape="process" label="Course" />
              <FlowArrow />
              <FlowNode shape="process" label="Unit" />
              <FlowArrow />
              <FlowNode shape="process" label="Lesson" />
              <FlowArrow />
              <FlowNode shape="process" label="Lesson Element" />
              <FlowArrow />
              <FlowNode shape="decision" label={isArabic ? 'نشر؟' : 'Publish?'} />
            </div>
            <div className={styles.flowBranches}>
              <div className={styles.branchCol}>
                <span className={styles.branchLabel}>{isArabic ? 'نعم' : 'YES'}</span>
                <FlowNode shape="terminator" label={isArabic ? 'مرئي للمتعلم + داخل التحليلات' : 'Visible to learner + in analytics'} tone="accent" />
              </div>
              <div className={styles.branchCol}>
                <span className={styles.branchLabel}>{isArabic ? 'لا' : 'NO'}</span>
                <FlowNode shape="terminator" label={isArabic ? 'حالة مسودة / تحرير داخلي' : 'Draft / internal editing state'} tone="soft" />
              </div>
            </div>
          </article>

          <article className={styles.panel}>
            <header className={styles.panelHead}>
              <BarChart3 size={18} />
              <h3>{isArabic ? 'أنواع عناصر الدرس المعتمدة' : 'Supported lesson element types'}</h3>
            </header>
            <div className={styles.pillGrid}>
              {(isArabic
                ? ['نص', 'صورة', 'مخطط', 'مستند / PDF', 'فيديو', 'نشاط تفاعلي', 'نشاط سيناريو', 'ملخص', 'نقطة تحقق', 'توضيح', 'دعم', 'إعادة تركيز', 'تحدٍ اختياري']
                : ['Text', 'Image', 'Diagram', 'Document / PDF', 'Video', 'Interactive activity', 'Scenario activity', 'Summary', 'Checkpoint', 'Clarification', 'Support', 'Re-focus', 'Optional challenge']
              ).map((type) => (
                <span key={type}>{type}</span>
              ))}
            </div>
          </article>

          <article className={styles.panel}>
            <header className={styles.panelHead}>
              <ListChecks size={18} />
              <h3>{isArabic ? 'قواعد معاينة المتعلم' : 'Learner preview rules'}</h3>
            </header>
            <div className={styles.compareGrid}>
              <article className={styles.compareCard}>
                <h4>{isArabic ? 'ما يظهر أولًا للمتعلم' : 'What the learner sees first'}</h4>
                <ul>
                  <li>{isArabic ? 'عنوان الخطوة أو هدفها' : 'Step title or objective'}</li>
                  <li>{isArabic ? 'المحتوى أو الوسيط الحالي' : 'Current content or media'}</li>
                  <li>{isArabic ? 'تغذية راجعة قصيرة عند الحاجة' : 'Brief feedback when needed'}</li>
                </ul>
              </article>
              <article className={styles.compareCard}>
                <h4>{isArabic ? 'ما يأتي بعد المحتوى' : 'What follows the content'}</h4>
                <ul>
                  <li>{isArabic ? 'تنبيه تكيفي واحد فقط إذا استدعى السياق' : 'Only one adaptive notice if context requires it'}</li>
                  <li>{isArabic ? 'منطقة الإجراء والتنقل أسفل الخطوة نفسها' : 'Action/navigation area below the same step'}</li>
                  <li>{isArabic ? 'تبقى وسوم التأليف والمنطق الداخلي للباحث فقط' : 'Authoring labels and internal logic remain researcher-only'}</li>
                </ul>
              </article>
            </div>
          </article>
        </div>
      );
    }

    if (section.id === 'adaptive-mapping') {
      return (
        <div className={styles.visualStack}>
          <article className={styles.panel}>
            <header className={styles.panelHead}>
              <Sparkles size={18} />
              <h3>{isArabic ? 'خريطة المحفز -> الاستجابة' : 'Trigger -> response map'}</h3>
            </header>
            <div className={styles.triggerFlow}>
              <article><strong>{isArabic ? 'الارتباك' : 'Confusion'}</strong><ArrowRight size={16} /><span>{isArabic ? 'توضيح أو تلميح مساند' : 'Clarification or scaffolded hint'}</span></article>
              <article><strong>{isArabic ? 'الإحباط' : 'Frustration'}</strong><ArrowRight size={16} /><span>{isArabic ? 'دعم مبسط أو تقسيم للمهمة' : 'Supportive breakdown or task decomposition'}</span></article>
              <article><strong>{isArabic ? 'الملل / انخفاض الاندماج' : 'Boredom / disengagement'}</strong><ArrowRight size={16} /><span>{isArabic ? 'نشاط قصير يعيد التفاعل' : 'Interactive case or quick activity'}</span></article>
              <article><strong>{isArabic ? 'قلق التقييم' : 'Assessment anxiety'}</strong><ArrowRight size={16} /><span>{isArabic ? 'تطمين إجرائي محايد' : 'Neutral procedural reassurance'}</span></article>
              <article><strong>{isArabic ? 'الاندماج المرتفع' : 'High engagement'}</strong><ArrowRight size={16} /><span>{isArabic ? 'تحدٍ اختياري أو إثراء' : 'Optional challenge or enrichment'}</span></article>
              <article><strong>{isArabic ? 'فقدان الوجه / انخفاض الثقة' : 'Face lost / low confidence'}</strong><ArrowRight size={16} /><span>{isArabic ? 'العودة إلى الأداء فقط' : 'Performance-only fallback'}</span></article>
            </div>
          </article>

          <article className={styles.panel}>
            <header className={styles.panelHead}>
              <Database size={18} />
              <h3>{isArabic ? 'مصفوفة السيناريوهات السبعة' : 'Seven-scenario adaptive matrix'}</h3>
            </header>
            <div className={styles.matrixWrap}>
              <table className={styles.matrixTable}>
                <thead>
                  <tr>
                    <th>{isArabic ? 'الحالة' : 'State'}</th>
                    <th>{isArabic ? 'شرط التفعيل' : 'Trigger condition'}</th>
                    <th>{isArabic ? 'الاستجابة' : 'Response'}</th>
                    <th>{isArabic ? 'الهدف' : 'Objective'}</th>
                    <th>{isArabic ? 'الأثر المتوقع' : 'Expected effect'}</th>
                  </tr>
                </thead>
                <tbody>
                  {content.adaptiveMatrixRows.map((row) => (
                    <tr key={row.emotion}>
                      <td>{row.emotion}</td>
                      <td>{row.condition}</td>
                      <td>{row.content}</td>
                      <td>{row.objective}</td>
                      <td>{row.effect}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className={styles.panel}>
            <header className={styles.panelHead}>
              <LineChart size={18} />
              <h3>{isArabic ? 'خريطة الأثر التربوي' : 'Pedagogical effect chain'}</h3>
            </header>
            <div className={styles.relationChain}>
              <span>{isArabic ? 'حالة مرصودة' : 'Observed state'}</span>
              <FlowArrow />
              <span>{isArabic ? 'تفسير سياقي' : 'Contextual interpretation'}</span>
              <FlowArrow />
              <span>{isArabic ? 'اختيار استجابة تعليمية' : 'Instructional response selection'}</span>
              <FlowArrow />
              <span>{isArabic ? 'تأثير على الأداء والاستمرار' : 'Effect on performance and progression'}</span>
            </div>
          </article>
        </div>
      );
    }

    if (section.id === 'reports') {
      return (
        <div className={styles.reportGrid}>
          {content.reportMocks.map((report) => (
            <article key={report.title} className={styles.reportCard}>
              <header>
                <FileBarChart2 size={16} />
                <h3>{report.title}</h3>
              </header>
              <div className={styles.reportMockBox}>
                <ReportMockChart type={report.chart} />
              </div>
              <div className={styles.reportInterpretation}>
                <strong>{isArabic ? 'ما الذي يعرضه' : 'What it shows'}</strong>
                <p>{report.shows}</p>
                <strong>{isArabic ? 'كيف يفسَّر' : 'How to read it'}</strong>
                <p>{report.interpretation}</p>
              </div>
              <ul>
                {report.callouts.map((callout) => (
                  <li key={callout}>{callout}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      );
    }

    if (section.id === 'presentation-flow') {
      return (
        <div className={styles.visualStack}>
          <article className={styles.panel}>
            <header className={styles.panelHead}>
              <Workflow size={18} />
              <h3>{isArabic ? 'تسلسل عرض الأدلة' : 'Evidence presentation sequence'}</h3>
            </header>
            <div className={styles.presentationFlow}>
              {content.presentationStages.map((stage, index, array) => (
                <div key={stage.title} className={styles.presentationNode}>
                  <span>{stage.title}</span>
                  {index < array.length - 1 ? <ArrowRight size={14} className={styles.flowArrowIcon} /> : null}
                </div>
              ))}
            </div>
          </article>

          <div className={styles.stageGrid}>
            {content.presentationStages.map((stage) => (
              <article key={stage.title} className={styles.stageCard}>
                <h4>{stage.title}</h4>
                <p>{stage.purpose}</p>
                <span>{stage.question}</span>
              </article>
            ))}
          </div>
        </div>
      );
    }

    if (section.id === 'validation-limits') {
      return (
        <div className={styles.visualStack}>
          <article className={styles.panel}>
            <header className={styles.panelHead}>
              <CircleHelp size={18} />
              <h3>{isArabic ? 'حدود الاستدلال العلمي' : 'Scientific boundary clarifier'}</h3>
            </header>
            <div className={styles.compareGrid}>
              <article className={styles.compareCard}>
                <h4>{isArabic ? 'ما تدعمه المنصة' : 'What the platform supports'}</h4>
                <ul>
                  <li>{isArabic ? 'تفسير تعليمي تكيفي مبني على الحالة والسياق' : 'Educational adaptation based on learner state and context'}</li>
                  <li>{isArabic ? 'تسجيل زمني للتدخلات والانخراط والتقدم' : 'Timestamped logging of interventions, engagement, and progress'}</li>
                  <li>{isArabic ? 'تحليلات مقارنة بحثية قابلة للتصدير' : 'Export-ready comparative research analytics'}</li>
                </ul>
              </article>
              <article className={styles.compareCard}>
                <h4>{isArabic ? 'ما لا تدّعيه المنصة' : 'What the platform does not claim'}</h4>
                <ul>
                  <li>{isArabic ? 'تشخيصًا نفسيًا أو طبيًا' : 'Clinical or psychological diagnosis'}</li>
                  <li>{isArabic ? 'يقينًا انفعاليًا من إطار واحد' : 'Absolute certainty from a single frame'}</li>
                  <li>{isArabic ? 'الاستعاضة عن الحكم التربوي البشري' : 'Replacement of human pedagogical judgement'}</li>
                </ul>
              </article>
            </div>
          </article>
        </div>
      );
    }

    if (section.id === 'camera-protocol') {
      return (
        <div className={styles.visualStack}>
          <article className={styles.panel}>
            <header className={styles.panelHead}>
              <Camera size={18} />
              <h3>{isArabic ? 'إعداد الكاميرا والبيئة للجلسات التجريبية' : 'Camera and environment setup for experimental sessions'}</h3>
            </header>
            <div className={styles.setupFlow}>
              <article><ScanFace size={16} /><strong>{isArabic ? 'الوجه ظاهر بوضوح' : 'Face clearly visible'}</strong><p>{isArabic ? 'يزيد من جودة الثقة' : 'Improves confidence quality'}</p></article>
              <article><Sparkles size={16} /><strong>{isArabic ? 'إضاءة متوازنة' : 'Balanced lighting'}</strong><p>{isArabic ? 'تقلل الضوضاء في القراءة' : 'Reduces sensing noise'}</p></article>
              <article><ListChecks size={16} /><strong>{isArabic ? 'ثبات نسبي' : 'Reasonable stability'}</strong><p>{isArabic ? 'يمنع كثرة التحولات الزائفة' : 'Prevents unstable detection shifts'}</p></article>
            </div>
          </article>

          <div className={styles.compareGrid}>
            <article className={styles.compareCard}>
              <h4>{isArabic ? 'شروط جيدة' : 'Good conditions'}</h4>
              <ul>
                <li>{isArabic ? 'إضاءة أمامية واضحة' : 'Clear frontal lighting'}</li>
                <li>{isArabic ? 'تموضع وجه متزن' : 'Balanced face position'}</li>
                <li>{isArabic ? 'خلفية هادئة' : 'Low-noise background'}</li>
              </ul>
            </article>
            <article className={styles.compareCard}>
              <h4>{isArabic ? 'شروط ضعيفة' : 'Weak conditions'}</h4>
              <ul>
                <li>{isArabic ? 'ظلال حادة أو إضاءة جانبية قوية' : 'Harsh shadows or strong side lighting'}</li>
                <li>{isArabic ? 'حركة كاميرا مستمرة' : 'Continuous camera motion'}</li>
                <li>{isArabic ? 'حجب الوجه جزئيًا' : 'Partial face occlusion'}</li>
              </ul>
            </article>
            <article className={styles.compareCard}>
              <h4>{isArabic ? 'الخصوصية والرجوع الآمن' : 'Privacy and safe fallback'}</h4>
              <ul>
                <li>{isArabic ? 'لا يُخزن الفيديو الخام افتراضيًا' : 'Raw video is not stored by default'}</li>
                <li>{isArabic ? 'عند ضعف الإشارة يعود النظام إلى الأداء فقط' : 'Weak signal triggers performance-only fallback'}</li>
                <li>{isArabic ? 'لا تُعرض أي أوصاف نفسية تشخيصية للمتعلم' : 'No clinical or psychological labels are shown to learners'}</li>
              </ul>
            </article>
          </div>
        </div>
      );
    }

    if (section.id === 'raw-vs-interpreted') {
      return (
        <div className={styles.visualStack}>
          <article className={styles.panel}>
            <header className={styles.panelHead}>
              <ArrowLeftRight size={18} />
              <h3>{isArabic ? 'المقارنة بين الإشارة الخام والحالة التعليمية' : 'Raw signal vs educational state'}</h3>
            </header>
            <div className={styles.pipelineCompare}>
              <article>
                <h4>{isArabic ? 'الإشارة الخام' : 'Raw signal'}</h4>
                <ul>
                  <li>{isArabic ? 'لحظية وعلى مستوى الإطار' : 'Frame-level and momentary'}</li>
                  <li>{isArabic ? 'حساسة للضوضاء والإضاءة' : 'Sensitive to noise and lighting'}</li>
                  <li>{isArabic ? 'لا تكفي وحدها لاتخاذ قرار' : 'Not sufficient alone for action'}</li>
                </ul>
              </article>
              <article>
                <h4>{isArabic ? 'التفسير الممهَّد' : 'Smoothed interpretation'}</h4>
                <ul>
                  <li>{isArabic ? 'تنعيم عبر الزمن داخل نافذة الأدلة' : 'Smoothed across the evidence window'}</li>
                  <li>{isArabic ? 'مقترن بالسياق والأداء' : 'Joined with context and performance'}</li>
                  <li>{isArabic ? 'تحجب بوابات الثقة الحالات الضعيفة' : 'Confidence gates suppress weak readings'}</li>
                </ul>
              </article>
              <article>
                <h4>{isArabic ? 'الحالة التعليمية' : 'Educational state'}</h4>
                <ul>
                  <li>{isArabic ? 'تُستخدم في قرار التكيف' : 'Used for adaptive decisioning'}</li>
                  <li>{isArabic ? 'قابلة للتفسير البحثي' : 'Interpretable in research logs'}</li>
                  <li>{isArabic ? 'ليست تشخيصًا طبيًا أو نفسيًا' : 'Not a medical or psychological diagnosis'}</li>
                </ul>
              </article>
            </div>
          </article>
        </div>
      );
    }

    if (section.id === 'experiment-groups') {
      return (
        <div className={styles.visualStack}>
          <article className={styles.panel}>
            <header className={styles.panelHead}>
              <ArrowLeftRight size={18} />
              <h3>{isArabic ? 'المجموعة الضابطة مقابل المجموعة التجريبية' : 'Control group vs experimental group'}</h3>
            </header>
            <div className={styles.compareGrid}>
              <article className={styles.compareCard}>
                <h4>{isArabic ? 'المجموعة الضابطة' : 'Control group'}</h4>
                <ul>
                  <li>{isArabic ? 'المحتوى والأنشطة والاختبارات نفسها داخل المسار القياسي.' : 'Same content, activities, and tests inside the standard path.'}</li>
                  <li>{isArabic ? 'لا كاميرا ولا تحليل تعبيرات وجه.' : 'No camera and no facial-expression analysis.'}</li>
                  <li>{isArabic ? 'لا تدخلات تكيفية مبنية على الانفعال.' : 'No emotion-based adaptive interventions.'}</li>
                </ul>
              </article>
              <article className={styles.compareCard}>
                <h4>{isArabic ? 'المجموعة التجريبية' : 'Experimental group'}</h4>
                <ul>
                  <li>{isArabic ? 'المحتوى نفسه داخل البيئة التكيفية الحالية.' : 'Same core content inside the current adaptive environment.'}</li>
                  <li>{isArabic ? 'الكاميرا تعمل فقط في الجلسات النشطة وبعد الموافقة.' : 'Webcam runs only during active sessions and after consent.'}</li>
                  <li>{isArabic ? 'قد يظهر دعم سياقي وفق السيناريوهات السبعة الحالية.' : 'Contextual support may appear through the seven implemented scenarios.'}</li>
                </ul>
              </article>
            </div>
          </article>

          <article className={styles.panel}>
            <header className={styles.panelHead}>
              <ScanFace size={18} />
              <h3>{isArabic ? 'نطاق الاستشعار في التطبيق الحالي' : 'Sensing scope in the current implementation'}</h3>
            </header>
            <div className={styles.spaceMapGrid}>
              <article className={styles.spaceCard}>
                <strong>{isArabic ? 'تعبيرات الوجه فقط' : 'Facial expressions only'}</strong>
                <p>
                  {isArabic
                    ? 'كل سلوك تكيفي في هذه الدراسة يعتمد على تحليل تعبيرات الوجه فقط عبر الكاميرا. لا تتضمن المنصة حساسات فسيولوجية أو أجهزة ارتداء أو تدفقات حيوية إضافية.'
                    : 'All adaptive behaviour in this study relies on facial-expression analysis only through the webcam. The platform does not include physiological sensors, wearables, or any other biometric stream.'}
                </p>
              </article>
              <article className={styles.spaceCard}>
                <strong>{isArabic ? 'حساب الباحث منفصل' : 'Researcher account remains separate'}</strong>
                <p>
                  {isArabic
                    ? 'حساب الباحث ليس جزءًا من تصنيف المتعلمين. يبقى دوره لإدارة المحتوى، ومعاينة المسارات، وقراءة التقارير والتصدير.'
                    : 'The researcher account is not part of learner grouping. It remains dedicated to authoring, preview, reporting, and export workflows.'}
                </p>
              </article>
              <article className={styles.spaceCard}>
                <strong>{isArabic ? 'كيف يظهر الفرق في المنصة' : 'How the difference appears'}</strong>
                <p>
                  {isArabic
                    ? 'الفارق يطبَّق على مستوى سلوك المسار فقط: الضابطة ترى المسار القياسي، بينما التجريبية قد ترى دعمًا تكيفيًا داخل الدرس وفق تعبيرات الوجه والسياق والأداء.'
                    : 'The difference is applied through learner-flow behaviour only: the control group sees the standard path, while the experimental group may see in-flow adaptive support based on facial expressions, context, and performance.'}
                </p>
              </article>
            </div>
          </article>
        </div>
      );
    }

    return null;
  };

  return (
    <HelpCenterLayout
      eyebrow={content.eyebrow}
      title={content.title}
      lead={content.lead}
      introPoints={content.introPoints}
      heroHighlights={content.heroHighlights}
      renderHeroExtra={renderHeroExtra}
      sections={content.sections}
      faqTitle={content.faqTitle}
      faqItems={categorizedFaq}
      tipsTitle={content.tipsTitle}
      tips={content.tips}
      renderSectionExtra={renderSectionExtra}
    />
  );
}
