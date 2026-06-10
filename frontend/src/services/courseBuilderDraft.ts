import {
  COURSE_BUILDER_DRAFT_KEY,
  DEFAULT_COURSE_SHELL,
  type CourseShellDraft,
} from '@/features/courseBuilder/researchCourseBuilder';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadCourseBuilderDraft(): CourseShellDraft {
  if (!canUseStorage()) return DEFAULT_COURSE_SHELL;

  try {
    const raw = window.localStorage.getItem(COURSE_BUILDER_DRAFT_KEY);
    if (!raw) return DEFAULT_COURSE_SHELL;

    const parsed = JSON.parse(raw) as Partial<CourseShellDraft>;
    return {
      ...DEFAULT_COURSE_SHELL,
      ...parsed,
      adaptiveLessonTypes: Array.isArray(parsed.adaptiveLessonTypes) && parsed.adaptiveLessonTypes.length
        ? parsed.adaptiveLessonTypes
        : DEFAULT_COURSE_SHELL.adaptiveLessonTypes,
    };
  } catch {
    return DEFAULT_COURSE_SHELL;
  }
}

export function saveCourseBuilderDraft(draft: CourseShellDraft) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(COURSE_BUILDER_DRAFT_KEY, JSON.stringify(draft));
}
