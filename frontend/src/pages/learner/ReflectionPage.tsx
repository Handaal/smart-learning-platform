import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Brain, Check, CheckCircle2, Lightbulb, PenLine, Target } from 'lucide-react';
import { useI18n } from '@/i18n';
import { learnerVisibility, shouldShowLearnerElement } from '@/features/learnerVisibility';
import { reflectionApi, sessionApi } from '@/services/api';
import { USE_MOCK } from '@/services/mockData';
import StatusBadge, { type BadgeStatus } from '@/components/ui/StatusBadge';
import styles from './ReflectionPage.module.css';

function depthBadgeStatus(depth: string | undefined): BadgeStatus {
  if (depth === 'critical') return 'complete';
  if (depth === 'analytical') return 'warning';
  if (depth === 'descriptive') return 'neutral';
  return 'neutral';
}

type ModulePrompt = {
  id: string;
  text: string;
  tips: string[];
};

const LEGACY_MODULE_IDS = ['M1', 'M2', 'M3', 'M4', 'M5'] as const;

function buildResearchPrompt(moduleId: string) {
  return {
    id: `RP-${moduleId}`,
    text: `تأمل في أهم فكرة أو قرار تعلمته في هذه الوحدة، واشرح كيف يمكن أن تطبقه عمليًا قبل متابعة المسار.`,
    tips: [
      'اذكر موقفًا أو خطوة رئيسية بدت لك أكثر تأثيرًا في هذه الوحدة.',
      'فسّر لماذا كان هذا القرار أو الإجراء مهمًا داخل إدارة المشروع.',
      'اختم بتطبيق واحد واضح يمكنك استخدامه لاحقًا في مشروعك التعليمي.',
    ],
  };
}

export default function ReflectionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { t, tm } = useI18n();

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<{
    reflectionScore?: number;
    reflectionDepth?: string;
    autoFeedback?: { points?: string[] };
  } | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const { data: sessionData } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionApi.get(sessionId!),
    enabled: Boolean(sessionId) && !USE_MOCK,
  });

  const moduleId = USE_MOCK ? 'M1' : String((sessionData?.data as { moduleId?: string } | undefined)?.moduleId ?? 'M1');

  const promptMap = useMemo<Record<string, ModulePrompt>>(() => {
    const tipsByModule = tm<Record<string, string[]>>('learner.reflection.tipsByModule', {
      M1: [],
      M2: [],
      M3: [],
      M4: [],
      M5: [],
    });

    const legacyPrompts = LEGACY_MODULE_IDS.reduce<Record<string, ModulePrompt>>((accumulator, id) => {
      accumulator[id] = {
        id: `RP-${id}`,
        text: t(`learner.reflection.prompts.${id.toLowerCase()}`, ''),
        tips: tipsByModule[id] ?? [],
      };
      return accumulator;
    }, {});

    return legacyPrompts;
  }, [t, tm]);

  const promptConfig =
    promptMap[moduleId] ??
    (moduleId.startsWith('RC-U') ? buildResearchPrompt(moduleId) : promptMap['M1'] ?? buildResearchPrompt(moduleId));

  const depthGuide = useMemo(
    () => [
      {
        level: t('learner.reflection.depth.descriptive', 'Descriptive'),
        description: t('learner.reflection.depth.descriptiveDesc', 'What happened'),
        icon: BookOpen,
        color: 'var(--color-text-3)',
      },
      {
        level: t('learner.reflection.depth.analytical', 'Analytical'),
        description: t('learner.reflection.depth.analyticalDesc', 'Why it happened'),
        icon: Brain,
        color: 'var(--color-amber)',
      },
      {
        level: t('learner.reflection.depth.critical', 'Critical'),
        description: t('learner.reflection.depth.criticalDesc', 'What it means and what to change'),
        icon: Target,
        color: 'var(--color-success)',
      },
    ],
    [t],
  );

  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minWords = 150;
  const canSubmit = words >= minWords;
  const completionPct = Math.min(100, Math.round((words / minWords) * 100));

  async function handleSubmit() {
    if (!canSubmit || !sessionId) return;
    setBusy(true);
    try {
      if (USE_MOCK) {
        setFeedback({
          reflectionScore: 78,
          reflectionDepth: 'analytical',
          autoFeedback: {
            points: tm<string[]>('learner.reflection.mockFeedbackPoints', [
              'Good identification of key stakeholder concerns and power dynamics.',
              'Consider deepening your analysis of why certain communication strategies were more effective.',
              'Try connecting your experience to broader project-management communication frameworks.',
            ]),
          },
        });
        setDone(true);
        return;
      }

      const response = await reflectionApi.submit({
        sessionId,
        promptId: promptConfig.id,
        responseText: text,
      });
      setFeedback((response as { data?: typeof feedback }).data ?? null);
      setDone(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('learner.reflection.submissionFailed', 'Submission failed.');
      alert(message);
    } finally {
      setBusy(false);
    }
  }

  if (done && feedback) {
    return (
      <div className={styles.page}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>
            <CheckCircle2 size={40} />
          </div>
          <h2>{t('learner.reflection.submitted', 'Reflection submitted')}</h2>

          <div className={styles.scoreRow}>
            <div className={styles.scoreBadge}>
              <span className={styles.scoreNum}>{feedback.reflectionScore ?? '-'}</span>
              <span className={styles.scoreLabel}>{t('learner.reflection.score', '/ 100')}</span>
            </div>
            <StatusBadge
              status={depthBadgeStatus(feedback.reflectionDepth)}
              label={formatDepthLabel(feedback.reflectionDepth, t)}
            />
          </div>

          {feedback.autoFeedback?.points?.length ? (
            <div className={styles.feedbackPoints}>
              <h4 className={styles.feedbackTitle}>
                <Lightbulb size={16} />
                {t('learner.reflection.feedbackTitle', 'Helpful feedback')}
              </h4>
              {feedback.autoFeedback.points.map((point, index) => (
                <div key={`${point}-${index}`} className={styles.feedPoint}>
                  <span className={styles.feedIcon}><Check size={13} /></span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          ) : null}

          <button className="btn btn-primary" onClick={() => navigate('/modules')}>
            {t('learner.reflection.backModules', 'Back to modules')}
          </button>
          {shouldShowLearnerElement(learnerVisibility.reflection.completionSummary, { afterSubmission: true }) ? (
            <p className={styles.successNote}>
              {t('learner.reflection.nextStep', 'You can return to your learning path whenever you are ready.')}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <PenLine size={22} />
        </div>
        <div>
          <h1 className={styles.title}>{t('learner.reflection.title', 'Session Reflection')}</h1>
          <p className={styles.sub}>
            {t('learner.reflection.subtitle', 'Module {moduleId} - Write at least {minWords} words', {
              moduleId,
              minWords,
            })}
          </p>
        </div>
      </div>

      <button className={styles.tipsToggle} onClick={() => setShowGuide((current) => !current)} type="button">
        <Lightbulb size={14} />
        {showGuide
          ? t('learner.reflection.hideGuide', 'Hide reflection guide')
          : t('learner.reflection.showGuide', 'Show a quick reflection guide')}
      </button>

      {shouldShowLearnerElement(learnerVisibility.reflection.writingGuide, { isNeeded: showGuide }) ? (
        <div className={styles.depthGuide}>
          <span className={styles.depthLabel}>{t('learner.reflection.depthAim', 'Aim for depth:')}</span>
          {depthGuide.map(({ level, description, icon: Icon, color }) => (
            <div key={level} className={styles.depthItem}>
              <Icon size={13} style={{ color }} />
              <span style={{ fontWeight: 600, color }}>{level}</span>
              <span className={styles.depthDesc}>- {description}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className={styles.promptBox}>
        <p className={styles.promptText}>{promptConfig.text}</p>
      </div>

      <button className={styles.tipsToggle} onClick={() => setShowTips((current) => !current)}>
        <Lightbulb size={14} />
        {showTips ? t('learner.reflection.hideTips', 'Hide writing tips') : t('learner.reflection.showTips', 'Show writing tips')}
      </button>

      {showTips ? (
        <div className={styles.tipsBox}>
          {promptConfig.tips.map((tip, index) => (
            <div key={`${tip}-${index}`} className={styles.tipItem}>
              <span className={styles.tipNum}>{index + 1}</span>
              {tip}
            </div>
          ))}
        </div>
      ) : null}

      <div className={styles.editorArea}>
        <textarea
          className={`input textarea ${styles.editor}`}
          placeholder={t('learner.reflection.placeholder', 'Write your reflection here...')}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={12}
        />
        <div className={styles.wordCount}>
          <div className="progress-track" style={{ flex: 1, height: 4 }}>
            <div className="progress-fill" style={{ width: `${completionPct}%` }} />
          </div>
          <span
            style={{
              fontSize: '0.8125rem',
              color: canSubmit ? 'var(--color-success)' : 'var(--color-text-3)',
              whiteSpace: 'nowrap',
              fontWeight: 600,
            }}
          >
            {t('learner.reflection.words', '{words} / {min} words', { words, min: minWords })}
            {canSubmit ? ' \u2713' : ''}
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
          {t('learner.reflection.saveLater', 'Save for later')}
        </button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={!canSubmit || busy}>
          {busy ? t('learner.reflection.submitting', 'Submitting...') : t('learner.reflection.submit', 'Submit reflection')}
        </button>
      </div>
    </div>
  );
}

function formatDepthLabel(depth: string | undefined, t: (key: string, fallback?: string) => string) {
  if (depth === 'critical') return t('learner.reflection.depth.critical', 'Critical');
  if (depth === 'analytical') return t('learner.reflection.depth.analytical', 'Analytical');
  if (depth === 'descriptive') return t('learner.reflection.depth.descriptive', 'Descriptive');
  return depth ?? '-';
}
