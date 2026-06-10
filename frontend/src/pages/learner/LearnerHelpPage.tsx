import { useMemo } from 'react';
import HelpCenterLayout, { type HelpFaqItem, type HelpSection } from '@/components/help/HelpCenterLayout';
import { useI18n } from '@/i18n';
import { useAuthStore } from '@/store/authStore';

type LocalizedHelpContent = {
  eyebrow: string;
  title: string;
  lead: string;
  introPoints: string[];
  sections: HelpSection[];
  faqTitle: string;
  faqItems: HelpFaqItem[];
  tipsTitle: string;
  tips: string[];
};

export default function LearnerHelpPage() {
  const { tm, t, language } = useI18n();
  const cohort = useAuthStore((state) => state.cohort);

  const controlHelp = useMemo<LocalizedHelpContent>(() => {
    if (language === 'ar') {
      return {
        eyebrow: 'مساعدة المتعلم',
        title: 'دليل المجموعة الضابطة',
        lead:
          'استخدم هذا الدليل كمرجع سريع للمسار القياسي داخل المنصة. ستجد هنا ما تحتاجه للدخول، ومتابعة الوحدات، وإكمال الأنشطة والاختبارات، ومراجعة تقدمك.',
        introPoints: [
          'هذه النسخة مخصصة للمجموعة الضابطة وتعمل كبيئة تعلم ذاتي منظمة وواضحة.',
          'يعتمد تقدمك هنا على المحتوى، والأنشطة، والاختبارات، وإتمام الخطوات المطلوبة داخل الدرس.',
        ],
        sections: [
          {
            id: 'control-start',
            title: 'كيف تبدأ داخل المنصة؟',
            summary: 'ابدأ من تسجيل الدخول، ثم اتبع مسار التعلم خطوة بخطوة حتى يفتح لك الجزء التالي بشكل طبيعي.',
            steps: [
              'سجل الدخول باستخدام معرف المشارك وكلمة المرور.',
              'أكمل شاشة الموافقة والملف الشخصي إذا ظهرت لك عند أول دخول.',
              'ابدأ الاختبار القبلي عندما يظهر لك قبل فتح الوحدات التدريبية.',
              'بعد ذلك انتقل إلى الوحدات المفتوحة واتبع ترتيب الدروس كما يظهر لك في المنصة.',
            ],
          },
          {
            id: 'control-modules',
            title: 'الوحدات والدروس',
            summary: 'تُعرض الوحدات والدروس بتسلسل واضح يساعدك على معرفة ما هو متاح الآن وما الذي سيفتح لاحقًا.',
            points: [
              'ابدأ بالوحدة المفتوحة حاليًا واتبع ترتيب الدروس داخلها.',
              'يظهر الدرس الحالي والخطوة النشطة بوضوح داخل صفحة الدرس.',
              'يمكنك العودة إلى صفحة الوحدات أو لوحة المتعلم لمراجعة ما أنجزته في أي وقت.',
            ],
          },
          {
            id: 'control-navigation',
            title: 'التنقل داخل الدرس',
            summary: 'كل خطوة داخل الدرس تتبع إيقاعًا بسيطًا: محتوى أولًا، ثم إجراء واضح، ثم انتقال إلى الجزء التالي.',
            steps: [
              'اقرأ أو شاهد المحتوى الحالي أولًا.',
              'إذا كانت الخطوة نشاطًا أو سؤالًا، فأكملها قبل المتابعة.',
              'استخدم زر المتابعة أو الإجراء التالي عندما يصبح متاحًا.',
              'إذا لم يُفتح الانتقال، فستظهر لك رسالة قصيرة توضح المطلوب قبل المتابعة.',
            ],
          },
          {
            id: 'control-activities',
            title: 'الأنشطة والاختبارات',
            summary: 'تتضمن البيئة أنشطة قصيرة داخل الدرس، ونقاط تحقق سريعة، واختبارين رئيسيين: قبلي وبعدي.',
            cards: [
              {
                title: 'أنشطة قصيرة',
                description: 'مهام صغيرة داخل الدرس تساعدك على تطبيق الفكرة الحالية قبل الانتقال.',
              },
              {
                title: 'نقاط تحقق',
                description: 'أسئلة قصيرة داخل الدرس للتأكد من الفهم قبل فتح الخطوة التالية.',
              },
              {
                title: 'الاختبار القبلي',
                description: 'يظهر قبل الوحدات التدريبية لقياس مستوى البداية لديك.',
              },
              {
                title: 'الاختبار البعدي',
                description: 'يظهر بعد آخر وحدة لقياس التقدم بعد إكمال البرنامج.',
              },
            ],
          },
          {
            id: 'control-progress',
            title: 'متابعة التقدم',
            summary: 'تساعدك لوحة المتعلم وصفحة الوحدات على معرفة موقعك الحالي وما الذي تم إنجازه بالفعل.',
            points: [
              'تعرض لوحة المتعلم ما أنجزته وما يمكنك متابعته بعد ذلك.',
              'توضح صفحة الوحدات هل الوحدة متاحة الآن أم تحتاج إنهاء ما قبلها.',
              'بعد الاختبار البعدي ستنتقل إلى شاشة الإكمال النهائي.',
            ],
          },
          {
            id: 'control-support',
            title: 'المساعدة والدعم',
            summary: 'إذا واجهت صعوبة في الاستخدام، استخدم دليل المساعدة أو ارجع إلى الخطوة السابقة داخل الدرس.',
            points: [
              'راجع التعليمات القصيرة الظاهرة أسفل النشاط أو السؤال قبل إعادة المحاولة.',
              'إذا انقطعت جلستك، ارجع إلى لوحة المتعلم واستخدم المتابعة من حيث توقفت.',
              'تواصل مع مسؤول الدراسة إذا واجهت مشكلة في الدخول أو في الوصول إلى أحد أجزاء المنصة.',
            ],
          },
        ],
        faqTitle: 'الأسئلة الشائعة للمجموعة الضابطة',
        faqItems: [
          {
            question: 'ماذا أفعل إذا ظلت الوحدة التالية مغلقة؟',
            answer: 'أكمل الخطوات المطلوبة أو الاختبار الحالي أولًا، ثم ارجع إلى صفحة الوحدات لتحديث الحالة.',
          },
          {
            question: 'هل أحتاج إلى تأكيد كل خطوة يدويًا؟',
            answer: 'ليس دائمًا. الأنشطة والأسئلة هي التي تحتاج عادةً إلى إجراء مباشر. أما خطوات القراءة أو المشاهدة فتتقدم بشكل طبيعي بعد مراجعتها.',
          },
          {
            question: 'أين أجد الاختبار القبلي أو البعدي؟',
            answer: 'يظهر الاختبار القبلي قبل فتح الوحدات، ويظهر الاختبار البعدي بعد إنهاء آخر وحدة في المسار.',
          },
        ],
        tipsTitle: 'نصائح سريعة',
        tips: [
          'ركز على خطوة واحدة في كل مرة.',
          'اتبع ترتيب الدرس كما يظهر لك ولا تتجاوز الخطوات غير المكتملة.',
          'اقرأ التغذية الراجعة باختصار ثم انتقل مباشرة إلى الإجراء التالي.',
          'استخدم لوحة المتعلم لمراجعة ما أنجزته وما هو متاح لك الآن.',
        ],
      };
    }

    return {
      eyebrow: 'Learner Help',
      title: 'Control Group Guide',
      lead:
        'Use this page as a quick reference for the standard self-paced learning pathway. It explains how to sign in, move through modules, complete activities and tests, and track progress clearly.',
      introPoints: [
        'This version is designed for the control group and follows a structured self-paced learning model.',
        'Your progress depends on lesson completion, activities, checkpoints, and required assessments inside the platform.',
      ],
      sections: [
        {
          id: 'control-start',
          title: 'Getting started',
          summary: 'Begin with sign-in, then move through the learning flow step by step until the next part opens naturally.',
          steps: [
            'Sign in using your participant ID and password.',
            'Complete the consent and profile screens if they appear on first entry.',
            'Start the pre-test when it appears before the training modules.',
            'After that, enter the open modules and follow the lesson order shown in the platform.',
          ],
        },
        {
          id: 'control-modules',
          title: 'Modules and lessons',
          summary: 'Modules and lessons appear in a clear sequence so you always know what is open now and what will unlock later.',
          points: [
            'Start with the module that is currently open and follow the lesson order inside it.',
            'The active lesson and current step are shown clearly inside the lesson page.',
            'You can return to the modules page or learner dashboard whenever you need to review progress.',
          ],
        },
        {
          id: 'control-navigation',
          title: 'Lesson navigation',
          summary: 'Each lesson step follows a simple rhythm: content first, one clear action, then progression to the next part.',
          steps: [
            'Read or watch the current content first.',
            'If the step is an activity or question, complete it before continuing.',
            'Use the continue or next action when it becomes available.',
            'If progression is blocked, the page will explain what is still required.',
          ],
        },
        {
          id: 'control-activities',
          title: 'Activities and assessments',
          summary: 'The environment includes short in-lesson activities, quick checkpoints, and two main assessments: pre-test and post-test.',
          cards: [
            { title: 'Short activities', description: 'Small in-lesson tasks that help you apply the current idea before moving on.' },
            { title: 'Checkpoint questions', description: 'Short lesson questions that confirm understanding before the next step opens.' },
            { title: 'Pre-test', description: 'Appears before the modules to measure your starting level.' },
            { title: 'Post-test', description: 'Appears after the final unit to measure progress at the end of the programme.' },
          ],
        },
        {
          id: 'control-progress',
          title: 'Tracking progress',
          summary: 'Use the dashboard and modules page to understand where you are and what has already been completed.',
          points: [
            'The learner dashboard shows what you finished and what you can continue next.',
            'The modules page shows whether a module is open now or still depends on earlier completion.',
            'After the post-test, you will move to the final completion screen.',
          ],
        },
        {
          id: 'control-support',
          title: 'Help and support',
          summary: 'If you need help using the platform, use this guide or return to the previous lesson step.',
          points: [
            'Read the short guidance shown below the current task before trying again.',
            'If your session is interrupted, return to the learner dashboard and continue from where you stopped.',
            'Contact the study administrator if you have trouble signing in or accessing the course.',
          ],
        },
      ],
      faqTitle: 'Control Group FAQ',
      faqItems: [
        {
          question: 'What should I do if the next module is still locked?',
          answer: 'Finish the current required steps or assessment first, then return to the modules page to refresh the status.',
        },
        {
          question: 'Do I need to confirm every step manually?',
          answer: 'Not always. Activities and questions usually need direct action, while reading and viewing steps continue naturally after review.',
        },
        {
          question: 'Where do I find the pre-test and post-test?',
          answer: 'The pre-test appears before the modules open, and the post-test appears after the final unit is completed.',
        },
      ],
      tipsTitle: 'Quick tips',
      tips: [
        'Focus on one step at a time.',
        'Follow the lesson order as shown and do not skip unfinished steps.',
        'Read feedback briefly, then move directly to the next action.',
        'Use the learner dashboard to review what is complete and what is available now.',
      ],
    };
  }, [language]);

  const helpContent: LocalizedHelpContent =
    cohort === 'control'
      ? controlHelp
      : {
          eyebrow: t('help.learner.eyebrow'),
          title: t('help.learner.title'),
          lead: t('help.learner.lead'),
          introPoints: tm<string[]>('help.learner.introPoints', []),
          sections: tm<HelpSection[]>('help.learner.sections', []),
          faqTitle: t('help.learner.faqTitle'),
          faqItems: tm<HelpFaqItem[]>('help.learner.faqItems', []),
          tipsTitle: t('help.learner.tipsTitle'),
          tips: tm<string[]>('help.learner.tips', []),
        };

  return (
    <HelpCenterLayout
      eyebrow={helpContent.eyebrow}
      title={helpContent.title}
      lead={helpContent.lead}
      introPoints={helpContent.introPoints}
      sections={helpContent.sections}
      faqTitle={helpContent.faqTitle}
      faqItems={helpContent.faqItems}
      tipsTitle={helpContent.tipsTitle}
      tips={helpContent.tips}
    />
  );
}
