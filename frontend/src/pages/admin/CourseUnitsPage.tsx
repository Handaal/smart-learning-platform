import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Eye,
  EyeOff,
  Flag,
  PencilLine,
  Plus,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import { quizApi, scenarioApi } from '@/services/api';
import { useI18n } from '@/i18n';
import LessonQuizBuilder, { type LessonQuiz } from '@/components/admin/LessonQuizBuilder';
import {
  generateUnitId,
  RESEARCH_COURSE_KEY,
  validateResearchCourseBuilder,
  type CourseShellDraft,
} from '@/features/courseBuilder/researchCourseBuilder';
import { loadCourseBuilderDraft, saveCourseBuilderDraft } from '@/services/courseBuilderDraft';
import type { ModuleRecord } from '@/features/courseBuilder/types';
import styles from './CourseUnitsPage.module.css';

type UnitModalState = { open: boolean; data?: Partial<ModuleRecord> };

function parseObjectives(value: FormDataEntryValue | null) {
  return String(value ?? '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function CourseUnitsPage() {
  const navigate = useNavigate();
  const { direction } = useI18n();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<CourseShellDraft>(() => loadCourseBuilderDraft());
  const [unitModal, setUnitModal] = useState<UnitModalState>({ open: false });
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);

  const modulesQuery = useQuery({
    queryKey: ['builder-modules'],
    queryFn: async () => {
      const response = (await scenarioApi.listModules()) as { data: ModuleRecord[] };
      return [...(response.data ?? [])].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
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

  const modules = modulesQuery.data ?? [];
  const pretests = pretestQuery.data ?? [];
  const posttests = posttestQuery.data ?? [];

  const validation = useMemo(
    () => validateResearchCourseBuilder({ draft, modules, pretests, posttests }),
    [draft, modules, posttests, pretests],
  );

  async function refreshModules() {
    await queryClient.invalidateQueries({ queryKey: ['builder-modules'] });
  }

  async function refreshAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['builder-modules'] }),
      queryClient.invalidateQueries({ queryKey: ['builder-pretest', RESEARCH_COURSE_KEY] }),
      queryClient.invalidateQueries({ queryKey: ['builder-posttest', RESEARCH_COURSE_KEY] }),
    ]);
  }

  function updateDraft(patch: Partial<CourseShellDraft>) {
    setDraft((current) => {
      const next = { ...current, ...patch };
      saveCourseBuilderDraft(next);
      return next;
    });
  }

  async function handleSaveUnit(form: FormData) {
    const title = String(form.get('title') ?? '').trim();
    if (!title) return;
    const description = String(form.get('description') ?? '').trim();
    const estimatedDurationMin = Number(form.get('estimatedDurationMin') ?? 0) || null;
    const objectives = parseObjectives(form.get('objectives'));

    if (unitModal.data?.id) {
      await scenarioApi.updateModule(unitModal.data.id, {
        title,
        description: description || null,
        objectives,
        estimatedDurationMin,
        status: unitModal.data.status ?? 'draft',
      });
    } else {
      const nextOrder = (modules[modules.length - 1]?.sequenceOrder ?? 0) + 1;
      await scenarioApi.createModule({
        id: generateUnitId(nextOrder),
        title,
        description: description || null,
        objectives,
        estimatedDurationMin,
        sequenceOrder: nextOrder,
        status: 'draft',
      });
    }
    setUnitModal({ open: false });
    await refreshModules();
  }

  async function handleDeleteUnit(id: string) {
    if (!window.confirm('سيتم حذف الوحدة وكل دروسها ومحتوياتها. هل تريد المتابعة؟')) return;
    await scenarioApi.deleteModule(id);
    await refreshModules();
  }

  async function handleTogglePublish(unit: ModuleRecord) {
    await scenarioApi.updateModule(unit.id, { status: unit.status === 'published' ? 'draft' : 'published' });
    await refreshModules();
  }

  async function handleDuplicateUnit(unit: ModuleRecord) {
    if (busy) return;
    setBusy(true);
    try {
      const nextOrder = (modules[modules.length - 1]?.sequenceOrder ?? 0) + 1;
      const newModuleId = generateUnitId(nextOrder);
      await scenarioApi.createModule({
        id: newModuleId,
        title: `${unit.title} (نسخة)`,
        description: unit.description,
        objectives: unit.objectives,
        estimatedDurationMin: unit.estimatedDurationMin ?? null,
        sequenceOrder: nextOrder,
        status: 'draft',
      });

      const sortedEpisodes = [...(unit.episodes ?? [])].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      for (const [index, episode] of sortedEpisodes.entries()) {
        const detail = (await scenarioApi.getEpisode(episode.id)) as {
          data: { generalObjective?: string | null; teacherGuidance?: string | null; learningContents: Array<Record<string, any>> };
        };
        const newEpisodeId = `${newModuleId}-L${String(index + 1).padStart(2, '0')}`;
        await scenarioApi.createEpisode({
          id: newEpisodeId,
          moduleId: newModuleId,
          title: episode.title,
          description: episode.description,
          objectives: episode.objectives,
          sequenceOrder: index + 1,
          baseScaffold: episode.baseScaffold,
          expectedDurationMin: episode.expectedDurationMin ?? null,
          generalObjective: detail.data.generalObjective ?? null,
          teacherGuidance: detail.data.teacherGuidance ?? null,
          emotionalTriggerExpected: episode.emotionalTriggerExpected ?? null,
          lessonType: episode.lessonType,
          status: 'draft',
        });
        for (const block of [...(detail.data.learningContents ?? [])].sort((a, b) => a.sequenceOrder - b.sequenceOrder)) {
          await scenarioApi.uploadContent({
            episodeId: newEpisodeId,
            contentType: block.contentType,
            adaptiveTag: block.adaptiveTag ?? 'baseline',
            scaffoldLevel: block.scaffoldLevel,
            isEnrichment: block.isEnrichment,
            contentData: block.contentData,
            status: 'draft',
          });
        }
      }
      await refreshModules();
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish() {
    if (validation.blocking.length) {
      setShowSettings(true);
      window.alert(`لا يمكن النشر الآن:\n- ${validation.blocking.join('\n- ')}`);
      return;
    }
    setBusy(true);
    try {
      await Promise.all(modules.map((module) => scenarioApi.updateModule(module.id, { status: 'published' })));
      await Promise.all(
        modules
          .flatMap((module) => module.episodes)
          .map((lesson) => scenarioApi.updateEpisode(lesson.id, { status: 'published' })),
      );
      await Promise.all([...pretests, ...posttests].map((quiz) => quizApi.updateQuiz(quiz.id, { isPublished: true })));
      updateDraft({ publicationStatus: 'published' });
      await refreshAll();
      window.alert('تم نشر المقرر بنجاح.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page} dir={direction}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>{draft.title}</span>
          <h1>وحدات المقرر</h1>
          <p>استكشف وأدر وحدات مقرّرك التدريبية ودروسها.</p>
        </div>
        <div className={styles.heroActions}>
          <button type="button" className="btn btn-secondary" onClick={() => setShowSettings(true)}>
            <Settings2 size={16} /> إعدادات المقرر
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setUnitModal({ open: true })}>
            <Plus size={16} /> إضافة وحدة جديدة
          </button>
        </div>
      </header>

      {modulesQuery.isLoading ? (
        <div className={styles.empty}>جاري تحميل الوحدات...</div>
      ) : modules.length ? (
        <div className={styles.grid}>
          {modules.map((unit) => (
            <article key={unit.id} className={styles.card}>
              <div className={styles.cardCover}>
                <BookOpen size={26} />
                <span className={`${styles.coverBadge} ${unit.status === 'published' ? styles.badgePublished : styles.badgeDraft}`}>
                  {unit.status === 'published' ? 'منشور' : 'مسودة'}
                </span>
              </div>
              <div className={styles.cardBody}>
                <span className={styles.cardCode}>{unit.id}</span>
                <h3>{unit.title}</h3>
                <p>{unit.description || 'أضف وصفًا قصيرًا يوضح دور هذه الوحدة داخل المقرر.'}</p>
                <div className={styles.cardMeta}>
                  <span>{unit.episodes.length} درس</span>
                  <span>{unit.estimatedDurationMin ?? 0} دقيقة</span>
                </div>
              </div>
              <div className={styles.cardActions}>
                <div className={styles.iconActions}>
                  <button type="button" className={styles.iconBtn} onClick={() => void handleDuplicateUnit(unit)} disabled={busy} title="تكرار">
                    <Copy size={16} />
                  </button>
                  <button type="button" className={styles.iconBtn} onClick={() => void handleDeleteUnit(unit.id)} title="حذف">
                    <Trash2 size={16} />
                  </button>
                  <button type="button" className={styles.iconBtn} onClick={() => void handleTogglePublish(unit)} title={unit.status === 'published' ? 'إخفاء' : 'نشر'}>
                    {unit.status === 'published' ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button type="button" className={styles.iconBtn} onClick={() => setUnitModal({ open: true, data: unit })} title="تعديل">
                    <PencilLine size={16} />
                  </button>
                </div>
                <button type="button" className={styles.viewBtn} onClick={() => navigate(`/research-admin/course/units/${unit.id}`)}>
                  عرض الدروس <ArrowLeft size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          لا توجد وحدات بعد. اضغط "إضافة وحدة جديدة" لبدء بناء المقرر.
        </div>
      )}

      {unitModal.open ? (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setUnitModal({ open: false })}>
          <form
            className={`card ${styles.modalCard}`}
            onSubmit={(e) => {
              e.preventDefault();
              void handleSaveUnit(new FormData(e.currentTarget));
            }}
          >
            <div className={styles.modalHead}>
              <strong>{unitModal.data?.id ? 'تعديل الوحدة' : 'إضافة وحدة'}</strong>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setUnitModal({ open: false })}>
                <X size={16} />
              </button>
            </div>
            <label className={styles.field}>
              <span>عنوان الوحدة</span>
              <input className="input" name="title" defaultValue={unitModal.data?.title ?? ''} required />
            </label>
            <label className={styles.field}>
              <span>وصف مختصر</span>
              <textarea className="input" name="description" rows={3} defaultValue={unitModal.data?.description ?? ''} />
            </label>
            <label className={styles.field}>
              <span>أهداف الوحدة (هدف في كل سطر)</span>
              <textarea className="input" name="objectives" rows={3} defaultValue={(unitModal.data?.objectives ?? []).join('\n')} />
            </label>
            <label className={styles.field}>
              <span>المدة التقديرية (دقائق)</span>
              <input className="input" name="estimatedDurationMin" type="number" min={0} defaultValue={unitModal.data?.estimatedDurationMin ?? ''} />
            </label>
            <div className={styles.modalActions}>
              <button type="button" className="btn btn-secondary" onClick={() => setUnitModal({ open: false })}>إلغاء</button>
              <button type="submit" className="btn btn-primary">حفظ</button>
            </div>
          </form>
        </div>
      ) : null}

      {showSettings ? (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setShowSettings(false)}>
          <div className={`card ${styles.settingsCard}`}>
            <div className={styles.modalHead}>
              <strong>إعدادات المقرر</strong>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowSettings(false)}>
                <X size={16} />
              </button>
            </div>

            <div className={styles.settingsBody}>
              <section className={styles.settingsSection}>
                <h4>البيانات الأساسية</h4>
                <label className={styles.field}>
                  <span>عنوان المقرر</span>
                  <input className="input" value={draft.title} onChange={(e) => updateDraft({ title: e.target.value })} />
                </label>
                <label className={styles.field}>
                  <span>الوصف المختصر</span>
                  <textarea className="input" rows={3} value={draft.description} onChange={(e) => updateDraft({ description: e.target.value })} />
                </label>
                <div className={styles.inlineFields}>
                  <label className={styles.field}>
                    <span>الفئة المستهدفة</span>
                    <input className="input" value={draft.targetAudience} onChange={(e) => updateDraft({ targetAudience: e.target.value })} />
                  </label>
                  <label className={styles.field}>
                    <span>المدة التقديرية</span>
                    <input className="input" value={draft.estimatedDuration} onChange={(e) => updateDraft({ estimatedDuration: e.target.value })} />
                  </label>
                </div>
                <label className={`${styles.field} ${styles.checkboxField}`}>
                  <input type="checkbox" checked={draft.adaptivePolicyEnabled} onChange={(e) => updateDraft({ adaptivePolicyEnabled: e.target.checked })} />
                  <span>تفعيل الدعم التكيّفي القائم على الانفعالات</span>
                </label>
              </section>

              <section className={styles.settingsSection}>
                <h4><ClipboardCheck size={15} /> الاختبار القبلي</h4>
                <LessonQuizBuilder
                  scope="pretest"
                  courseKey={RESEARCH_COURSE_KEY}
                  quizzes={pretests}
                  onRefresh={async () => { await queryClient.invalidateQueries({ queryKey: ['builder-pretest', RESEARCH_COURSE_KEY] }); }}
                  headerTitle="الاختبار القبلي"
                  addQuizLabel="إضافة الاختبار القبلي"
                  emptyState="لم يُضف الاختبار القبلي بعد."
                />
              </section>

              <section className={styles.settingsSection}>
                <h4><ClipboardCheck size={15} /> الاختبار البعدي</h4>
                <LessonQuizBuilder
                  scope="posttest"
                  courseKey={RESEARCH_COURSE_KEY}
                  quizzes={posttests}
                  onRefresh={async () => { await queryClient.invalidateQueries({ queryKey: ['builder-posttest', RESEARCH_COURSE_KEY] }); }}
                  headerTitle="الاختبار البعدي"
                  addQuizLabel="إضافة الاختبار البعدي"
                  emptyState="لم يُضف الاختبار البعدي بعد."
                />
              </section>

              <section className={styles.settingsSection}>
                <h4><Flag size={15} /> التحقق والنشر</h4>
                <ul className={styles.checklist}>
                  <li>{validation.checks.hasUnits ? '✔' : '•'} وحدات المقرر</li>
                  <li>{validation.checks.hasLessons ? '✔' : '•'} دروس المقرر</li>
                  <li>{validation.checks.hasPreTest ? '✔' : '•'} الاختبار القبلي</li>
                  <li>{validation.checks.hasPostTest ? '✔' : '•'} الاختبار البعدي</li>
                </ul>
                {validation.blocking.length ? (
                  <div className={styles.blockingBox}>
                    {validation.blocking.map((issue) => (
                      <span key={issue}>• {issue}</span>
                    ))}
                  </div>
                ) : (
                  <div className={styles.readyBox}>
                    <CheckCircle2 size={15} /> المقرر جاهز للنشر.
                  </div>
                )}
                <div className={styles.modalActions}>
                  <button type="button" className="btn btn-primary" onClick={() => void handlePublish()} disabled={busy}>
                    نشر المقرر
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
