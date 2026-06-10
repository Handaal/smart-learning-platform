import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle2, ChevronRight, Clock, Lock, Play, Target, Zap } from 'lucide-react';
import { scenarioApi, sessionApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useI18n } from '@/i18n';
import { learnerVisibility, shouldShowLearnerElement } from '@/features/learnerVisibility';
import styles from './ModulesPage.module.css';

export default function ModulesPage() {
  const learnerId = useAuthStore((state) => state.learnerId)!;
  const navigate = useNavigate();
  const { t, isRtl } = useI18n();

  const { data: modules, isLoading } = useQuery({
    queryKey: ['modules'],
    queryFn: scenarioApi.listModules,
  });

  const { data: progressData } = useQuery({
    queryKey: ['scenario-progress', learnerId],
    queryFn: () => scenarioApi.getProgress(learnerId),
  });

  const moduleRows = ((modules?.data ?? []) as any[]);
  const progress = ((progressData?.data ?? []) as any[]);
  const progressMap = Object.fromEntries(progress.map((item: any) => [item.moduleId, item]));

  const completedCount = progress.filter((item: any) => item.status === 'complete').length;
  const totalCount = moduleRows.length;
  const overallPct = Math.round((completedCount / Math.max(totalCount, 1)) * 100);

  async function startModule(moduleId: string) {
    const sess = await sessionApi.start({ moduleId });
    navigate(`/session/${(sess as any).data.id}`);
  }

  function statusLabel(status: string) {
    if (status === 'complete') return t('learner.modules.status.complete');
    if (status === 'in_progress') return t('learner.modules.status.inProgress');
    return t('learner.modules.status.readyToStart', 'Ready to start');
  }

  function actionLabel(status: string, locked: boolean) {
    if (locked) return t('learner.modules.buttons.locked');
    if (status === 'complete') return t('learner.modules.buttons.review');
    if (status === 'in_progress') return t('learner.modules.buttons.continue');
    return t('learner.modules.buttons.start');
  }

  function moduleHint(status: string, locked: boolean) {
    if (locked) return t('learner.modules.hints.locked', 'Finish the previous unit to open this one.');
    if (status === 'complete') return t('learner.modules.hints.review', 'You can return to this unit any time for review.');
    if (status === 'in_progress') return t('learner.modules.hints.continue', 'Continue from the last lesson step you reached.');
    return t('learner.modules.hints.start', 'This unit is ready when you are.');
  }

  if (isLoading) return <div className={styles.loading}>{t('learner.modules.loading')}</div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>{t('learner.modules.title')}</h1>
          <p>{t('learner.modules.subtitle')}</p>
        </div>
        <div className={styles.overallProgress}>
          <div className={styles.progressLabel}>
            <BookOpen size={14} />
            <span>{t('learner.modules.overallProgress')}</span>
          </div>
          <div className={styles.progressRing}>
            <svg viewBox="0 0 36 36" className={styles.progressCircle}>
              <path className={styles.progressBg} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className={styles.progressValue} strokeDasharray={`${overallPct}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span className={styles.progressPct}>{overallPct}%</span>
          </div>
          <span className={styles.progressSub}>
            {t('learner.modules.completeCount', undefined, { completed: completedCount, total: totalCount })}
          </span>
        </div>
      </div>

      <div className={styles.grid}>
        {moduleRows.map((module: any, index: number) => {
          const currentProgress = progressMap[module.id];
          const status = currentProgress?.status ?? 'not_started';
          const isLocked = index > 0 && progressMap[moduleRows[index - 1]?.id]?.status !== 'complete' && !currentProgress;

          return (
            <div
              key={module.id}
              className={`${styles.card} ${isLocked ? styles.locked : ''} ${status === 'complete' ? styles.completed : ''}`}
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div className={styles.moduleNumWrap}>
                <div
                  className={`${styles.moduleNum} ${
                    status === 'complete' ? styles.moduleNumDone : status === 'in_progress' ? styles.moduleNumActive : ''
                  }`}
                >
                  {status === 'complete' ? <CheckCircle2 size={22} /> : module.sequenceOrder}
                </div>
                {index < moduleRows.length - 1 && (
                  <div className={`${styles.connector} ${status === 'complete' ? styles.connectorDone : ''}`} />
                )}
              </div>

              <div className={styles.info}>
                <div className={styles.cardTop}>
                  <span
                    className={`badge ${
                      status === 'complete'
                        ? 'badge-success'
                        : status === 'in_progress'
                          ? 'badge-teal'
                          : 'badge-muted'
                    }`}
                  >
                    {status === 'complete' ? <><CheckCircle2 size={11} /> {statusLabel(status)}</> : status === 'in_progress' ? <><Zap size={11} /> {statusLabel(status)}</> : statusLabel(status)}
                  </span>
                </div>

                <h3 className={styles.title}>{module.title}</h3>
                <p className={styles.desc}>{module.description}</p>
                {shouldShowLearnerElement(learnerVisibility.modules.availabilityHint, { isNeeded: true }) ? (
                  <p className={styles.hintText}>{moduleHint(status, isLocked)}</p>
                ) : null}

                <div className={styles.metaRow}>
                  <div className={styles.meta}>
                    <Clock size={13} />
                    <span>{module.estimatedDurationMin} min</span>
                  </div>
                  <div className={styles.meta}>
                    <Target size={13} />
                    <span>
                      {module.sessionCount === 1
                        ? t('learner.modules.sessionCount', undefined, { count: module.sessionCount })
                        : t('learner.modules.sessionCountPlural', undefined, { count: module.sessionCount })}
                    </span>
                  </div>
                  {module.episodes && (
                    <div className={styles.meta}>
                      <BookOpen size={13} />
                      <span>
                        {module.episodes.length === 1
                          ? t('learner.modules.episodeCount', undefined, { count: module.episodes.length })
                          : t('learner.modules.episodeCountPlural', undefined, { count: module.episodes.length })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                className={`btn ${styles.actionButton} ${
                  status === 'in_progress' ? 'btn-primary' : 'btn-secondary'
                }`}
                onClick={() => !isLocked && startModule(module.id)}
                disabled={isLocked}
              >
                {isLocked ? (
                  <>
                    <Lock size={14} /> {actionLabel(status, isLocked)}
                  </>
                ) : status === 'complete' ? (
                  <>
                    <ChevronRight size={14} className={isRtl ? styles.rtlIcon : ''} /> {actionLabel(status, false)}
                  </>
                ) : (
                  <>
                    <Play size={14} /> {actionLabel(status, false)}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
