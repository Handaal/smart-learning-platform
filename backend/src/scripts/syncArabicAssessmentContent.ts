import { prisma } from '../lib/prisma';

const QUIZ_UPDATES = [
  {
    id: 'Q-M1-E2-1',
    title: 'نقطة تحقق تكيفية سريعة',
    description: 'نقطة تحقق قصيرة تؤكد الفكرة الأساسية في الدرس التكيفي قبل المتابعة.',
  },
  {
    id: 'Q-PRE-STEP-01',
    title: 'الاختبار القبلي: قياس الفهم الأولي لإدارة المشروع',
    description: 'اختبار قبلي قصير يقيس مستوى الفهم المبدئي للمتعلم قبل الدخول إلى الوحدات التدريبية.',
  },
  {
    id: 'Q-POST-STEP-01',
    title: 'الاختبار البعدي: التحقق من كفاءة إدارة المشروع',
    description: 'اختبار بعدي قصير يقيس أداء المتعلم بعد استكمال الوحدات التدريبية.',
  },
];

const QUESTION_UPDATES = [
  {
    id: 'Q-M1-E2-1-Q1',
    questionText: 'أي تسلسل يطابق حلقة التعلم التكيفي؟',
    explanation:
      'هذا هو التسلسل الصحيح. ترصد المنصة حالة المتعلم، وتقرأها في سياقها، ثم تختار الاستجابة التعليمية التالية.',
    hint: 'اختر التسلسل الذي يجمع بين الرصد، وقراءة السياق، ثم تحديد الاستجابة التالية.',
  },
  {
    id: 'Q-M1-E2-1-Q2',
    questionText: 'إذا ظهر الارتباك، فما أول ما ينبغي أن يقدمه الدرس؟',
    explanation:
      'التوضيح القصير هو أفضل استجابة أولى، لأنه يقلل الغموض قبل أن يحاول المتعلم مرة أخرى.',
    hint: 'اختر الخيار الذي يوضح الفكرة أولًا قبل زيادة الضغط على المتعلم.',
  },
  {
    id: 'Q-M1-E2-1-Q3',
    questionText: 'صواب أم خطأ: يُستخدم إعادة التفعيل عندما ينخفض الانتباه ويحتاج المتعلم إلى استعادة تركيز سريعة.',
    explanation: 'هذه العبارة صحيحة. فإعادة التفعيل تساعد المتعلم على العودة إلى المهمة قبل الاستمرار.',
    hint: 'فكّر فيما ينبغي أن يفعله الدرس عندما يبتعد انتباه المتعلم عن المهمة الحالية.',
  },
  {
    id: 'Q-PRE-STEP-01-Q1',
    questionText: 'ما الإجراء الذي ينبغي أن يأتي أولًا عند بدء مشروع تصميم تعليمي؟',
    explanation: 'الخطوة الأولى هي تحديد النطاق، حتى تُبنى بقية الخطة على هدف واضح ومحدد.',
    hint: 'اختر الخطوة التي تمنح المشروع اتجاهًا واضحًا قبل البدء في الجدولة أو الإنتاج.',
  },
  {
    id: 'Q-PRE-STEP-01-Q2',
    questionText: 'صواب أم خطأ: يجب تخطيط الجدول الزمني للمشروع قبل بدء العمل.',
    explanation: 'هذه العبارة صحيحة، لأن الجدول الزمني ينظم المراحل، والأدوار، والإيقاع الواقعي للتنفيذ.',
    hint: 'فكّر فيما إذا كانت الجدولة تتم قبل بدء التنفيذ أم بعده.',
  },
  {
    id: 'Q-PRE-STEP-01-Q3',
    questionText: 'أي خيار يدعم التواصل الواضح داخل فريق المشروع بشكل أفضل؟',
    explanation: 'التحديث المشترك للحالة يحافظ على وضوح التوقعات ويقلل الالتباس بين أعضاء الفريق.',
    hint: 'اختر الخيار الذي يُبقي الجميع على اطلاع وتنسيق مستمر.',
  },
  {
    id: 'Q-PRE-STEP-01-Q4',
    questionText: 'صواب أم خطأ: يساعد تحديد المخاطر مبكرًا على تقليل تعطل المشروع لاحقًا.',
    explanation: 'هذه العبارة صحيحة، لأن التعرف المبكر إلى المخاطر يجعل معالجتها ممكنة قبل أن تتفاقم.',
    hint: 'فكّر فيما إذا كان تخطيط المخاطر إجراءً استباقيًا أم مجرد استجابة متأخرة.',
  },
  {
    id: 'Q-PRE-STEP-01-Q5',
    questionText: 'عند توفر خيارين للمهمة، ما الذي ينبغي أن يوجّه القرار النهائي في المشروع؟',
    explanation: 'ينبغي أن يتوافق القرار مع هدف المشروع وقيوده واحتياج المتعلم، لا مع التفضيل الشخصي وحده.',
    hint: 'اختر الخيار الذي يعكس اتخاذ قرار واعٍ ومقصود.',
  },
  {
    id: 'Q-POST-STEP-01-Q1',
    questionText: 'أي عبارة تصف نطاق مشروع محددًا جيدًا؟',
    explanation: 'النطاق الواضح يحدد الهدف والحدود والمخرج المتوقع حتى يبقى العمل مركزًا.',
    hint: 'اختر الإجابة التي توضح الحدود والغرض بشكل دقيق.',
  },
  {
    id: 'Q-POST-STEP-01-Q2',
    questionText: 'ما السبب الأقوى لترتيب المهام داخل خطة المشروع؟',
    explanation: 'يساعد ترتيب المهام الفريق على فهم الاعتماديات والانتقال عبر العمل بترتيب واقعي.',
    hint: 'اختر الإجابة التي توضح لماذا يهم ترتيب التنفيذ في عمل المشروع.',
  },
  {
    id: 'Q-POST-STEP-01-Q3',
    questionText:
      'صواب أم خطأ: يشمل التواصل الواضح مشاركة التحديثات والمشكلات والقرارات مع الأشخاص المناسبين في الوقت المناسب.',
    explanation:
      'هذه العبارة صحيحة، لأن جودة التواصل تعتمد على الملاءمة والتوقيت والفهم المشترك، لا على التكرار فقط.',
    hint: 'فكّر فيما يجعل تواصل المشروع فعالًا، لا مجرد كثير الحدوث.',
  },
  {
    id: 'Q-POST-STEP-01-Q4',
    questionText: 'أي استجابة تُظهر ممارسة جيدة لإدارة المخاطر؟',
    explanation: 'أفضل استجابة هي تحديد الخطر، وتقدير أثره، والاستعداد بإجراء للتخفيف قبل تفاقمه.',
    hint: 'اختر الخيار الذي يتعامل مع الخطر قبل أن يتحول إلى أزمة.',
  },
  {
    id: 'Q-POST-STEP-01-Q5',
    questionText: 'صواب أم خطأ: ينبغي أن تعتمد قرارات المشروع الجيدة على الأدلة والأهداف والقيود، لا على الاندفاع اللحظي.',
    explanation:
      'هذه العبارة صحيحة، لأن القرار القوي يربط بين الأدلة المتاحة وهدف المشروع وقيود العمل الواقعية.',
    hint: 'فكّر فيما يجعل القرار موثوقًا داخل بيئة العمل الحقيقية للمشروع.',
  },
];

const CHOICE_UPDATES = [
  { id: 'Q-M1-E2-1-Q1-A', choiceText: 'رصد الحالة -> قراءة السياق -> اختيار الاستجابة -> المتابعة' },
  { id: 'Q-M1-E2-1-Q1-B', choiceText: 'عرض الدرس نفسه -> احتساب درجة -> التوقف' },
  { id: 'Q-M1-E2-1-Q1-C', choiceText: 'رصد الانفعال -> تجاهل السياق -> فرض الدعم' },
  { id: 'Q-M1-E2-1-Q1-D', choiceText: 'اختيار مسار عشوائي -> إخفاء التغذية الراجعة' },
  { id: 'Q-M1-E2-1-Q2-A', choiceText: 'توضيح قصير' },
  { id: 'Q-M1-E2-1-Q2-B', choiceText: 'تحدٍ أصعب' },
  { id: 'Q-M1-E2-1-Q2-C', choiceText: 'عدم تقديم تغذية راجعة حتى النهاية' },
  { id: 'Q-M1-E2-1-Q2-D', choiceText: 'تجاوز الخطوة مباشرة إلى الإكمال' },
  { id: 'Q-M1-E2-1-Q3-A', choiceText: 'صحيح' },
  { id: 'Q-M1-E2-1-Q3-B', choiceText: 'خطأ' },
  { id: 'Q-PRE-STEP-01-Q1-A', choiceText: 'تحديد نطاق المشروع' },
  { id: 'Q-PRE-STEP-01-Q1-B', choiceText: 'إطلاق المقرر النهائي مباشرة' },
  { id: 'Q-PRE-STEP-01-Q1-C', choiceText: 'الانتقال مباشرة إلى التقييم' },
  { id: 'Q-PRE-STEP-01-Q1-D', choiceText: 'تصدير التحليلات أولًا' },
  { id: 'Q-PRE-STEP-01-Q2-A', choiceText: 'صحيح' },
  { id: 'Q-PRE-STEP-01-Q2-B', choiceText: 'خطأ' },
  { id: 'Q-PRE-STEP-01-Q3-A', choiceText: 'استخدام تحديثات حالة مشتركة ومنتظمة' },
  { id: 'Q-PRE-STEP-01-Q3-B', choiceText: 'إخفاء تغييرات الجدول عن الفريق' },
  { id: 'Q-PRE-STEP-01-Q3-C', choiceText: 'تجنب توثيق القرارات' },
  { id: 'Q-PRE-STEP-01-Q3-D', choiceText: 'الانتظار حتى النهاية لذكر المشكلات' },
  { id: 'Q-PRE-STEP-01-Q4-A', choiceText: 'صحيح' },
  { id: 'Q-PRE-STEP-01-Q4-B', choiceText: 'خطأ' },
  { id: 'Q-PRE-STEP-01-Q5-A', choiceText: 'الخيار الذي يحقق الهدف ويلائم القيود' },
  { id: 'Q-PRE-STEP-01-Q5-B', choiceText: 'الخيار الذي يبدو أسهل دون مراجعة' },
  { id: 'Q-PRE-STEP-01-Q5-C', choiceText: 'الخيار المختار في اللحظة الأخيرة دون معايير' },
  { id: 'Q-PRE-STEP-01-Q5-D', choiceText: 'الخيار صاحب الوصف الأطول' },
  { id: 'Q-POST-STEP-01-Q1-A', choiceText: 'يوضح الهدف والحدود والمخرج المتوقع' },
  { id: 'Q-POST-STEP-01-Q1-B', choiceText: 'يلغي الحاجة إلى التخطيط' },
  { id: 'Q-POST-STEP-01-Q1-C', choiceText: 'يُكتب فقط بعد التسليم' },
  { id: 'Q-POST-STEP-01-Q1-D', choiceText: 'يستبدل التواصل مع أصحاب المصلحة' },
  { id: 'Q-POST-STEP-01-Q2-A', choiceText: 'يوضح الاعتماديات والترتيب الواقعي للعمل' },
  { id: 'Q-POST-STEP-01-Q2-B', choiceText: 'يجعل المراجعة غير ضرورية' },
  { id: 'Q-POST-STEP-01-Q2-C', choiceText: 'يستبدل التواصل مع أصحاب المصلحة' },
  { id: 'Q-POST-STEP-01-Q2-D', choiceText: 'يضمن عدم حدوث أي تغييرات في المشروع' },
  { id: 'Q-POST-STEP-01-Q3-A', choiceText: 'صحيح' },
  { id: 'Q-POST-STEP-01-Q3-B', choiceText: 'خطأ' },
  { id: 'Q-POST-STEP-01-Q4-A', choiceText: 'توثيق الخطر والاستعداد بخطوة تخفيف' },
  { id: 'Q-POST-STEP-01-Q4-B', choiceText: 'تجاهل الخطر حتى يتسبب في فشل' },
  { id: 'Q-POST-STEP-01-Q4-C', choiceText: 'إزالة جميع المواعيد النهائية فورًا' },
  { id: 'Q-POST-STEP-01-Q4-D', choiceText: 'تغيير هدف المشروع دون مراجعة' },
  { id: 'Q-POST-STEP-01-Q5-A', choiceText: 'صحيح' },
  { id: 'Q-POST-STEP-01-Q5-B', choiceText: 'خطأ' },
];

async function main() {
  for (const quiz of QUIZ_UPDATES) {
    await prisma.quiz.updateMany({
      where: { id: quiz.id },
      data: {
        title: quiz.title,
        description: quiz.description,
      },
    });
  }

  for (const question of QUESTION_UPDATES) {
    await prisma.quizQuestion.updateMany({
      where: { id: question.id },
      data: {
        questionText: question.questionText,
        explanation: question.explanation,
        hint: question.hint,
      },
    });
  }

  for (const choice of CHOICE_UPDATES) {
    await prisma.quizChoice.updateMany({
      where: { id: choice.id },
      data: {
        choiceText: choice.choiceText,
      },
    });
  }

  console.log(`Updated ${QUIZ_UPDATES.length} quizzes, ${QUESTION_UPDATES.length} questions, and ${CHOICE_UPDATES.length} choices to Arabic.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
