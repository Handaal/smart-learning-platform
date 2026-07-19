import type { LessonQuiz } from '@/components/admin/LessonQuizBuilder';

export type PublishStatus = 'draft' | 'published';

export type ContentBlockType = 'TEXT' | 'VISUAL' | 'VIDEO' | 'ASSESSMENT';

/** The six authorable emotion channels + the baseline (non-adaptive) path. */
export type AuthorableAdaptiveTag =
  | 'baseline'
  | 'confusion'
  | 'frustration'
  | 'boredom_disengagement'
  | 'high_engagement'
  | 'test_anxiety'
  | 'neutral';

export type LearningContentRecord = {
  id: string;
  contentType: ContentBlockType;
  adaptiveTag?: string | null;
  scaffoldLevel: number;
  isEnrichment: boolean;
  sequenceOrder: number;
  status: PublishStatus;
  contentData: Record<string, unknown>;
};

export type LessonRecord = {
  id: string;
  title: string;
  description: string | null;
  objectives: string[];
  sequenceOrder: number;
  expectedDurationMin?: number | null;
  generalObjective?: string | null;
  teacherGuidance?: string | null;
  emotionalTriggerExpected?: string | null;
  lessonType: string;
  status: PublishStatus;
  baseScaffold: number;
};

export type ModuleRecord = {
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

export type LessonDetail = LessonRecord & {
  moduleId?: string;
  learningContents: LearningContentRecord[];
  quizzes: LessonQuiz[];
};

/** Emotion channels shown as sections in the emotion-mapping tab (baseline excluded). */
export const EMOTION_CHANNELS: Exclude<AuthorableAdaptiveTag, 'baseline'>[] = [
  'confusion',
  'frustration',
  'boredom_disengagement',
  'high_engagement',
  'test_anxiety',
  'neutral',
];

/** Admin-facing label for each emotion-tracker result (used as the section heading). */
export const EMOTION_LABELS: Record<Exclude<AuthorableAdaptiveTag, 'baseline'>, string> = {
  confusion: 'الارتباك',
  frustration: 'الإحباط',
  boredom_disengagement: 'الملل / انخفاض الانخراط',
  high_engagement: 'الانخراط العالي',
  test_anxiety: 'قلق الاختبار',
  neutral: 'الحياد',
};

export const CONTENT_TYPE_OPTIONS: Array<{ value: ContentBlockType; label: string }> = [
  { value: 'TEXT', label: 'نص / شرح' },
  { value: 'VISUAL', label: 'صورة / ملف / مخطط' },
  { value: 'VIDEO', label: 'فيديو' },
  { value: 'ASSESSMENT', label: 'نشاط / سؤال قصير' },
];

export type AdaptivePlacementMode = 'baseline' | 'before' | 'after' | 'instead';

export const PLACEMENT_OPTIONS: Array<{ value: Exclude<AdaptivePlacementMode, 'baseline'>; label: string }> = [
  { value: 'before', label: 'قبل العنصر الأساسي' },
  { value: 'after', label: 'بعد العنصر الأساسي' },
  { value: 'instead', label: 'بدلاً من العنصر الأساسي' },
];
