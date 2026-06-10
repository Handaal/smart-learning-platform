import { useState } from 'react';
import { useI18n } from '@/i18n';
import { learnerVisibility, shouldShowLearnerElement } from '@/features/learnerVisibility';
import WbsTool from '@/components/pmtools/WbsTool';
import GanttChart from '@/components/pmtools/GanttChart';
import RiskRegister from '@/components/pmtools/RiskRegister';
import styles from './PMToolsPage.module.css';

type Tab = 'wbs' | 'gantt' | 'risk';

export default function PMToolsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('wbs');

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'wbs', label: t('learner.pmTools.tabs.wbs', 'Work Breakdown Structure') },
    { id: 'gantt', label: t('learner.pmTools.tabs.gantt', 'Gantt Chart') },
    { id: 'risk', label: t('learner.pmTools.tabs.risk', 'Risk Register') },
  ];

  const toolGuide = {
    wbs: {
      title: t('learner.pmTools.context.wbsTitle', 'Break the work into clear steps'),
      body: t(
        'learner.pmTools.context.wbsBody',
        'Use this view when the lesson asks you to turn a project goal into smaller, manageable tasks.',
      ),
    },
    gantt: {
      title: t('learner.pmTools.context.ganttTitle', 'Plan timing and sequence'),
      body: t(
        'learner.pmTools.context.ganttBody',
        'Use this view to arrange tasks over time and see what should happen first, next, and later.',
      ),
    },
    risk: {
      title: t('learner.pmTools.context.riskTitle', 'Review risks before they grow'),
      body: t(
        'learner.pmTools.context.riskBody',
        'Use this view to record possible risks, their impact, and the action you would take to reduce them.',
      ),
    },
  } satisfies Record<Tab, { title: string; body: string }>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('learner.pmTools.title', 'Project tools')}</h1>
          <p className={styles.subtitle}>
            {t(
              'learner.pmTools.subtitle',
              'Use the tool your lesson asks for, then return to the learning flow when you are ready.',
            )}
          </p>
        </div>
      </header>

      <nav className={styles.tabs} role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`${styles.tab} ${tab === item.id ? styles.tabActive : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {shouldShowLearnerElement(learnerVisibility.pmTools.contextualPurpose) ? (
        <section className={styles.contextCard} aria-live="polite">
          <strong>{toolGuide[tab].title}</strong>
          <p>{toolGuide[tab].body}</p>
        </section>
      ) : null}

      <div className={styles.content}>
        {tab === 'wbs' ? <WbsTool /> : null}
        {tab === 'gantt' ? <GanttChart /> : null}
        {tab === 'risk' ? <RiskRegister /> : null}
      </div>
    </div>
  );
}
