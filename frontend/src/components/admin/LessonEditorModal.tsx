import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList,
  FileText,
  HeartHandshake,
  HelpCircle,
  Info,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { scenarioApi } from '@/services/api';
import {
  fromStoredLessonType,
  getScenarioTitle,
  LESSON_TYPE_OPTIONS,
  toStoredLessonType,
  type ResearchLessonType,
} from '@/features/courseBuilder/researchCourseBuilder';
import {
  CONTENT_TYPE_OPTIONS,
  EMOTION_CHANNELS,
  EMOTION_LABELS,
  type ContentBlockType,
  type LearningContentRecord,
  type LessonDetail,
  type PublishStatus,
} from '@/features/courseBuilder/types';
import ContentBlockForm, { type ContentBlockPayload } from './ContentBlockForm';
import LessonQuizBuilder, { type LessonQuiz } from './LessonQuizBuilder';
import styles from './LessonEditorModal.module.css';

type TabKey = 'basic' | 'content' | 'activities' | 'questions' | 'emotion';

type Props = {
  lessonId: string;
  moduleId: string;
  onClose: () => void;
  onSaved?: () => void;
};

const TABS: Array<{ key: TabKey; label: string; icon: typeof FileText }> = [
  { key: 'basic', label: 'الأساسية', icon: Info },
  { key: 'content', label: 'المحتوى', icon: FileText },
  { key: 'activities', label: 'الأنشطة', icon: ClipboardList },
  { key: 'questions', label: 'الأسئلة', icon: HelpCircle },
  { key: 'emotion', label: 'الدعم الانفعالي', icon: HeartHandshake },
];

const EMOTIONAL_TRIGGER_OPTIONS = [
  { value: '', label: 'غير محدد' },
  ...EMOTION_CHANNELS.map((key) => ({ value: key, label: getScenarioTitle(key as any) })),
];

function contentTypeLabel(type: ContentBlockType) {
  return CONTENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

function blockTitle(block: LearningContentRecord) {
  const data = block.contentData ?? {};
  const pick = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');
  return pick(data.title) || pick(data.question) || pick(data.prompt) || `${block.sequenceOrder}. ${contentTypeLabel(block.contentType)}`;
}

export default function LessonEditorModal({ lessonId, moduleId, onClose, onSaved }: Props) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('basic');

  const detailQuery = useQuery({
    queryKey: ['builder-lesson-detail', lessonId],
    queryFn: async () => {
      const response = (await scenarioApi.getEpisode(lessonId)) as { data: LessonDetail };
      return response.data;
    },
  });

  const detail = detailQuery.data ?? null;

  // Basics form state, seeded once detail loads.
  const [basicsDraft, setBasicsDraft] = useState<null | {
    title: string;
    generalObjective: string;
    teacherGuidance: string;
    objectives: string;
    lessonType: ResearchLessonType;
    expectedDurationMin: string;
    emotionalTriggerExpected: string;
    status: PublishStatus;
  }>(null);
  const [savingBasics, setSavingBasics] = useState(false);

  const basics = useMemo(() => {
    if (basicsDraft) return basicsDraft;
    if (!detail) return null;
    return {
      title: detail.title ?? '',
      generalObjective: detail.generalObjective ?? '',
      teacherGuidance: detail.teacherGuidance ?? '',
      objectives: (detail.objectives ?? []).join('\n'),
      lessonType: fromStoredLessonType(detail.lessonType),
      expectedDurationMin: detail.expectedDurationMin != null ? String(detail.expectedDurationMin) : '',
      emotionalTriggerExpected: detail.emotionalTriggerExpected ?? '',
      status: detail.status,
    };
  }, [basicsDraft, detail]);

  const [formState, setFormState] = useState<null | {
    adaptiveTag: 'baseline' | (typeof EMOTION_CHANNELS)[number];
    defaultContentType: ContentBlockType;
    initial: LearningContentRecord | null;
  }>(null);

  const contents = detail?.learningContents ?? [];
  const baselineBlocks = contents.filter((c) => !c.adaptiveTag || c.adaptiveTag === 'baseline');
  const contentBlocks = baselineBlocks.filter((c) => c.contentType !== 'ASSESSMENT');
  const activityBlocks = baselineBlocks.filter((c) => c.contentType === 'ASSESSMENT');

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['builder-lesson-detail', lessonId] });
    await queryClient.invalidateQueries({ queryKey: ['builder-modules'] });
    onSaved?.();
  }

  function updateBasics(patch: Partial<NonNullable<typeof basics>>) {
    setBasicsDraft((current) => ({ ...(current ?? (basics as NonNullable<typeof basics>)), ...patch }));
  }

  async function saveBasics() {
    if (!basics) return;
    setSavingBasics(true);
    try {
      await scenarioApi.updateEpisode(lessonId, {
        title: basics.title.trim(),
        generalObjective: basics.generalObjective.trim() || null,
        teacherGuidance: basics.teacherGuidance.trim() || null,
        objectives: basics.objectives
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean),
        lessonType: toStoredLessonType(basics.lessonType),
        expectedDurationMin: basics.expectedDurationMin ? Number(basics.expectedDurationMin) || null : null,
        emotionalTriggerExpected: basics.emotionalTriggerExpected || null,
        status: basics.status,
      });
      setBasicsDraft(null);
      await refresh();
    } finally {
      setSavingBasics(false);
    }
  }

  async function saveBlock(payload: ContentBlockPayload, existing: LearningContentRecord | null) {
    if (existing) {
      await scenarioApi.updateContent(existing.id, {
        contentType: payload.contentType,
        adaptiveTag: payload.adaptiveTag,
        scaffoldLevel: payload.scaffoldLevel,
        isEnrichment: payload.isEnrichment,
        contentData: payload.contentData,
        status: payload.status,
        ...(payload.sequenceOrder != null ? { sequenceOrder: payload.sequenceOrder } : {}),
      });
    } else {
      const created = (await scenarioApi.uploadContent({
        episodeId: lessonId,
        contentType: payload.contentType,
        adaptiveTag: payload.adaptiveTag,
        scaffoldLevel: payload.scaffoldLevel,
        isEnrichment: payload.isEnrichment,
        contentData: payload.contentData,
        status: payload.status,
      })) as { data: { id: string } };
      if (payload.sequenceOrder != null) {
        await scenarioApi.updateContent(created.data.id, { sequenceOrder: payload.sequenceOrder });
      }
    }
    setFormState(null);
    await refresh();
  }

  async function deleteBlock(id: string) {
    if (!window.confirm('سيتم حذف هذا المكوّن. هل تريد المتابعة؟')) return;
    await scenarioApi.deleteContent(id);
    await refresh();
  }

  function renderBlockList(blocks: LearningContentRecord[], emptyLabel: string) {
    if (!blocks.length) return <div className={styles.empty}>{emptyLabel}</div>;
    return (
      <div className={styles.blockList}>
        {[...blocks]
          .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
          .map((block) => (
            <article key={block.id} className={styles.blockCard}>
              <div className={styles.blockCopy}>
                <strong>{blockTitle(block)}</strong>
                <div className={styles.blockMeta}>
                  <span className={styles.tag}>{contentTypeLabel(block.contentType)}</span>
                  {block.isEnrichment ? <span className={styles.tag}>إثرائي</span> : null}
                  <span className={styles.tagMuted}>ترتيب {block.sequenceOrder}</span>
                </div>
              </div>
              <div className={styles.blockActions}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    setFormState({
                      adaptiveTag: (block.adaptiveTag && block.adaptiveTag !== 'baseline'
                        ? block.adaptiveTag
                        : 'baseline') as any,
                      defaultContentType: block.contentType,
                      initial: block,
                    })
                  }
                >
                  تعديل
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void deleteBlock(block.id)}>
                  <Trash2 size={12} />
                </button>
              </div>
            </article>
          ))}
      </div>
    );
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`card ${styles.editorCard}`}>
        <div className={styles.editorHead}>
          <div>
            <span className={styles.eyebrow}>تعديل محتوى الدرس</span>
            <strong>{detail?.title ?? 'تحميل...'}</strong>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className={styles.tabBar} role="tablist">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`${styles.tabButton} ${activeTab === tab.key ? styles.tabButtonActive : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.editorBody}>
          {detailQuery.isLoading || !basics ? (
            <div className={styles.empty}>جاري تحميل بيانات الدرس...</div>
          ) : activeTab === 'basic' ? (
            <div className={styles.form}>
              <label className={styles.field}>
                <span>عنوان الدرس</span>
                <input className="input" value={basics.title} onChange={(e) => updateBasics({ title: e.target.value })} />
              </label>
              <label className={styles.field}>
                <span>الهدف العام</span>
                <textarea
                  className="input"
                  rows={3}
                  value={basics.generalObjective}
                  onChange={(e) => updateBasics({ generalObjective: e.target.value })}
                />
              </label>
              <label className={styles.field}>
                <span>توجيهات المعلم</span>
                <textarea
                  className="input"
                  rows={3}
                  value={basics.teacherGuidance}
                  onChange={(e) => updateBasics({ teacherGuidance: e.target.value })}
                />
              </label>
              <label className={styles.field}>
                <span>أهداف الدرس (هدف في كل سطر)</span>
                <textarea
                  className="input"
                  rows={3}
                  value={basics.objectives}
                  onChange={(e) => updateBasics({ objectives: e.target.value })}
                />
              </label>
              <div className={styles.inlineFields}>
                <label className={styles.field}>
                  <span>نوع الدرس</span>
                  <select
                    className="input"
                    value={basics.lessonType}
                    onChange={(e) => updateBasics({ lessonType: e.target.value as ResearchLessonType })}
                  >
                    {LESSON_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>المدة المتوقعة (دقائق)</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={basics.expectedDurationMin}
                    onChange={(e) => updateBasics({ expectedDurationMin: e.target.value })}
                  />
                </label>
              </div>
              <div className={styles.inlineFields}>
                <label className={styles.field}>
                  <span>السيناريو الانفعالي المتوقع</span>
                  <select
                    className="input"
                    value={basics.emotionalTriggerExpected}
                    onChange={(e) => updateBasics({ emotionalTriggerExpected: e.target.value })}
                  >
                    {EMOTIONAL_TRIGGER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>حالة الدرس</span>
                  <select
                    className="input"
                    value={basics.status}
                    onChange={(e) => updateBasics({ status: e.target.value as PublishStatus })}
                  >
                    <option value="draft">مسودة</option>
                    <option value="published">منشور</option>
                  </select>
                </label>
              </div>
              <div className={styles.formActions}>
                <button type="button" className="btn btn-primary" onClick={() => void saveBasics()} disabled={savingBasics}>
                  {savingBasics ? 'جارٍ الحفظ...' : 'حفظ الأساسيات'}
                </button>
              </div>
            </div>
          ) : activeTab === 'content' ? (
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <p>محتوى المسار الأساسي الذي يراه جميع المتعلمين بالترتيب. يدعم النص والصورة والفيديو.</p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setFormState({ adaptiveTag: 'baseline', defaultContentType: 'TEXT', initial: null })}
                >
                  <Plus size={14} /> إضافة مكوّن
                </button>
              </div>
              {renderBlockList(contentBlocks, 'لا توجد مكونات محتوى بعد.')}
            </div>
          ) : activeTab === 'activities' ? (
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <p>أنشطة قصيرة داخل الدرس (سؤال أو مهمة تفاعلية) ضمن المسار الأساسي.</p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setFormState({ adaptiveTag: 'baseline', defaultContentType: 'ASSESSMENT', initial: null })}
                >
                  <Plus size={14} /> إضافة نشاط
                </button>
              </div>
              {renderBlockList(activityBlocks, 'لا توجد أنشطة بعد.')}
            </div>
          ) : activeTab === 'questions' ? (
            <div className={styles.panel}>
              <LessonQuizBuilder
                scope="lesson"
                lessonId={lessonId}
                moduleId={moduleId}
                quizzes={(detail?.quizzes ?? []) as LessonQuiz[]}
                onRefresh={refresh}
                headerTitle="أسئلة الدرس"
                headerDescription="اختبار قصير مرتبط بهذا الدرس لقياس الفهم."
                addQuizLabel="إضافة اختبار للدرس"
                emptyState="لا توجد أسئلة لهذا الدرس بعد."
              />
            </div>
          ) : (
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <p>
                  أنشئ محتوى دعم مخصصًا لكل حالة انفعالية. يظهر تلقائيًا للمتعلم عند رصد الحالة المقابلة، ويمكن أن يكون
                  بأي نوع (نص، فيديو، نشاط…).
                </p>
              </div>
              {EMOTION_CHANNELS.map((channel) => {
                const channelBlocks = contents.filter((c) => c.adaptiveTag === channel);
                return (
                  <section key={channel} className={styles.emotionSection}>
                    <div className={styles.emotionHead}>
                      <div className={styles.emotionHeadCopy}>
                        <span className={styles.emotionResultTag}>نتيجة متتبّع المشاعر</span>
                        <strong>{EMOTION_LABELS[channel]}</strong>
                        <small>{getScenarioTitle(channel as any)}</small>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setFormState({ adaptiveTag: channel, defaultContentType: 'TEXT', initial: null })}
                      >
                        <Plus size={14} /> إضافة محتوى
                      </button>
                    </div>
                    {renderBlockList(channelBlocks, 'لا يوجد محتوى دعم لهذه الحالة بعد.')}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {formState ? (
        <ContentBlockForm
          adaptiveTag={formState.adaptiveTag}
          defaultContentType={formState.defaultContentType}
          initial={formState.initial}
          defaultStatus={detail?.status ?? 'draft'}
          onCancel={() => setFormState(null)}
          onSubmit={(payload) => saveBlock(payload, formState.initial)}
        />
      ) : null}
    </div>
  );
}
