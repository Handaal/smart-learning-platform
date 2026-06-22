export const ADAPTIVE_ALERTS_POLICY_VERSION = 'v2';

/**
 * Single source of truth for the emotion-confidence gate. Used for DB
 * `isBelowThreshold` persistence, the WS monitor-only gate, and the adaptive
 * decision gate so all three layers agree (previously 0.65/0.70 sprawl).
 */
export const EMOTION_CONFIDENCE_THRESHOLD = 0.6;

export const ADAPTIVE_ALERTS_THRESHOLDS = {
  emotionConfidenceThreshold: EMOTION_CONFIDENCE_THRESHOLD,
  fallbackConfidenceThreshold: EMOTION_CONFIDENCE_THRESHOLD,
  decisionWindowSec: 15,
  decisionTickSec: 5,
  lowFaceQualityThreshold: 0.55,
  defaultCooldownSec: 75,
} as const;

export type CanonicalAdaptiveScenarioKey =
  | 'confusion'
  | 'frustration'
  | 'boredom_disengagement'
  | 'high_engagement'
  | 'test_anxiety'
  | 'neutral'
  | 'no_face_low_confidence';

export type CanonicalAdaptiveUiShape =
  | 'side_panel'
  | 'mini_task_strip'
  | 'popup_card'
  | 'advanced_path'
  | 'information_window'
  | 'standard_path'
  | 'operational_safety_protocol';

export type CanonicalAdaptiveIntervention =
  | 'scaffolded_hint'
  | 'mini_worked_example'
  | 'micro_learning_review'
  | 'task_decomposition'
  | 'supportive_message'
  | 'interactive_case_switch'
  | 'quick_decision_question'
  | 'advanced_path'
  | 'neutral_reassurance'
  | 'operational_safety_protocol'
  | 'do_nothing';

export type AdaptiveTriggerSource =
  | 'emotion_based_intervention'
  | 'performance_based_intervention'
  | 'standard_feedback'
  | 'fallback_performance_only'
  | 'no_action';

export type CanonicalEmotionState = CanonicalAdaptiveScenarioKey;

export type CanonicalAdaptiveTag =
  | 'baseline'
  | CanonicalAdaptiveScenarioKey;

export type CanonicalAdaptiveAlert = {
  scenarioKey: CanonicalAdaptiveScenarioKey;
  uiShape: CanonicalAdaptiveUiShape;
  intervention: CanonicalAdaptiveIntervention;
  triggerSource: AdaptiveTriggerSource;
  triggerReason: string;
  cooldownSeconds: number;
  persistenceSeconds: number;
  confidenceThreshold: number;
  allowsDismiss: boolean;
  learnerMessage: {
    ar: string;
    en: string;
  };
  learnerTitle: {
    ar: string;
    en: string;
  };
  learnerActionLabel?: {
    ar: string;
    en: string;
  };
  privacySafe: boolean;
};

export type CanonicalScenarioDefinition = CanonicalAdaptiveAlert & {
  educationalInterpretation: {
    ar: string;
    en: string;
  };
  fallbackBehavior: {
    ar: string;
    en: string;
  };
  loggingEvent: string;
};

export const CANONICAL_ADAPTIVE_SCENARIOS: Record<
  CanonicalAdaptiveScenarioKey,
  CanonicalScenarioDefinition
> = {
  confusion: {
    scenarioKey: 'confusion',
    uiShape: 'side_panel',
    intervention: 'scaffolded_hint',
    triggerSource: 'emotion_based_intervention',
    triggerReason: 'confusion + hesitation + repeated errors',
    cooldownSeconds: 75,
    persistenceSeconds: 12,
    confidenceThreshold: ADAPTIVE_ALERTS_THRESHOLDS.emotionConfidenceThreshold,
    allowsDismiss: true,
    learnerTitle: {
      ar: 'دعم إضافي للخطوة الحالية',
      en: 'Support for the current step',
    },
    learnerMessage: {
      ar: 'يبدو أن هذه الخطوة تحتاج إلى دعم إضافي. يمكنك مراجعة المثال المصغر قبل المتابعة.',
      en: 'This step may need a little extra support. You can review the mini example before continuing.',
    },
    learnerActionLabel: {
      ar: 'عرض الدعم',
      en: 'View support',
    },
    privacySafe: true,
    educationalInterpretation: {
      ar: 'الارتباك هنا يُفسَّر كمؤشر تعليمي احتمالي على حاجة المتعلم إلى توضيح مرحلي، وليس حكمًا نفسيًا.',
      en: 'Confusion here is treated as a probabilistic educational indicator that the learner may need staged clarification, not as a psychological judgment.',
    },
    fallbackBehavior: {
      ar: 'إذا لم تكتمل الشروط السلوكية أو الزمنية، يستمر المسار الأساسي دون تنبيه تكيفي.',
      en: 'If the behavioral or temporal conditions are incomplete, the standard path continues without an adaptive alert.',
    },
    loggingEvent: 'adaptive_alert.confusion.side_panel',
  },
  frustration: {
    scenarioKey: 'frustration',
    uiShape: 'mini_task_strip',
    intervention: 'task_decomposition',
    triggerSource: 'emotion_based_intervention',
    triggerReason: 'frustration + repeated errors + extended time on task',
    cooldownSeconds: 90,
    persistenceSeconds: 15,
    confidenceThreshold: ADAPTIVE_ALERTS_THRESHOLDS.emotionConfidenceThreshold,
    allowsDismiss: true,
    learnerTitle: {
      ar: 'لنقسّم المهمة',
      en: 'Let’s break the task down',
    },
    learnerMessage: {
      ar: 'لنقسّم المهمة إلى خطوات أصغر. يمكنك إعادة المحاولة خطوة بخطوة.',
      en: 'Let’s break the task into smaller steps. You can try again step by step.',
    },
    learnerActionLabel: {
      ar: 'ابدأ بخطوات أصغر',
      en: 'Start smaller steps',
    },
    privacySafe: true,
    educationalInterpretation: {
      ar: 'الإحباط هنا يُفهم تعليميًا كفقدان مؤقت للسيطرة بعد محاولات غير ناجحة متكررة.',
      en: 'Frustration here is interpreted educationally as a temporary loss of perceived control after repeated unsuccessful attempts.',
    },
    fallbackBehavior: {
      ar: 'إذا لم يظهر عبء سلوكي كافٍ، لا تُعرض المهمة المصغرة ويستمر المسار القياسي.',
      en: 'If there is not enough behavioral load evidence, the mini task strip does not appear and the standard path continues.',
    },
    loggingEvent: 'adaptive_alert.frustration.mini_task_strip',
  },
  boredom_disengagement: {
    scenarioKey: 'boredom_disengagement',
    uiShape: 'popup_card',
    intervention: 'interactive_case_switch',
    triggerSource: 'emotion_based_intervention',
    triggerReason: 'boredom/disengagement + inactivity during theoretical content',
    cooldownSeconds: 75,
    persistenceSeconds: 15,
    confidenceThreshold: ADAPTIVE_ALERTS_THRESHOLDS.emotionConfidenceThreshold,
    allowsDismiss: true,
    learnerTitle: {
      ar: 'تنشيط التفاعل',
      en: 'Re-activate engagement',
    },
    learnerMessage: {
      ar: 'لنحوّل هذه النقطة إلى حالة تطبيقية سريعة. أجب عن هذا القرار السريع للمتابعة.',
      en: 'Let’s turn this point into a quick applied case. Answer this quick decision prompt to continue.',
    },
    learnerActionLabel: {
      ar: 'ابدأ الحالة السريعة',
      en: 'Start the quick case',
    },
    privacySafe: true,
    educationalInterpretation: {
      ar: 'الملل أو ضعف الانخراط يُفسَّر هنا كإشارة إلى أن طريقة العرض الحالية لم تعد كافية للحفاظ على القيمة التعليمية المدركة.',
      en: 'Boredom or disengagement here is interpreted as a sign that the current presentation mode is no longer sustaining perceived learning value.',
    },
    fallbackBehavior: {
      ar: 'إذا كان المحتوى تفاعليًا أصلًا أو لم تظهر مؤشرات خمول كافية، لا تُعرض البطاقة المنبثقة.',
      en: 'If the content is already interactive or inactivity indicators are not strong enough, the popup card is not shown.',
    },
    loggingEvent: 'adaptive_alert.boredom.popup_card',
  },
  high_engagement: {
    scenarioKey: 'high_engagement',
    uiShape: 'advanced_path',
    intervention: 'advanced_path',
    triggerSource: 'performance_based_intervention',
    triggerReason: 'high engagement + mastery readiness',
    cooldownSeconds: 75,
    persistenceSeconds: 10,
    confidenceThreshold: ADAPTIVE_ALERTS_THRESHOLDS.emotionConfidenceThreshold,
    allowsDismiss: true,
    learnerTitle: {
      ar: 'تم فتح مسار متقدم',
      en: 'An advanced path is now open',
    },
    learnerMessage: {
      ar: 'أداؤك مستقر، يمكنك تجربة تحدٍ أعلى. تم فتح مهمة أكثر تقدمًا.',
      en: 'Your performance is stable. You can try a higher challenge. A more advanced task is now open.',
    },
    learnerActionLabel: {
      ar: 'عرض التحدي',
      en: 'View challenge',
    },
    privacySafe: true,
    educationalInterpretation: {
      ar: 'الانخراط المرتفع مع أداء قوي يجب أن يقود إلى تعميق التعلم، لا إلى مقاطعة المتعلم بتنبيه مزعج.',
      en: 'High engagement with strong performance should deepen learning, not interrupt the learner with a noisy alert.',
    },
    fallbackBehavior: {
      ar: 'إذا لم تتحقق الجاهزية الأدائية أو الدقة المرتفعة، يبقى المسار الأساسي هو النشط.',
      en: 'If strong performance readiness is not present, the standard path remains active.',
    },
    loggingEvent: 'adaptive_alert.high_engagement.advanced_path',
  },
  test_anxiety: {
    scenarioKey: 'test_anxiety',
    uiShape: 'information_window',
    intervention: 'neutral_reassurance',
    triggerSource: 'emotion_based_intervention',
    triggerReason: 'assessment anxiety + hesitation/freeze',
    cooldownSeconds: 60,
    persistenceSeconds: 10,
    confidenceThreshold: ADAPTIVE_ALERTS_THRESHOLDS.emotionConfidenceThreshold,
    allowsDismiss: true,
    learnerTitle: {
      ar: 'توضيح إجرائي',
      en: 'Procedural guidance',
    },
    learnerMessage: {
      ar: 'راجع التعليمات بهدوء. لن يؤثر ظهور هذه الرسالة على درجتك.',
      en: 'Review the instructions calmly. This message does not affect your score.',
    },
    learnerActionLabel: {
      ar: 'فهمت',
      en: 'Understood',
    },
    privacySafe: true,
    educationalInterpretation: {
      ar: 'قلق التقييم هنا يُفسَّر كتحول للانتباه بعيدًا عن المطلوب الإجرائي، لذا يقتصر التدخل على الطمأنة وتوضيح الخطوة فقط.',
      en: 'Assessment anxiety here is interpreted as attention shifting away from the procedural task, so the intervention is limited to reassurance and clarifying the next step.',
    },
    fallbackBehavior: {
      ar: 'إذا لم يكن السياق تقييميًا أو لم تظهر مؤشرات تردد كافية، لا تظهر نافذة المعلومات.',
      en: 'If the context is not assessment-related or hesitation indicators are not strong enough, the information window is not shown.',
    },
    loggingEvent: 'adaptive_alert.test_anxiety.information_window',
  },
  neutral: {
    scenarioKey: 'neutral',
    uiShape: 'standard_path',
    intervention: 'do_nothing',
    triggerSource: 'no_action',
    triggerReason: 'neutral stable state with acceptable performance',
    cooldownSeconds: 60,
    persistenceSeconds: 10,
    confidenceThreshold: ADAPTIVE_ALERTS_THRESHOLDS.emotionConfidenceThreshold,
    allowsDismiss: false,
    learnerTitle: {
      ar: 'المسار الأساسي',
      en: 'Standard path',
    },
    learnerMessage: {
      ar: 'يستمر المسار التدريبي بشكل طبيعي دون أي تنبيه إضافي.',
      en: 'The learning path continues normally without extra alerts.',
    },
    privacySafe: true,
    educationalInterpretation: {
      ar: 'الحياد مع أداء مقبول حالة مستقرة لا تستدعي تنبيهًا تكيفيًا.',
      en: 'Neutral with acceptable performance is a stable state that usually does not require an adaptive alert.',
    },
    fallbackBehavior: {
      ar: 'هذه الحالة تكبت التنبيهات غير الضرورية وتسمح باستمرار المسار القياسي.',
      en: 'This state suppresses unnecessary alerts and keeps the standard path active.',
    },
    loggingEvent: 'adaptive_alert.neutral.standard_path',
  },
  no_face_low_confidence: {
    scenarioKey: 'no_face_low_confidence',
    uiShape: 'operational_safety_protocol',
    intervention: 'operational_safety_protocol',
    triggerSource: 'fallback_performance_only',
    triggerReason: 'camera denied / no face / low confidence / weak face quality',
    cooldownSeconds: 90,
    persistenceSeconds: 10,
    confidenceThreshold: ADAPTIVE_ALERTS_THRESHOLDS.fallbackConfidenceThreshold,
    allowsDismiss: true,
    learnerTitle: {
      ar: 'استمرار آمن للجلسة',
      en: 'Safe session continuity',
    },
    learnerMessage: {
      ar: 'الكاميرا غير متاحة، ستستمر المنصة بالاعتماد على الأداء فقط. سيستمر المسار التدريبي دون تعطيل.',
      en: 'Camera data is not available, so the platform will continue with performance-only logic. The lesson will continue without interruption.',
    },
    learnerActionLabel: {
      ar: 'متابعة',
      en: 'Continue',
    },
    privacySafe: true,
    educationalInterpretation: {
      ar: 'هذه الحالة لا تعني استنتاجًا انفعاليًا، بل تعني فقط أن جودة البيانات البصرية غير كافية لاتخاذ قرار تكيفي موثوق.',
      en: 'This state does not imply an emotional interpretation. It simply means the visual data quality is insufficient for a trustworthy adaptive decision.',
    },
    fallbackBehavior: {
      ar: 'يتوقف الاعتماد على التعبيرات الوجهية مؤقتًا ويُفعّل منطق الأداء فقط دون إزعاج المتعلم.',
      en: 'Facial-expression-based adaptation pauses temporarily and the system falls back to performance-only logic without bothering the learner.',
    },
    loggingEvent: 'adaptive_alert.no_face_low_confidence.operational_safety_protocol',
  },
};

export const CANONICAL_ADAPTIVE_TAGS: CanonicalAdaptiveTag[] = [
  'baseline',
  'confusion',
  'frustration',
  'boredom_disengagement',
  'high_engagement',
  'test_anxiety',
  'neutral',
  'no_face_low_confidence',
];

export function isExperimentalCohort(cohort?: string | null) {
  return cohort === 'experimental';
}

export function normalizeAdaptiveScenarioKey(
  value: string | null | undefined,
): CanonicalAdaptiveScenarioKey {
  const token = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  switch (token) {
    case 'confusion':
    case 'confusion_state':
    case 'confusion_hint':
    case 'confusion_side_panel':
    case 'adaptive_alert.confusion.side_panel':
      return 'confusion';
    case 'frustration':
    case 'frustration_state':
    case 'task_segmentation':
    case 'adaptive_alert.frustration.mini_task_strip':
      return 'frustration';
    case 'boredom_disengagement':
    case 'boredom/disengagement':
    case 'boredom':
    case 'disengagement':
    case 'interactive_switch':
    case 'adaptive_alert.boredom.popup_card':
      return 'boredom_disengagement';
    case 'high_engagement':
    case 'focusedengagement':
    case 'focused_engagement':
    case 'flow':
    case 'challenge_upgrade':
    case 'adaptive_alert.high_engagement.advanced_path':
      return 'high_engagement';
    case 'test_anxiety':
    case 'anxiety':
    case 'neutral_reassurance':
    case 'adaptive_alert.test_anxiety.information_window':
      return 'test_anxiety';
    case 'neutral':
    case 'neutral_stable':
    case 'control_standard_flow':
    case 'low_confidence_monitor_only':
    case 'neutral_monitor_only':
    case 'cooldown_skip':
    case 'adaptive_alert.neutral.standard_path':
      return 'neutral';
    case 'no_face_low_confidence':
    case 'no_face':
    case 'low_confidence':
    case 'camera_denied':
    case 'face_lost':
    case 'facelost':
    case 'distraction':
    case 'unknown':
    case 'adaptive_alert.no_face_low_confidence.operational_safety_protocol':
      return 'no_face_low_confidence';
    default:
      return 'no_face_low_confidence';
  }
}

export function normalizeAdaptiveTag(value: string | null | undefined): CanonicalAdaptiveTag {
  switch (String(value ?? '').trim()) {
    case 'baseline':
      return 'baseline';
    case 'confusion':
    case 'Confusion':
    case 'frustration':
    case 'Frustration':
    case 'boredom_disengagement':
    case 'Boredom':
    case 'high_engagement':
    case 'Flow':
    case 'FocusedEngagement':
    case 'test_anxiety':
    case 'Anxiety':
    case 'neutral':
    case 'Neutral':
    case 'no_face_low_confidence':
    case 'FaceLost':
    case 'Unknown':
    case 'distraction':
    case 'Distraction':
      return normalizeAdaptiveScenarioKey(String(value));
    default:
      return 'baseline';
  }
}

export function scenarioUsesAlertSurface(scenarioKey: CanonicalAdaptiveScenarioKey) {
  return scenarioKey !== 'neutral';
}

export function getScenarioDefinition(
  scenarioKey: CanonicalAdaptiveScenarioKey | string | null | undefined,
) {
  return CANONICAL_ADAPTIVE_SCENARIOS[normalizeAdaptiveScenarioKey(scenarioKey)];
}

export function getScenarioMessage(
  scenarioKey: CanonicalAdaptiveScenarioKey | string | null | undefined,
  locale: 'ar' | 'en',
) {
  return getScenarioDefinition(scenarioKey).learnerMessage[locale];
}

export function getScenarioTitle(
  scenarioKey: CanonicalAdaptiveScenarioKey | string | null | undefined,
  locale: 'ar' | 'en',
) {
  return getScenarioDefinition(scenarioKey).learnerTitle[locale];
}
