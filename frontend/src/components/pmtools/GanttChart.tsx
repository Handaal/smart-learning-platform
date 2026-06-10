import { useMemo, useRef, useState } from 'react';
import { addDays, differenceInDays, format, parseISO, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import styles from './GanttChart.module.css';

export interface GanttTask {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  progress: number;
  color: string;
  phase: string;
}

const PHASE_COLOR_MAP: Record<string, string> = {
  Analysis: '#6366F1',
  Design: '#0D9488',
  Development: '#F59E0B',
  Implementation: '#10B981',
  Evaluation: '#F87171',
};

const DAY_WIDTH = 20;
const ROW_HEIGHT = 36;
const VISIBLE_DAYS = 60;

let ganttCounter = 1;
function newTaskId() {
  return `G${String(ganttCounter++).padStart(3, '0')}`;
}

function isoToday() {
  return format(new Date(), 'yyyy-MM-dd');
}

function isoOffset(days: number) {
  return format(addDays(new Date(), days), 'yyyy-MM-dd');
}

function createInitialTasks(t: (key: string, fallback?: string) => string): GanttTask[] {
  return [
    {
      id: newTaskId(),
      phase: 'Analysis',
      name: t('learner.pmTools.gantt.tasks.stakeholderAnalysis', 'Stakeholder needs analysis'),
      startDate: isoOffset(0),
      endDate: isoOffset(7),
      progress: 80,
      color: PHASE_COLOR_MAP.Analysis,
    },
    {
      id: newTaskId(),
      phase: 'Analysis',
      name: t('learner.pmTools.gantt.tasks.audienceReview', 'Audience and context review'),
      startDate: isoOffset(3),
      endDate: isoOffset(10),
      progress: 40,
      color: PHASE_COLOR_MAP.Analysis,
    },
    {
      id: newTaskId(),
      phase: 'Design',
      name: t('learner.pmTools.gantt.tasks.objectiveDraft', 'Learning objectives draft'),
      startDate: isoOffset(8),
      endDate: isoOffset(15),
      progress: 20,
      color: PHASE_COLOR_MAP.Design,
    },
    {
      id: newTaskId(),
      phase: 'Design',
      name: t('learner.pmTools.gantt.tasks.storyboardDesign', 'Storyboard and visual design'),
      startDate: isoOffset(12),
      endDate: isoOffset(22),
      progress: 0,
      color: PHASE_COLOR_MAP.Design,
    },
    {
      id: newTaskId(),
      phase: 'Development',
      name: t('learner.pmTools.gantt.tasks.contentAuthoring', 'Content authoring'),
      startDate: isoOffset(20),
      endDate: isoOffset(35),
      progress: 0,
      color: PHASE_COLOR_MAP.Development,
    },
    {
      id: newTaskId(),
      phase: 'Development',
      name: t('learner.pmTools.gantt.tasks.mediaBuild', 'Interaction and media build'),
      startDate: isoOffset(28),
      endDate: isoOffset(42),
      progress: 0,
      color: PHASE_COLOR_MAP.Development,
    },
    {
      id: newTaskId(),
      phase: 'Implementation',
      name: t('learner.pmTools.gantt.tasks.lmsTesting', 'LMS upload and testing'),
      startDate: isoOffset(40),
      endDate: isoOffset(47),
      progress: 0,
      color: PHASE_COLOR_MAP.Implementation,
    },
    {
      id: newTaskId(),
      phase: 'Evaluation',
      name: t('learner.pmTools.gantt.tasks.pilotReview', 'Pilot and feedback review'),
      startDate: isoOffset(45),
      endDate: isoOffset(56),
      progress: 0,
      color: PHASE_COLOR_MAP.Evaluation,
    },
  ];
}

interface Props {
  onExport?: (tasks: GanttTask[]) => void;
}

export default function GanttChart({ onExport }: Props) {
  const { t, language, isRtl } = useI18n();
  const [tasks, setTasks] = useState<GanttTask[]>(() => createInitialTasks(t));
  const [viewStart, setViewStart] = useState<Date>(startOfDay(new Date()));
  const timelineRef = useRef<HTMLDivElement>(null);

  const locale = language === 'ar' ? 'ar-SA' : 'en-US';
  const phaseLabels = useMemo(
    () => ({
      Analysis: t('learner.pmTools.gantt.phases.analysis', 'Analysis'),
      Design: t('learner.pmTools.gantt.phases.design', 'Design'),
      Development: t('learner.pmTools.gantt.phases.development', 'Development'),
      Implementation: t('learner.pmTools.gantt.phases.implementation', 'Implementation'),
      Evaluation: t('learner.pmTools.gantt.phases.evaluation', 'Evaluation'),
    }),
    [t],
  );

  const phaseOptions = useMemo(
    () => Object.entries(phaseLabels).map(([value, label]) => ({ value, label })),
    [phaseLabels],
  );

  const viewEnd = addDays(viewStart, VISIBLE_DAYS);
  const totalWidth = VISIBLE_DAYS * DAY_WIDTH;

  const dayHeaders = useMemo(
    () =>
      Array.from({ length: VISIBLE_DAYS }, (_, index) => {
        const date = addDays(viewStart, index);
        return {
          label: new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(date),
          key: `${date.toISOString()}-${index}`,
        };
      }),
    [locale, viewStart],
  );

  const weekHeaders = useMemo(() => {
    const rows: Array<{ label: string; width: number; key: string }> = [];
    for (let offset = 0; offset < VISIBLE_DAYS; offset += 7) {
      const date = addDays(viewStart, offset);
      rows.push({
        label: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date),
        width: Math.min(7, VISIBLE_DAYS - offset) * DAY_WIDTH,
        key: `${date.toISOString()}-${offset}`,
      });
    }
    return rows;
  }, [locale, viewStart]);

  function taskLeft(task: GanttTask) {
    return Math.max(0, differenceInDays(parseISO(task.startDate), viewStart)) * DAY_WIDTH;
  }

  function taskWidth(task: GanttTask) {
    const start = parseISO(task.startDate);
    const end = parseISO(task.endDate);
    const clampedStart = start < viewStart ? viewStart : start;
    const clampedEnd = end > viewEnd ? viewEnd : end;
    return Math.max(DAY_WIDTH, differenceInDays(clampedEnd, clampedStart) * DAY_WIDTH);
  }

  function updateTask<K extends keyof GanttTask>(id: string, field: K, value: GanttTask[K]) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, [field]: value } : task)));
  }

  function removeTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function addTask() {
    setTasks((current) => [
      ...current,
      {
        id: newTaskId(),
        phase: 'Analysis',
        name: t('learner.pmTools.gantt.defaultTask', 'New task'),
        startDate: isoToday(),
        endDate: isoOffset(7),
        progress: 0,
        color: PHASE_COLOR_MAP.Analysis,
      },
    ]);
  }

  function shiftView(days: number) {
    setViewStart((current) => addDays(current, days));
  }

  return (
    <div className={styles.root}>
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <h3 className={styles.title}>{t('learner.pmTools.tabs.gantt', 'Gantt Chart')}</h3>
          <span className={styles.range}>
            {new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(viewStart)} -{' '}
            {new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(viewEnd)}
          </span>
        </div>

        <div className={styles.topRight}>
          <button className={styles.navBtn} onClick={() => shiftView(-7)}>
            {isRtl ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            {t('learner.pmTools.gantt.oneWeek', '1w')}
          </button>

          <button className={styles.navBtn} onClick={() => shiftView(7)}>
            {t('learner.pmTools.gantt.oneWeek', '1w')}
            {isRtl ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>

          <button className="btn btn-secondary btn-sm" onClick={addTask}>
            <Plus size={13} />
            {t('learner.pmTools.gantt.addTask', 'Add task')}
          </button>

          {onExport ? (
            <button className="btn btn-secondary btn-sm" onClick={() => onExport(tasks)}>
              {t('learner.pmTools.gantt.export', 'Export')}
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.taskPane}>
          <div className={styles.taskHeader}>
            <span>{t('learner.pmTools.gantt.columns.task', 'Task')}</span>
            <span>{t('learner.pmTools.gantt.columns.phase', 'Phase')}</span>
            <span>{t('learner.pmTools.gantt.columns.progress', '%')}</span>
          </div>

          {tasks.map((task) => (
            <div key={task.id} className={styles.taskRow} style={{ height: ROW_HEIGHT }}>
              <input className={styles.taskName} value={task.name} onChange={(event) => updateTask(task.id, 'name', event.target.value)} />

              <select
                className={styles.phaseSelect}
                value={task.phase}
                onChange={(event) => {
                  const phase = event.target.value;
                  updateTask(task.id, 'phase', phase);
                  updateTask(task.id, 'color', PHASE_COLOR_MAP[phase] ?? '#6366F1');
                }}
              >
                {phaseOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div className={styles.progressCell}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={styles.progressInput}
                  value={task.progress}
                  onChange={(event) => updateTask(task.id, 'progress', Number(event.target.value))}
                />
                <button className={styles.delBtn} onClick={() => removeTask(task.id)} aria-label={t('learner.pmTools.gantt.delete', 'Delete')}>
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.timelinePane} ref={timelineRef}>
          <div className={styles.weekHeaders} style={{ width: totalWidth }}>
            {weekHeaders.map((week) => (
              <div key={week.key} className={styles.weekHeader} style={{ width: week.width }}>
                {week.label}
              </div>
            ))}
          </div>

          <div className={styles.dayHeaders} style={{ width: totalWidth }}>
            {dayHeaders.map((day) => (
              <div key={day.key} className={styles.dayHeader} style={{ width: DAY_WIDTH }}>
                {day.label}
              </div>
            ))}
          </div>

          <div
            className={styles.todayMarker}
            style={{
              left: differenceInDays(new Date(), viewStart) * DAY_WIDTH,
              height: tasks.length * ROW_HEIGHT + 4,
            }}
          />

          {tasks.map((task) => (
            <div key={task.id} className={styles.barRow} style={{ height: ROW_HEIGHT, width: totalWidth }}>
              <div
                className={styles.bar}
                style={{
                  left: taskLeft(task),
                  width: taskWidth(task),
                  background: `${task.color}33`,
                  border: `1px solid ${task.color}66`,
                }}
                title={`${task.name} - ${task.startDate} to ${task.endDate}`}
              >
                <div className={styles.barFill} style={{ width: `${task.progress}%`, background: task.color }} />
                <span className={styles.barLabel}>{task.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.dateEditor}>
        {tasks.map((task) => (
          <div key={task.id} className={styles.dateRow}>
            <span className={styles.dateTaskName} style={{ borderInlineStart: `3px solid ${task.color}`, paddingInlineStart: 8 }}>
              {task.name}
            </span>
            <label className={styles.dateLabel}>
              {t('learner.pmTools.gantt.dateStart', 'Start')}
              <input type="date" className={styles.dateInput} value={task.startDate} onChange={(event) => updateTask(task.id, 'startDate', event.target.value)} />
            </label>
            <label className={styles.dateLabel}>
              {t('learner.pmTools.gantt.dateEnd', 'End')}
              <input type="date" className={styles.dateInput} value={task.endDate} onChange={(event) => updateTask(task.id, 'endDate', event.target.value)} />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
