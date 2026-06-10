import HelpCenterLayout, { type HelpFaqItem, type HelpSection } from '@/components/help/HelpCenterLayout';
import { useI18n } from '@/i18n';
import styles from './AdaptiveDisplayCriteriaPage.module.css';

type LocalizedContent = {
  eyebrow: string;
  title: string;
  lead: string;
  introPoints: string[];
  heroHighlights: string[];
  heroTitle: string;
  heroLead: string;
  sections: HelpSection[];
  faqTitle: string;
  faqItems: HelpFaqItem[];
  tipsTitle: string;
  tips: string[];
};

const EN_CONTENT: LocalizedContent = {
  eyebrow: 'Research Acceptance Standard',
  title: 'Adaptive Display Acceptance Criteria',
  lead:
    'Reference page defining what learners should see, what must stay hidden, and how adaptive guidance and assessment feedback should behave in the final learner experience.',
  introPoints: [
    'Use this page to judge whether learner-facing adaptive screens are acceptable for research presentation and pilot use.',
    'The standard protects the learner from implementation noise while preserving full logic in researcher/admin views.',
  ],
  heroHighlights: ['Content-first visibility', 'Inline + action-area notices', 'Immediate answer feedback', 'Researcher-only internal logic'],
  heroTitle: 'Core acceptance decision',
  heroLead:
    'If a visible element supports learning, it may remain. If it explains platform logic instead of helping the learner act, it must stay hidden from learner screens.',
  sections: [
    {
      id: 'principle',
      title: '1) General Principle',
      summary: 'Adaptive support should feel like instructional guidance, not a visible system mechanism.',
      points: [
        'The learner sees content first, then any necessary support, then the next action.',
        'Adaptive help appears only when a valid pedagogical reason exists.',
        'Support stays inside the lesson flow and never competes with the content as a fixed overlay.',
        'Internal labels, branch names, and authored logic belong to researcher spaces only.',
      ],
    },
    {
      id: 'visible',
      title: '2) What Must Be Visible To Learners',
      summary: 'Show only what directly supports understanding, action, and learning progress.',
      cards: [
        { title: 'Core lesson elements', description: 'Lesson title, current content, current task, and concise progress state.' },
        { title: 'Essential feedback', description: 'Correct/incorrect result, short explanation, and the next required action.' },
        { title: 'Adaptive guidance only when needed', description: 'A brief contextual message with one reason and one action.' },
      ],
    },
    {
      id: 'hidden',
      title: '3) What Must Stay Hidden From Learners',
      summary: 'The learner should not read internal implementation or authoring logic.',
      points: [
        'Hide step type, progress rules, authored branch labels, and internal metadata.',
        'Keep baseline path, adaptive branch, and authored variant logic inside researcher/admin views only.',
        'Do not show system commentary, trigger labels, or implementation notes inside learner pages.',
      ],
    },
    {
      id: 'notices',
      title: '4) Adaptive Notice Policy',
      summary: 'Use the lightest effective notice and keep it inside the normal lesson flow.',
      steps: [
        'Use Inline Step Notice for nearby clarification, a quick hint, or confusion support tied to the current content.',
        'Use Bottom Action Notice for retry, required support before continuation, re-focus before moving on, or optional challenge unlocks.',
        'Show one adaptive notice at a time and do not repeat the same message as a large banner and a bottom notice together.',
      ],
    },
    {
      id: 'assessment',
      title: '5) Assessment Feedback Policy',
      summary: 'Every answer must generate clear instructional feedback, not only a score state.',
      steps: [
        'Single-answer questions show an immediate correct or incorrect icon once the answer is resolved.',
        'If the answer is incorrect, the chosen wrong option stays visible and the correct answer is revealed clearly.',
        'After the result, show a brief explanation and one clear next action such as continue, retry, or review support.',
      ],
    },
    {
      id: 'completion',
      title: '6) Passive vs Active Step Completion',
      summary: 'Passive content should not create confirmation fatigue. Explicit completion is reserved for active learning steps.',
      points: [
        'Text, image, document, and video steps should usually continue naturally after reasonable review.',
        'Quiz, activity, reflection, branching choice, and required recovery steps can require explicit action.',
        'If a step blocks progression, the learner must be told why in plain instructional language.',
      ],
    },
    {
      id: 'scenarios',
      title: '7) Adaptive Scenario Display Rules',
      summary: 'Different learner needs should appear with different levels of support and different placements.',
      cards: [
        { title: 'No face / low confidence', description: 'Avoid guessing from weak visual input. Fall back to performance-only logic and keep the learner informed calmly.' },
        { title: 'Confusion', description: 'Show nearby clarification tied to the exact idea or question that needs support.' },
        { title: 'Frustration', description: 'Show a calmer, simpler next step with supportive wording and lower cognitive load.' },
        { title: 'Boredom / disengagement', description: 'Offer a short activating prompt or micro-activity that restores attention without overloading the screen.' },
        { title: 'Assessment anxiety', description: 'Show reassurance about the instructions only, without guiding the answer.' },
        { title: 'Neutral', description: 'Keep the learner on the standard path and suppress unnecessary alerts when performance remains acceptable.' },
        { title: 'High engagement', description: 'Offer an optional challenge or advanced path without interrupting the main lesson flow.' },
      ],
    },
    {
      id: 'acceptance',
      title: '8) Final Acceptance Rule',
      summary: 'This is the final decision rule used when reviewing learner-facing adaptive screens.',
      points: [
        'If the element supports learning, it may remain.',
        'If it explains the platform more than it helps the learner act, it must be hidden from learner screens.',
        'Researcher/admin preview should still preserve the full authored logic for simulation, auditing, and reporting.',
      ],
    },
  ],
  faqTitle: 'Acceptance FAQ',
  faqItems: [
    {
      question: 'Can the learner ever see internal path names or trigger labels?',
      answer: 'No. Path logic and trigger labels stay in Course Builder, preview, and researcher/admin tools only.',
      category: 'Visibility',
    },
    {
      question: 'When should the bottom action notice appear?',
      answer: 'Use it when the message is about progression, retry, required support before continuation, or another next-action decision near the action area.',
      category: 'Adaptive notices',
    },
    {
      question: 'Should passive content ask for manual confirmation?',
      answer: 'Not by default. Passive steps should continue naturally after reasonable review unless there is a deliberate instructional reason to stop.',
      category: 'Progression',
    },
    {
      question: 'What is required for single-answer assessment feedback?',
      answer: 'Immediate correct/incorrect icons, clear answer-state visibility, a short explanation, and one explicit next action.',
      category: 'Assessment',
    },
  ],
  tipsTitle: 'Review Checklist',
  tips: [
    'Keep learner screens content-first.',
    'Show one adaptive notice at a time.',
    'Use inline notice for content support and bottom action notice for progression support.',
    'Use calm, action-oriented wording instead of technical system language.',
    'Keep full adaptive logic inside researcher/admin preview only.',
  ],
};

const AR_CONTENT: LocalizedContent = {
  eyebrow: 'مرجع قبول بحثي',
  title: 'معايير قبول عرض التكيف',
  lead:
    'صفحة مرجعية توضح ما الذي ينبغي أن يراه المتعلم، وما الذي يجب أن يبقى مخفيًا، وكيف ينبغي أن تعمل رسائل الدعم التكيفي والتغذية الراجعة داخل واجهة التعلم النهائية.',
  introPoints: [
    'استخدم هذه الصفحة للحكم على مدى قبول الشاشات التكيفية من منظور العرض البحثي والتجربة التعليمية الفعلية.',
    'يحمي هذا المعيار المتعلم من ضوضاء النظام، مع إبقاء المنطق الكامل ظاهرًا لمسؤول البحث فقط.',
  ],
  heroHighlights: ['إظهار متمحور حول المحتوى', 'تنبيه قريب + تنبيه عند منطقة الإجراء', 'تغذية راجعة فورية', 'المنطق الداخلي للباحث فقط'],
  heroTitle: 'قاعدة القبول الأساسية',
  heroLead:
    'إذا كان العنصر يدعم التعلم فيجوز إبقاؤه. وإذا كان يشرح منطق المنصة بدلًا من مساعدة المتعلم على الفعل، فيجب إخفاؤه عن شاشات المتعلم.',
  sections: [
    {
      id: 'principle',
      title: '1) المبدأ العام',
      summary: 'ينبغي أن يظهر الدعم التكيفي كمساعدة تعليمية طبيعية، لا كآلية نظامية ظاهرة.',
      points: [
        'يرى المتعلم المحتوى أولًا، ثم أي دعم مطلوب، ثم الإجراء التالي.',
        'لا يظهر الدعم التكيفي إلا عند وجود سبب تربوي واضح.',
        'يبقى الدعم داخل تدفق الدرس، ولا يتنافس مع المحتوى كطبقة عائمة فوقه.',
        'تبقى أسماء الفروع والمنطق المؤلف والوسوم الداخلية في مساحة الباحث فقط.',
      ],
    },
    {
      id: 'visible',
      title: '2) ما الذي يجب أن يراه المتعلم',
      summary: 'يُعرض فقط ما يدعم الفهم، والفعل، والتقدم داخل التعلم.',
      cards: [
        { title: 'عناصر الدرس الأساسية', description: 'عنوان الدرس، والمحتوى الحالي، والمهمة الحالية، وحالة تقدم مختصرة.' },
        { title: 'التغذية الراجعة الأساسية', description: 'نتيجة صحيحة أو غير صحيحة، وشرح قصير، وما الذي يفعله المتعلم بعد ذلك.' },
        { title: 'الدعم التكيفي عند الحاجة فقط', description: 'رسالة سياقية قصيرة تتضمن سببًا واحدًا وإجراءً واحدًا.' },
      ],
    },
    {
      id: 'hidden',
      title: '3) ما الذي يجب أن يبقى مخفيًا عن المتعلم',
      summary: 'لا ينبغي أن يقرأ المتعلم منطق التنفيذ أو تفاصيل التأليف الداخلية.',
      points: [
        'يُخفى نوع الخطوة، وقواعد التقدم، ووسوم الفروع، والبيانات الوصفية الداخلية.',
        'يبقى منطق المسار الأساسي والفروع التكيفية والمتغيرات المؤلفة داخل صفحات الباحث والإدارة فقط.',
        'لا يجوز إظهار تعليقات النظام أو أسماء المحفزات أو ملاحظات التنفيذ داخل شاشات المتعلم.',
      ],
    },
    {
      id: 'notices',
      title: '4) سياسة التنبيهات التكيفية',
      summary: 'استخدم أخف تنبيه يحقق الهدف، وأبقِه داخل التدفق الطبيعي للدرس.',
      steps: [
        'استخدم Inline Step Notice للتوضيح القريب، أو التلميح السريع، أو دعم الارتباك المرتبط بالمحتوى الحالي.',
        'استخدم Bottom Action Notice للإعادة، أو الدعم المطلوب قبل المتابعة، أو إعادة التركيز، أو فتح تحدٍ اختياري قرب منطقة الإجراء.',
        'اعرض تنبيهًا تكيفيًا واحدًا في كل مرة، ولا تكرر الحدث نفسه على شكل لافتة كبيرة وتنبيه سفلي معًا.',
      ],
    },
    {
      id: 'assessment',
      title: '5) سياسة التغذية الراجعة في التقييم',
      summary: 'كل إجابة يجب أن تنتج تغذية راجعة تعليمية واضحة، لا مجرد حالة نجاح أو خطأ.',
      steps: [
        'في أسئلة الاختيار الواحد، يظهر رمز صحيح أو خطأ مباشرة بعد حسم الإجابة.',
        'إذا كانت الإجابة خاطئة، يبقى الاختيار الخاطئ ظاهرًا ويُكشف الجواب الصحيح بوضوح.',
        'بعد النتيجة، يظهر شرح قصير وإجراء تالٍ واحد واضح مثل المتابعة أو إعادة المحاولة أو مراجعة الدعم.',
      ],
    },
    {
      id: 'completion',
      title: '6) الإكمال في الخطوات السلبية والنشطة',
      summary: 'لا ينبغي أن يسبب المحتوى السلبي إرهاقًا من أزرار التأكيد. الإكمال الصريح يُستخدم فقط عندما تتطلب الخطوة فعلًا تعليميًا مباشرًا.',
      points: [
        'خطوات النص، والصورة، والمستند، والفيديو تتقدم غالبًا بعد مراجعة معقولة دون تأكيد يدوي.',
        'الاختبار، والنشاط، والتأمل، والاختيار التفرعي، وخطوات الاستعادة المطلوبة يمكن أن تتطلب إجراءً صريحًا.',
        'إذا أوقفت خطوة التقدم، فيجب أن يوضَّح السبب للمتعلم بلغة تعليمية بسيطة.',
      ],
    },
    {
      id: 'scenarios',
      title: '7) قواعد عرض السيناريوهات التكيفية',
      summary: 'تظهر احتياجات المتعلم المختلفة بدرجات دعم متفاوتة وبأماكن عرض مناسبة لطبيعة كل حالة.',
      cards: [
        { title: 'فقدان الوجه / انخفاض الثقة', description: 'تجنب التخمين عند ضعف الإشارة البصرية. استمر بمنطق يعتمد على الأداء فقط مع رسالة هادئة وواضحة.' },
        { title: 'الارتباك', description: 'أظهر توضيحًا قريبًا مرتبطًا بالنقطة أو السؤال الذي يحتاج إلى دعم.' },
        { title: 'الإحباط', description: 'أظهر خطوة تالية أبسط وصياغة أكثر هدوءًا ودعمًا.' },
        { title: 'الملل / ضعف الاندماج', description: 'أظهر دفعة قصيرة أو نشاطًا مصغرًا يعيد الزخم والانتباه من دون إرباك الواجهة.' },
        { title: 'قلق التقييم', description: 'أظهر تطمينًا إجرائيًا يوضح التعليمات فقط، من دون توجيه الإجابة.' },
        { title: 'الحياد', description: 'أبقِ المتعلم على المسار الأساسي وامنع التنبيهات غير الضرورية ما دام الأداء مستقرًا.' },
        { title: 'الانخراط المرتفع', description: 'قدّم تحديًا أو مسارًا متقدمًا اختياريًا من دون مقاطعة التدفق التعليمي الأساسي.' },
      ],
    },
    {
      id: 'acceptance',
      title: '8) قاعدة القبول النهائية',
      summary: 'هذه هي القاعدة النهائية التي يُحكم بها على قبول أو رفض عناصر العرض التكيفي في واجهة المتعلم.',
      points: [
        'إذا كان العنصر يدعم التعلم، فيمكن الإبقاء عليه.',
        'إذا كان يشرح المنصة أكثر مما يساعد المتعلم على الفعل، فيجب إخفاؤه عن شاشة المتعلم.',
        'تبقى المعاينة الباحثية محتفظة بالمنطق الكامل للمحاكاة، والتدقيق، والتقارير.',
      ],
    },
  ],
  faqTitle: 'الأسئلة الشائعة حول معايير القبول',
  faqItems: [
    {
      question: 'هل يمكن أن يرى المتعلم أسماء المسارات أو المحفزات الداخلية؟',
      answer: 'لا. يبقى منطق المسارات والمحرضات داخل منشئ المقرر، وأدوات المعاينة، ومساحات الباحث فقط.',
      category: 'الإظهار',
    },
    {
      question: 'متى ينبغي أن يظهر التنبيه عند منطقة الإجراء؟',
      answer: 'يظهر عندما تكون الرسالة مرتبطة بالمتابعة، أو إعادة المحاولة، أو الدعم المطلوب قبل الانتقال، أو قرار تالٍ قريب من منطقة الإجراء.',
      category: 'التنبيهات التكيفية',
    },
    {
      question: 'هل ينبغي أن تطلب الخطوات السلبية تأكيدًا يدويًا؟',
      answer: 'ليس افتراضيًا. تتقدم الخطوات السلبية طبيعيًا بعد مراجعة معقولة ما لم توجد حاجة تعليمية مقصودة لإيقافها.',
      category: 'التقدم',
    },
    {
      question: 'ما المطلوب في التغذية الراجعة لأسئلة الاختيار الواحد؟',
      answer: 'رموز فورية للصحيح أو الخطأ، ووضوح في حالة الإجابة، وشرح مختصر، وإجراء تالٍ واحد صريح.',
      category: 'التقييم',
    },
  ],
  tipsTitle: 'قائمة مراجعة سريعة',
  tips: [
    'اجعل شاشة المتعلم متمحورة حول المحتوى.',
    'اعرض تنبيهًا تكيفيًا واحدًا في كل مرة.',
    'استخدم التنبيه القريب لدعم المحتوى، والتنبيه عند منطقة الإجراء لدعم التقدم.',
    'استخدم لغة هادئة موجَّهة للفعل بدل اللغة التقنية.',
    'أبقِ منطق التكيف الكامل داخل معاينة الباحث فقط.',
  ],
};

export default function AdaptiveDisplayCriteriaPage() {
  const { language } = useI18n();
  const isArabic = language === 'ar';
  const content = isArabic ? AR_CONTENT : EN_CONTENT;

  const renderHeroExtra = (
    <div className={styles.heroReference}>
      <h3>{content.heroTitle}</h3>
      <p>{content.heroLead}</p>
    </div>
  );

  const renderSectionExtra = (section: HelpSection) => {
    if (section.id === 'visible') {
      return (
        <div className={styles.compareGrid}>
          <article className={styles.compareCard}>
            <h3>{isArabic ? 'يبقى ظاهرًا' : 'Stays visible'}</h3>
            <ul>
              <li>{isArabic ? 'العنوان والمحتوى الحالي' : 'Current title and content'}</li>
              <li>{isArabic ? 'المهمة الحالية والتقدم المختصر' : 'Current task and concise progress'}</li>
              <li>{isArabic ? 'نتيجة الإجابة والإجراء التالي' : 'Answer result and next action'}</li>
            </ul>
          </article>
          <article className={styles.compareCard}>
            <h3>{isArabic ? 'لا يظهر افتراضيًا' : 'Not shown by default'}</h3>
            <ul>
              <li>{isArabic ? 'نوع الخطوة والمنطق الداخلي' : 'Step type and internal logic'}</li>
              <li>{isArabic ? 'أسماء الفروع وقواعد التقدم' : 'Branch names and progress rules'}</li>
              <li>{isArabic ? 'ملاحظات التأليف أو التفسير التقني' : 'Authoring notes or technical commentary'}</li>
            </ul>
          </article>
        </div>
      );
    }

    if (section.id === 'notices') {
      return (
        <div className={styles.noticeGrid}>
          <article className={styles.noticeCard}>
            <span className={styles.noticeTag}>{isArabic ? 'قريب من المحتوى' : 'Near the content'}</span>
            <h3>{isArabic ? 'Inline Step Notice' : 'Inline Step Notice'}</h3>
            <p>
              {isArabic
                ? 'يظهر أسفل المحتوى الحالي أو بجواره عندما يتعلق الدعم بالنقطة نفسها، مثل التوضيح أو التلميح أو دعم الارتباك.'
                : 'Appears below or beside the current content when support belongs to that exact idea, such as clarification, a hint, or confusion support.'}
            </p>
          </article>
          <article className={styles.noticeCard}>
            <span className={styles.noticeTag}>{isArabic ? 'قريب من الإجراء' : 'Near the action area'}</span>
            <h3>{isArabic ? 'Bottom Action Notice' : 'Bottom Action Notice'}</h3>
            <p>
              {isArabic
                ? 'يظهر قبل أزرار الخطوة عندما تكون الرسالة مرتبطة بالمتابعة، أو الإعادة، أو الدعم المطلوب قبل الانتقال.'
                : 'Appears before the step actions when the message is about continuation, retry, or required support before progression.'}
            </p>
          </article>
        </div>
      );
    }

    if (section.id === 'assessment') {
      const rows = isArabic
        ? [
            ['قبل الحسم', 'يرى المتعلم السؤال والخيارات فقط، ويظل الإجراء الرئيس معطلًا حتى يختار جوابًا.'],
            ['بعد الإجابة الصحيحة', 'يظهر رمز صحيح، وشرح قصير، ثم الإجراء التالي الواضح.'],
            ['بعد الإجابة الخاطئة', 'يظهر رمز خطأ على الاختيار المحدد، وتظهر الإجابة الصحيحة بوضوح، ثم شرح مختصر وإجراء تالٍ.'],
            ['عند الحاجة إلى دعم', 'يظهر الدعم بعد التغذية الراجعة، ولا يختلط معها داخل كتلة مربكة واحدة.'],
          ]
        : [
            ['Before resolution', 'The learner sees the question and choices only, and the primary action remains disabled until an answer is selected.'],
            ['After a correct answer', 'A correct icon appears, followed by a short explanation and one clear next action.'],
            ['After an incorrect answer', 'An incorrect icon marks the selected choice, the correct answer is revealed, then a brief explanation and next action appear.'],
            ['When support is needed', 'Support appears after the answer feedback and does not merge into one confusing block.'],
          ];

      return (
        <div className={styles.assessmentTable}>
          {rows.map(([label, value]) => (
            <div key={label} className={styles.tableRow}>
              <strong>{label}</strong>
              <span>{value}</span>
            </div>
          ))}
        </div>
      );
    }

    if (section.id === 'acceptance') {
      return (
        <div className={styles.finalRule}>
          <article className={styles.ruleCard}>
            <h3>{isArabic ? 'اختبار القبول السريع' : 'Rapid acceptance test'}</h3>
            <p>
              {isArabic
                ? 'اسأل: هل يساعد هذا العنصر المتعلم على الفهم أو الفعل الآن؟ إذا كانت الإجابة نعم، فبقاؤه مقبول. وإذا كان يشرح المنصة أو التأليف الداخلي، فيجب إخفاؤه.'
                : 'Ask one question: does this element help the learner understand or act right now? If yes, it may remain. If it mainly explains the platform or internal authoring logic, it must be hidden.'}
            </p>
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
      faqItems={content.faqItems}
      tipsTitle={content.tipsTitle}
      tips={content.tips}
      tipsVariant="checklist"
      renderSectionExtra={renderSectionExtra}
    />
  );
}
