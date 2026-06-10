import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Flame, Play, Target, TrendingUp, ArrowRight, Award, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { learnerApi, sessionApi } from '@/services/api';
import { useI18n } from '@/i18n';
import { learnerVisibility, shouldShowLearnerElement } from '@/features/learnerVisibility';
import SectionTitle from '@/components/ui/SectionTitle';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const learnerId = useAuthStore((state) => state.learnerId)!;
  const navigate = useNavigate();
  const { t, isRtl } = useI18n();

  const { data: progress } = useQuery({
    queryKey: ['progress', learnerId],
    queryFn: () => learnerApi.getProgress(learnerId),
  });

  const { data: sessions } = useQuery({
    queryKey: ['sessions', learnerId],
    queryFn: () => sessionApi.getByLearner(learnerId),
  });

  const prog = (progress?.data as any) ?? {};
  const modules = (prog.moduleProgress ?? []) as any[];
  const competency = prog.latestCompetency;
  const sessionList = ((sessions?.data ?? []) as any[]);
  const summary = (prog.summary ?? {}) as any;
  const resume = (prog.resume ?? null) as any;
  const supportPrompts = (prog.supportPrompts ?? []) as any[];
  const competencyInsights = (prog.competencyInsights ?? null) as any;
  const recentSessions = ((prog.recentSessions ?? sessionList) as any[]);
  const primarySupportPrompt = supportPrompts[0] ?? null;
  const rtlArrowClass = isRtl ? styles.rtlArrow : '';

  const completed = Number(summary.completedUnits ?? modules.filter((item: any) => item.status === 'complete').length);
  const total = Number(summary.totalUnits ?? modules.length ?? 0);
  const remaining = Number(summary.remainingUnits ?? Math.max(total - completed, 0));
  const overallPct = Number(summary.overallProgressPct ?? (total > 0 ? Math.round((completed / total) * 100) : 0));
  const currentUnitProgressPct = Number(summary.currentUnitProgressPct ?? 0);
  const streak = sessionList.length > 0 ? 1 : 0;

  const competencyLabels = [
    t('learner.dashboard.competencies.scoping', 'Scoping'),
    t('learner.dashboard.competencies.planning', 'Planning'),
    t('learner.dashboard.competencies.communication', 'Communication'),
    t('learner.dashboard.competencies.risk', 'Risk'),
    t('learner.dashboard.competencies.decisions', 'Decisions'),
  ];

  const competencyValues = competency ? [competency.c1, competency.c2, competency.c3, competency.c4, competency.c5] : [0, 0, 0, 0, 0];

  async function startOrContinue() {
    if (resume?.resumable && resume?.sessionId) {
      navigate(`/session/${resume.sessionId}`);
      return;
    }
    const next = modules.find((item: any) => item.status !== 'complete' && !item.isLocked);
    const moduleId = resume?.moduleId ?? next?.moduleId ?? modules[0]?.moduleId ?? 'M1';
    const sess = await sessionApi.start({ moduleId, episodeId: resume?.lessonId ?? undefined });
    navigate(`/session/${(sess as any)?.data?.id}`);
  }

  function statusLabel(status: string) {
    if (status === 'complete') return t('common.status.complete');
    if (status === 'in_progress') return t('common.status.inProgress');
    return t('common.status.notStarted');
  }

  function sessionStatusLabel(status: string) {
    if (status === 'completed') return t('learner.dashboard.sessionStatus.completed', 'Completed');
    return t('learner.dashboard.sessionStatus.interrupted', 'Ready to resume');
  }

  function nextActionLabel(value: string) {
    if (value === 'resume_session') return t('learner.dashboard.nextAction.resume', 'Resume');
    if (value === 'review_module') return t('learner.dashboard.nextAction.review', 'Review this unit');
    if (value === 'resume_current_activity') return t('learner.dashboard.nextAction.resumeCurrent', 'Resume your current activity');
    if (value === 'continue_current_unit') return t('learner.dashboard.nextAction.continueCurrent', 'Continue this unit');
    if (value === 'start_next_unit') return t('learner.dashboard.nextAction.startNext', 'Start the next unit');
    if (value === 'start_first_unit') return t('learner.dashboard.nextAction.startFirst', 'Start the first unit');
    if (value === 'complete_previous_unit') return t('learner.dashboard.nextAction.completePrevious', 'Finish the previous unit first');
    if (value === 'complete_previous_unit_and_pass_checkpoint') {
      return t('learner.dashboard.nextAction.completePreviousAndCheckpoint', 'Finish the previous unit and pass its checkpoint');
    }
    return t('learner.dashboard.nextAction.continue', 'Continue');
  }

  function unlockRuleLabel(value: string | null | undefined) {
    if (value === 'complete_previous_unit_and_pass_checkpoint') {
      return t(
        'learner.dashboard.unlock.completePreviousAndCheckpoint',
        'Finish the previous unit and pass its checkpoint to open this one.',
      );
    }
    if (value === 'complete_previous_unit') {
      return t('learner.dashboard.unlock.completePrevious', 'Finish the previous unit to open this one.');
    }
    return t('learner.dashboard.unlock.default', 'Complete the step before this unit to open it.');
  }

  function competencyLabelFromKey(value: string | null | undefined) {
    if (!value) return '--';
    if (value === 'scoping') return t('learner.dashboard.competencies.scoping', 'Scoping');
    if (value === 'planning') return t('learner.dashboard.competencies.planning', 'Planning');
    if (value === 'communication') return t('learner.dashboard.competencies.communication', 'Communication');
    if (value === 'risk') return t('learner.dashboard.competencies.risk', 'Risk');
    if (value === 'decisions') return t('learner.dashboard.competencies.decisions', 'Decisions');
    return value;
  }

  function supportPromptText(prompt: any) {
    const key = String(prompt?.messageKey ?? '');
    if (key === 'resume_incomplete_session') {
      return t('learner.dashboard.support.resume', 'You have an interrupted session. Resume from your latest step.');
    }
    if (key === 'review_weakest_competency') {
      return t(
        'learner.dashboard.support.weakCompetency',
        'A focused review activity is recommended to strengthen your current weakest competency.',
      );
    }
    if (key === 'unlock_enrichment_path') {
      return t(
        'learner.dashboard.support.challenge',
        'You are ready for a challenge activity to deepen your strongest competency.',
      );
    }
    return t('learner.dashboard.support.default', 'Adaptive support is available based on your recent learning state.');
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.greeting}>{t('learner.dashboard.welcomeBack', 'Welcome back')}</h1>
          <p className={styles.sub}>
            {t('learner.dashboard.progressSubtitle', undefined, { completed, total })}
          </p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={startOrContinue} type="button">
          <Play size={16} />
          {resume?.resumable
            ? t('learner.dashboard.resume.action', 'Continue where you left off')
            : completed > 0
              ? t('learner.dashboard.continueTraining')
              : t('learner.dashboard.startTraining')}
        </button>
      </section>

      <div className={styles.resumeGrid}>
        <section className={`card ${styles.resumeCard}`}>
          <div className={styles.resumeHead}>
            <h2>{t('learner.dashboard.resume.title', 'Continue where you left off')}</h2>
          </div>
          {resume ? (
            <>
              <p className={styles.resumeText}>
                {t('learner.dashboard.resume.currentContext', 'Current unit')}: <strong>{resume.moduleTitle ?? resume.moduleId}</strong>
              </p>
              <p className={styles.resumeText}>
                {t('learner.dashboard.resume.currentLesson', 'Current lesson/activity')}: <strong>{resume.lessonTitle ?? resume.lessonId ?? '--'}</strong>
              </p>
              <p className={styles.resumeText}>
                {t('learner.dashboard.resume.nextStep', 'Next required step')}: <strong>{nextActionLabel(resume.nextStep)}</strong>
              </p>
              <div className={styles.inlineProgress}>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, Number(resume.completionPct ?? 0)))}%` }} />
                </div>
                <span>{Math.round(Number(resume.completionPct ?? 0))}%</span>
              </div>
            </>
          ) : (
            <p className={styles.resumeText}>{t('learner.dashboard.resume.noResume', 'No active learning point yet. Start the first unit to create a resume path.')}</p>
          )}
          <button className="btn btn-secondary btn-sm" onClick={startOrContinue} type="button">
            <ArrowRight size={14} className={rtlArrowClass} />
            {resume?.resumable
              ? t('learner.dashboard.resume.go', 'Resume now')
              : t('learner.dashboard.resume.start', 'Start next step')}
          </button>
        </section>

        <section className={`card ${styles.nextCard}`}>
          <h2>{t('learner.dashboard.next.title', 'Next milestone')}</h2>
          <p className={styles.resumeText}>
            {t('learner.dashboard.next.unit', 'Current unit')}: <strong>{summary.currentUnitTitle ?? '--'}</strong>
          </p>
          <p className={styles.resumeText}>
            {t('learner.dashboard.next.required', 'Required action')}: <strong>{nextActionLabel(summary.nextRequiredStep)}</strong>
          </p>
          <div className={styles.summaryRow}>
            <span>{t('learner.dashboard.progress.currentUnit', 'Current unit progress')}</span>
            <strong>{currentUnitProgressPct}%</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>{t('learner.dashboard.progress.remainingUnits', 'Remaining units')}</span>
            <strong>{remaining}</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>{t('learner.dashboard.progress.latestSession', 'Latest session')}</span>
            <strong>{summary.latestSessionId ? t('learner.dashboard.progress.available', 'Available') : '--'}</strong>
          </div>
        </section>
      </div>

      {shouldShowLearnerElement(learnerVisibility.dashboard.supportPrompt, { isNeeded: Boolean(primarySupportPrompt) }) && primarySupportPrompt ? (
        <section className={`card ${styles.supportCard}`}>
          <h2 className={styles.supportHeading}>
            <Sparkles size={16} className={styles.supportHeadingIcon} />
            {t('learner.dashboard.support.title', 'A helpful next step')}
          </h2>
          <div className={styles.supportBody}>
            <div className={styles.supportItem}>{supportPromptText(primarySupportPrompt)}</div>
            <div className={styles.supportActionRow}>
              <button className="btn btn-secondary btn-sm" onClick={startOrContinue} type="button">
                <ArrowRight size={14} className={rtlArrowClass} />
                {t('learner.dashboard.support.action', 'Use this next step')}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <div className={styles.progressSection}>
        <div className={styles.progressHead}>
          <span className={styles.progressCaption}>
            {t('learner.dashboard.programmeProgress')}
          </span>
          <span className={styles.progressValue}>{overallPct}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${overallPct}%` }} />
        </div>
      </div>

      <div className={styles.stats}>
        {[
          { icon: BookOpen, label: t('learner.dashboard.stats.modulesDone'), value: `${completed} / ${total}`, tone: 'teal' as const },
          { icon: Clock, label: t('learner.dashboard.stats.sessions'), value: String(prog.completedSessions ?? 0), tone: 'teal' as const },
          { icon: TrendingUp, label: t('learner.dashboard.stats.competency'), value: competency ? `${Math.round((competency.composite ?? 0) * 100)}%` : '--', tone: 'success' as const },
          { icon: Flame, label: t('learner.dashboard.stats.streak'), value: `${streak} ${t('learner.dashboard.stats.days')}`, tone: 'amber' as const },
        ].map(({ icon: Icon, label, value, tone }) => (
          <div className={`card ${styles.statCard}`} key={label}>
            <div
              className={`${styles.statIcon} ${
                tone === 'success'
                  ? styles.statIconSuccess
                  : tone === 'amber'
                    ? styles.statIconAmber
                    : styles.statIconTeal
              }`}
            >
              <Icon size={18} />
            </div>
            <div className={styles.statCardBody}>
              <div className={styles.statValue}>{value}</div>
              <div className={styles.statLabel}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.twoCol}>
        <section className="card">
          <SectionTitle
            icon={Award}
            title={t('learner.dashboard.competencyProfile')}
            tone="teal"
          />
          <div className={styles.compBars}>
            {competencyLabels.map((label, index) => {
              const value = competencyValues[index] ?? 0;
              const pct = Math.round(value * 100);
              return (
                <div key={label} className={styles.compRow}>
                  <span className={styles.compLabel}>{label}</span>
                  <div className={styles.compTrack}>
                    <div className={styles.compFill} style={{ width: `${pct}%`, animationDelay: `${index * 0.1}s` }} />
                  </div>
                  <span className={styles.compPct}>{pct}%</span>
                </div>
              );
            })}
          </div>
          {competencyInsights && (
            <div className={styles.competencyInsights}>
              <div>
                <span>{t('learner.dashboard.competency.strongest', 'Strongest competency')}</span>
                <strong>{competencyLabelFromKey(competencyInsights?.strongest?.key)}</strong>
              </div>
              <div>
                <span>{t('learner.dashboard.competency.weakest', 'Current focus competency')}</span>
                <strong>{competencyLabelFromKey(competencyInsights?.weakest?.key)}</strong>
              </div>
              <div>
                <span>{t('learner.dashboard.competency.recommended', 'Recommended next focus')}</span>
                <strong>{competencyLabelFromKey(competencyInsights?.recommendedFocus?.key)}</strong>
              </div>
            </div>
          )}
        </section>

        <section className="card">
          <SectionTitle
            icon={Target}
            title={t('learner.dashboard.moduleSectionTitle')}
            tone="blue"
          />
          <div className={styles.moduleList}>
            {modules.length === 0 ? (
              <p className={styles.emptyMessage}>{t('learner.dashboard.noModules')}</p>
            ) : (
              modules.map((module: any) => (
                <button
                  key={module.moduleId}
                  type="button"
                  className={styles.moduleCard}
                  onClick={() => navigate('/modules')}
                >
                  <div className={styles.moduleIdentity}>
                    <div className={styles.moduleMeta}>
                      <span className={styles.moduleTitle}>{module.module?.title ?? module.moduleId}</span>
                      {shouldShowLearnerElement(learnerVisibility.dashboard.lockedHint, { isNeeded: Boolean(module.isLocked) }) && module.isLocked ? (
                        <span className={styles.moduleHint}>{unlockRuleLabel(module.unlockReason)}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className={styles.moduleRight}>
                    <span
                      className={`badge ${
                        module.isLocked
                          ? 'badge-muted'
                          : module.status === 'complete'
                          ? 'badge-success'
                          : module.status === 'in_progress'
                            ? 'badge-teal'
                            : 'badge-muted'
                      }`}
                    >
                      {module.isLocked
                        ? t('learner.modules.buttons.locked', 'Locked')
                        : statusLabel(module.status)}
                    </span>
                    <ArrowRight size={14} className={`${styles.moduleArrow} ${rtlArrowClass}`} />
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      {recentSessions.length > 0 && (
        <section className="card">
          <SectionTitle
            icon={Clock}
            title={t('learner.dashboard.recentSessions')}
            tone="amber"
          />
          <div className={styles.sessionsTable}>
            <div className={styles.sessHeader}>
              <span>{t('learner.dashboard.table.module')}</span>
              <span>{t('learner.dashboard.table.lesson', 'Lesson')}</span>
              <span>{t('learner.dashboard.table.status', 'Status')}</span>
              <span>{t('learner.dashboard.table.progress')}</span>
            </div>
            {recentSessions.slice(0, 6).map((session: any) => (
              <div key={session.id} className={styles.sessRow}>
                <span className={styles.sessModule}>{session.moduleTitle ?? session.moduleId}</span>
                <span className={styles.sessDate}>{session.lessonTitle ?? '--'}</span>
                <span className={styles.sessDuration}>
                  <span className={`badge ${session.status === 'completed' ? 'badge-success' : 'badge-amber'}`}>
                    {sessionStatusLabel(session.status)}
                  </span>
                </span>
                <div className={styles.sessProg}>
                  <div className={`progress-track ${styles.sessionProgressTrack}`}>
                    <div className="progress-fill" style={{ width: `${session.completionPct}%` }} />
                  </div>
                  <span className={styles.sessPct}>{Math.round(Number(session.completionPct ?? 0))}%</span>
                  <button
                    type="button"
                    className={`btn btn-ghost btn-xs ${styles.sessionAction}`}
                    onClick={() => navigate(`/session/${session.id}`)}
                  >
                    {nextActionLabel(session.nextAction)}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
