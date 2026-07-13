import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Reorder } from 'framer-motion';
import {
  ArrowRight,
  ClipboardCheck,
  Copy,
  GripVertical,
  PencilLine,
  Plus,
  Trash2,
} from 'lucide-react';
import { quizApi, scenarioApi } from '@/services/api';
import { useI18n } from '@/i18n';
import LessonEditorModal from '@/components/admin/LessonEditorModal';
import {
  generateLessonId,
  getLessonTypeLabel,
  fromStoredLessonType,
  RESEARCH_COURSE_KEY,
} from '@/features/courseBuilder/researchCourseBuilder';
import type { LessonQuiz } from '@/components/admin/LessonQuizBuilder';
import type { LessonRecord, ModuleRecord } from '@/features/courseBuilder/types';
import styles from './UnitLessonsPage.module.css';

function StatusChip({ status }: { status: 'draft' | 'published' }) {
  return (
    <span className={`${styles.statusChip} ${status === 'published' ? styles.statusPublished : styles.statusDraft}`}>
      {status === 'published' ? 'منشور' : 'مسودة'}
    </span>
  );
}

function hasOrderChanged<T extends { id: string }>(current: T[], next: T[]) {
  if (current.length !== next.length) return true;
  return current.some((item, index) => item.id !== next[index]?.id);
}

export default function UnitLessonsPage() {
  const { unitId = '' } = useParams();
  const navigate = useNavigate();
  const { direction } = useI18n();
  const queryClient = useQueryClient();
  const [editorLessonId, setEditorLessonId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const modulesQuery = useQuery({
    queryKey: ['builder-modules'],
    queryFn: async () => {
      const response = (await scenarioApi.listModules()) as { data: ModuleRecord[] };
      return response.data ?? [];
    },
  });

  const pretestQuery = useQuery({
    queryKey: ['builder-pretest', RESEARCH_COURSE_KEY],
    queryFn: async () => {
      const response = (await quizApi.listQuizzes({ scope: 'pretest', courseKey: RESEARCH_COURSE_KEY })) as { data: LessonQuiz[] };
      return response.data ?? [];
    },
  });

  const posttestQuery = useQuery({
    queryKey: ['builder-posttest', RESEARCH_COURSE_KEY],
    queryFn: async () => {
      const response = (await quizApi.listQuizzes({ scope: 'posttest', courseKey: RESEARCH_COURSE_KEY })) as { data: LessonQuiz[] };
      return response.data ?? [];
    },
  });

  const unit = useMemo(
    () => (modulesQuery.data ?? []).find((module) => module.id === unitId) ?? null,
    [modulesQuery.data, unitId],
  );
  const lessons = useMemo(
    () => [...(unit?.episodes ?? [])].sort((a, b) => a.sequenceOrder - b.sequenceOrder),
    [unit],
  );
  const pretests = pretestQuery.data ?? [];
  const posttests = posttestQuery.data ?? [];

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['builder-modules'] });
  }

  async function handleAddLesson() {
    if (!unit || busy) return;
    setBusy(true);
    try {
      const nextOrder = (lessons[lessons.length - 1]?.sequenceOrder ?? 0) + 1;
      await scenarioApi.createEpisode({
        id: generateLessonId(unit.id, nextOrder),
        moduleId: unit.id,
        title: `درس جديد ${nextOrder}`,
        description: null,
        objectives: [],
        sequenceOrder: nextOrder,
        baseScaffold: 3,
        lessonType: 'guided',
        status: 'draft',
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteLesson(lessonId: string) {
    if (!window.confirm('سيتم حذف هذا الدرس وكل محتوياته. هل تريد المتابعة؟')) return;
    await scenarioApi.deleteEpisode(lessonId);
    await refresh();
  }

  async function handleDuplicateLesson(lesson: LessonRecord) {
    if (!unit || busy) return;
    setBusy(true);
    try {
      const detail = (await scenarioApi.getEpisode(lesson.id)) as {
        data: LessonRecord & { learningContents: Array<Record<string, any>> };
      };
      const nextOrder = (lessons[lessons.length - 1]?.sequenceOrder ?? 0) + 1;
      const newId = generateLessonId(unit.id, nextOrder);
      await scenarioApi.createEpisode({
        id: newId,
        moduleId: unit.id,
        title: `${lesson.title} (نسخة)`,
        description: lesson.description,
        objectives: lesson.objectives,
        sequenceOrder: nextOrder,
        baseScaffold: lesson.baseScaffold,
        expectedDurationMin: lesson.expectedDurationMin ?? null,
        generalObjective: detail.data.generalObjective ?? null,
        teacherGuidance: detail.data.teacherGuidance ?? null,
        emotionalTriggerExpected: lesson.emotionalTriggerExpected ?? null,
        lessonType: lesson.lessonType,
        status: 'draft',
      });
      for (const block of [...(detail.data.learningContents ?? [])].sort((a, b) => a.sequenceOrder - b.sequenceOrder)) {
        await scenarioApi.uploadContent({
          episodeId: newId,
          contentType: block.contentType,
          adaptiveTag: block.adaptiveTag ?? 'baseline',
          scaffoldLevel: block.scaffoldLevel,
          isEnrichment: block.isEnrichment,
          contentData: block.contentData,
          status: 'draft',
        });
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleReorderLessons(next: LessonRecord[]) {
    if (!hasOrderChanged(lessons, next)) return;
    await scenarioApi.reorder(next.map((lesson, index) => ({ type: 'episode', id: lesson.id, sequenceOrder: index + 1 })));
    await refresh();
  }

  if (modulesQuery.isLoading) {
    return <div className={styles.page} dir={direction}><div className={styles.empty}>جاري تحميل الوحدة...</div></div>;
  }

  if (!unit) {
    return (
      <div className={styles.page} dir={direction}>
        <div className={styles.empty}>
          لم يتم العثور على هذه الوحدة.
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/research-admin/course')}>
            العودة للوحدات
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page} dir={direction}>
      <header className={styles.hero}>
        <button type="button" className={styles.backButton} onClick={() => navigate('/research-admin/course')}>
          <ArrowRight size={18} />
        </button>
        <div className={styles.heroCopy}>
          <h1>{unit.title}</h1>
          <p>قائمة الدروس والمحتوى التعليمي</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => void handleAddLesson()} disabled={busy}>
          <Plus size={16} /> إضافة درس جديد
        </button>
      </header>

      {pretests.length ? (
        <section className={styles.pinnedGroup}>
          {pretests.map((quiz) => (
            <article key={quiz.id} className={`${styles.row} ${styles.pinnedRow}`}>
              <span className={styles.pinnedBadge}>قبلي</span>
              <div className={styles.rowCopy}>
                <strong>{quiz.title}</strong>
                <span className={styles.rowSub}><ClipboardCheck size={13} /> اختبار قبلي · {quiz.questions?.length ?? 0} سؤال</span>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {lessons.length ? (
        <Reorder.Group axis="y" values={lessons} onReorder={(items) => void handleReorderLessons(items)} className={styles.lessonList}>
          {lessons.map((lesson) => (
            <Reorder.Item key={lesson.id} value={lesson} className={styles.reorderItem}>
              <article className={styles.row}>
                <GripVertical size={16} className={styles.dragHandle} />
                <div className={styles.rowCopy}>
                  <div className={styles.rowTop}>
                    <strong>{lesson.title}</strong>
                    <StatusChip status={lesson.status} />
                  </div>
                  <span className={styles.rowSub}>
                    {getLessonTypeLabel(fromStoredLessonType(lesson.lessonType))} · {lesson.expectedDurationMin ?? 0} دقيقة
                  </span>
                </div>
                <div className={styles.rowActions}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditorLessonId(lesson.id)}>
                    <PencilLine size={14} /> تعديل
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => void handleDuplicateLesson(lesson)} disabled={busy} aria-label="تكرار">
                    <Copy size={14} />
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => void handleDeleteLesson(lesson.id)} aria-label="حذف">
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      ) : (
        <div className={styles.empty}>لا توجد دروس في هذه الوحدة بعد. اضغط "إضافة درس جديد" للبدء.</div>
      )}

      {posttests.length ? (
        <section className={styles.pinnedGroup}>
          {posttests.map((quiz) => (
            <article key={quiz.id} className={`${styles.row} ${styles.pinnedRow}`}>
              <span className={styles.pinnedBadge}>بعدي</span>
              <div className={styles.rowCopy}>
                <strong>{quiz.title}</strong>
                <span className={styles.rowSub}><ClipboardCheck size={13} /> اختبار بعدي · {quiz.questions?.length ?? 0} سؤال</span>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {editorLessonId ? (
        <LessonEditorModal
          lessonId={editorLessonId}
          moduleId={unit.id}
          onClose={() => setEditorLessonId(null)}
          onSaved={() => void refresh()}
        />
      ) : null}
    </div>
  );
}
