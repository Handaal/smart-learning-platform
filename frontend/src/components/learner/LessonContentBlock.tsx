import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
import { useI18n } from '@/i18n';
import { learnerVisibility, shouldShowLearnerElement } from '@/features/learnerVisibility';
import type { LearnerStepRuntimeState } from './lessonFlow';
import styles from './LessonContentBlock.module.css';

export type LessonContentElement = {
  id: string;
  contentType: 'TEXT' | 'VISUAL' | 'VIDEO' | 'ASSESSMENT';
  adaptiveTag?: string | null;
  scaffoldLevel: number;
  isEnrichment: boolean;
  sequenceOrder: number;
  contentData: Record<string, unknown>;
};

type Props = {
  element: LessonContentElement;
  variant?: 'base' | 'adaptive';
  onComplete?: (elementId: string) => void;
  onStateChange?: (state: LearnerStepRuntimeState) => void;
};

function asText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getLocalizedAssistiveCopy(
  contentData: Record<string, unknown>,
  t: ReturnType<typeof useI18n>['t'],
) {
  const candidates = [
    ['note', 'noteKey'],
    ['pausePrompt', 'pausePromptKey'],
    ['hint', 'hintKey'],
    ['description', 'descriptionKey'],
  ] as const;

  for (const [valueField, keyField] of candidates) {
    const value = asText(contentData[valueField]);
    const translationKey = asText(contentData[keyField]);
    if (translationKey || value) {
      return translationKey ? t(translationKey, value) : value;
    }
  }

  return '';
}

function getGoogleDriveFileId(url: string) {
  if (!url) return null;

  const fileMatch = url.match(/\/file\/d\/([^/]+)/i);
  if (fileMatch?.[1]) return fileMatch[1];

  const idMatch = url.match(/[?&]id=([^&]+)/i);
  if (idMatch?.[1]) return idMatch[1];

  return null;
}

function getVisualRenderMode(contentData: Record<string, unknown>, url: string, title: string) {
  const declaredMode = asText(contentData.renderMode).toLowerCase();
  if (declaredMode === 'document') return 'document' as const;
  if (declaredMode === 'image') return 'image' as const;

  const normalizedUrl = url.toLowerCase();
  const normalizedTitle = title.toLowerCase();
  if (
    normalizedUrl.endsWith('.pdf') ||
    normalizedUrl.includes('/preview') ||
    normalizedTitle.includes('pdf') ||
    normalizedTitle.includes('document')
  ) {
    return 'document' as const;
  }

  return 'image' as const;
}

function getRenderableAssetUrl(url: string, renderMode: 'image' | 'document') {
  if (!url) return '';

  const driveFileId = getGoogleDriveFileId(url);
  if (driveFileId) {
    if (renderMode === 'document') {
      return `https://drive.google.com/file/d/${driveFileId}/preview`;
    }
    return `https://drive.google.com/uc?export=view&id=${driveFileId}`;
  }

  return url;
}

function getEmbedUrl(url: string) {
  if (!url) return null;
  if (url.includes('youtube.com/watch?v=')) {
    const videoId = url.split('v=')[1]?.split('&')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }
  return null;
}

export default function LessonContentBlock({ element, variant = 'base', onComplete, onStateChange }: Props) {
  const { t } = useI18n();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textResponse, setTextResponse] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const title =
    asText(element.contentData.title) ||
    `${t('learner.lessonContent.labels.lessonStep', 'Lesson step')} ${element.sequenceOrder}`;
  const body =
    asText(element.contentData.text) ||
    asText(element.contentData.caption) ||
    asText(element.contentData.transcript) ||
    asText(element.contentData.prompt);
  const note = getLocalizedAssistiveCopy(element.contentData, t);
  const url = asText(element.contentData.url) || asText(element.contentData.resourceUrl);
  const visualRenderMode =
    element.contentType === 'VISUAL' ? getVisualRenderMode(element.contentData, url, title) : 'image';
  const renderedAssetUrl =
    element.contentType === 'VISUAL' ? getRenderableAssetUrl(url, visualRenderMode) : url;
  const question = asText(element.contentData.question) || title;
  const options = useMemo(
    () =>
      Array.isArray(element.contentData.options)
        ? element.contentData.options.filter((item): item is string => typeof item === 'string')
        : [],
    [element.contentData.options],
  );

  const embedUrl = getEmbedUrl(url);
  const isVideoFile = /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
  const isPracticeStep = element.contentType === 'ASSESSMENT';
  const passiveStepReady = !isPracticeStep;
  const isAdaptiveSupport = variant === 'adaptive';
  const adaptiveVisibility = isAdaptiveSupport ? (element.isEnrichment ? 'recommended' : 'required') : 'none';
  const responseTooShort = !options.length && textResponse.trim().length < 10;
  const practiceReadyToSubmit = options.length ? Boolean(selectedOption) : !responseTooShort;
  const learnerLead =
    variant === 'adaptive'
      ? element.isEnrichment
        ? t('learner.lessonContent.stepLead.challenge', 'Optional extra step')
        : t('learner.lessonContent.stepLead.support', 'A short support step')
      : null;
  const showInstructionalNote = shouldShowLearnerElement(learnerVisibility.content.instructionalNote, {
    isNeeded: Boolean(note),
  });

  useEffect(() => {
    setSelectedOption(null);
    setTextResponse('');
    setSubmitted(false);
  }, [element.id]);

  useEffect(() => {
    if (!onStateChange) return;

    if (isPracticeStep && submitted) {
      onStateChange({
        presentation: isAdaptiveSupport ? 'adaptive_support' : 'practice',
        status: 'completed',
        statusLabel: t('learner.lessonContent.flow.completedStatus', 'Ready to continue'),
        canContinue: true,
        blockingReason: null,
        nextActionLabel: t('learner.lessonContent.flow.nextAction.continue', 'Continue to next step'),
          nextActionHint: isAdaptiveSupport
            ? t(
              'learner.lessonContent.flow.completedSupportHint',
              'This short support step is complete. You can return to the lesson now.',
            )
          : t(
              'learner.lessonContent.flow.completedHint',
              'This step is complete. Continue when you are ready for the next part.',
            ),
        nextActionKind: isAdaptiveSupport ? 'return_to_main_path' : 'continue',
        supportVisibility: adaptiveVisibility,
      });
      return;
    }

    if (isPracticeStep) {
      onStateChange({
        presentation: isAdaptiveSupport ? 'adaptive_support' : 'practice',
        status: 'blocked',
        statusLabel: t('learner.lessonContent.flow.practiceStatus', 'Practice response required'),
        canContinue: false,
        blockingReason: options.length
          ? selectedOption
            ? t('learner.lessonContent.flow.practiceNeedSubmit', 'Submit your selected answer before you continue.')
            : t('learner.lessonContent.flow.practiceNeedChoice', 'Choose one answer, then submit it to continue.')
          : responseTooShort
            ? t('learner.lessonContent.flow.practiceNeedText', 'Write a short response before submitting this activity.')
            : t('learner.lessonContent.flow.practiceNeedSubmit', 'Submit your selected answer before you continue.'),
        nextActionLabel: t('learner.lessonContent.flow.nextAction.submit', 'Submit response'),
        nextActionHint: isAdaptiveSupport
          ? t(
              'learner.lessonContent.flow.practiceSupportHint',
              'Complete this short support activity first, then return to the lesson.',
            )
          : t(
              'learner.lessonContent.flow.practiceHint',
              'Complete this response first, then the next part will open clearly.',
            ),
        nextActionKind: 'submit_answer',
        supportVisibility: adaptiveVisibility,
      });
      return;
    }

    if (passiveStepReady) {
      onStateChange({
        presentation: isAdaptiveSupport ? 'adaptive_support' : 'content',
        status: 'ready',
        statusLabel: isAdaptiveSupport
          ? t('learner.lessonContent.flow.supportReviewedStatus', 'Support step reviewed')
          : t('learner.lessonContent.flow.readyAfterReviewStatus', 'Ready to continue'),
        canContinue: true,
        blockingReason: null,
        nextActionLabel: isAdaptiveSupport
          ? t('learner.lessonContent.flow.nextAction.returnToLesson', 'Continue with the lesson')
          : t('learner.lessonContent.flow.nextAction.continue', 'Continue to next step'),
        nextActionHint: isAdaptiveSupport
          ? t(
              'learner.lessonContent.flow.supportReviewedHint',
              'You reviewed this support step. Continue to return to the lesson.',
            )
          : t(
              'learner.lessonContent.flow.reviewReadyHint',
              'You reviewed this step. Continue whenever you are ready for the next part.',
            ),
        nextActionKind: isAdaptiveSupport ? 'return_to_main_path' : 'continue',
        supportVisibility: adaptiveVisibility,
      });
      return;
    }

    onStateChange({
      presentation: isAdaptiveSupport ? 'adaptive_support' : 'content',
      status: isAdaptiveSupport ? 'support_required' : 'blocked',
      statusLabel: isAdaptiveSupport
        ? t('learner.lessonContent.flow.supportReviewStatus', 'Review this support step')
        : element.contentType === 'VIDEO'
          ? t('learner.lessonContent.flow.videoStatus', 'Watch this step')
          : element.contentType === 'VISUAL' && visualRenderMode === 'document'
            ? t('learner.lessonContent.flow.documentStatus', 'Review this document')
            : element.contentType === 'VISUAL'
              ? t('learner.lessonContent.flow.visualStatus', 'Review this visual')
              : t('learner.lessonContent.flow.contentStatus', 'Read this step'),
      canContinue: false,
      blockingReason: isAdaptiveSupport
        ? t(
            'learner.lessonContent.flow.supportBlockingReason',
            'Review this short support step first. The lesson will continue automatically when you are done.',
          )
        : t(
            'learner.lessonContent.flow.contentBlockingReason',
            'Spend a moment with this step first. The next part becomes available automatically after review.',
          ),
      nextActionLabel: t('learner.lessonContent.flow.nextAction.continue', 'Continue to next step'),
      nextActionHint: isAdaptiveSupport
        ? t(
            'learner.lessonContent.flow.supportHint',
            'This short support step is here to make the next part easier. Review it, then continue.',
          )
        : t(
            'learner.lessonContent.flow.contentHint',
            'Read, view, or watch this step first. The continue action will become available automatically.',
          ),
      nextActionKind: 'continue',
      supportVisibility: adaptiveVisibility,
    });
  }, [
    adaptiveVisibility,
    element.contentType,
    isAdaptiveSupport,
    isPracticeStep,
    passiveStepReady,
    onStateChange,
    options.length,
    responseTooShort,
    selectedOption,
    submitted,
    t,
    textResponse,
    visualRenderMode,
  ]);

  function markComplete() {
    setSubmitted(true);
    onComplete?.(element.id);
  }

  return (
    <article className={`${styles.block} ${variant === 'adaptive' ? styles.adaptiveBlock : ''}`}>
      <header className={styles.header}>
        <div className={styles.heading}>
          {learnerLead ? <span className={styles.leadBadge}>{learnerLead}</span> : null}
          <h3 className={styles.title}>{title}</h3>
        </div>
      </header>

      {element.contentType === 'TEXT' ? (
        <div className={styles.body}>
          {body
            .split(/\n{2,}/)
            .filter(Boolean)
            .map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
        </div>
      ) : null}

      {element.contentType === 'VISUAL' ? (
        <div className={styles.mediaSection}>
          {renderedAssetUrl ? (
            visualRenderMode === 'document' ? (
              <iframe
                className={styles.documentFrame}
                src={renderedAssetUrl}
                title={title}
                loading="lazy"
              />
            ) : (
              <img className={styles.image} src={renderedAssetUrl} alt={title} loading="lazy" />
            )
          ) : (
            <div className={styles.placeholder}>
              {visualRenderMode === 'document'
                ? t(
                    'learner.lessonContent.placeholders.noDocument',
                    'No document has been added for this element yet.',
                  )
                : t(
                    'learner.lessonContent.placeholders.noImage',
                    'No image has been added for this element yet.',
                  )}
            </div>
          )}
          {body ? <p className={styles.caption}>{body}</p> : null}
        </div>
      ) : null}

      {element.contentType === 'VIDEO' ? (
        <div className={styles.mediaSection}>
          {isVideoFile ? (
            <video className={styles.video} controls src={url} />
          ) : embedUrl ? (
            <iframe className={styles.videoFrame} src={embedUrl} title={title} allowFullScreen />
          ) : (
            <div className={styles.placeholder}>
              {url ? (
                <a href={url} target="_blank" rel="noreferrer">
                  {t('learner.lessonContent.placeholders.openVideo', 'Open the video resource in a new tab')}
                </a>
              ) : (
                t('learner.lessonContent.placeholders.noVideo', 'No valid video link has been configured for this element yet.')
              )}
            </div>
          )}
          {body ? <p className={styles.caption}>{body}</p> : null}
        </div>
      ) : null}

      {element.contentType === 'ASSESSMENT' ? (
        <div className={styles.assessmentCard}>
          <div className={styles.assessmentIntro}>
            <span className={styles.assessmentLabel}>{t('learner.lessonContent.labels.inLessonActivity', 'In-lesson activity')}</span>
            <p className={styles.question}>{question}</p>
          </div>

          {options.length ? (
            <div className={styles.options}>
              {options.map((option) => (
                <button
                  key={option}
                  className={`${styles.optionButton} ${selectedOption === option ? styles.optionButtonActive : ''}`}
                  onClick={() => setSelectedOption(option)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              className={styles.responseBox}
              value={textResponse}
              onChange={(event) => setTextResponse(event.target.value)}
              placeholder={t('learner.lessonContent.placeholders.textAnswer', 'Write your decision, analysis, or reflection here.')}
            />
          )}

          <div className={styles.assessmentActions}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={markComplete}
              disabled={submitted || !practiceReadyToSubmit}
            >
              {submitted ? (
                <>
                  <CheckCircle2 size={14} />
                  {t('learner.lessonContent.actions.answerSaved', 'Answer saved')}
                </>
              ) : (
                t('learner.lessonContent.actions.confirmAnswer', 'Confirm answer')
              )}
            </button>

            {submitted ? (
              <span className={styles.successPill}>
                <Sparkles size={12} />
                {t('learner.lessonContent.actions.activitySaved', 'This activity has been added to your current progress.')}
              </span>
            ) : (
              <span className={styles.helperText}>
                {options.length
                  ? t('learner.lessonContent.flow.practiceHelperChoice', 'Choose one answer and submit it before continuing.')
                  : t('learner.lessonContent.flow.practiceHelperText', 'Write a short response, then submit it to unlock the next step.')}
              </span>
            )}
          </div>
        </div>
      ) : null}

      {element.contentType !== 'ASSESSMENT' ? (
        passiveStepReady && isAdaptiveSupport ? (
          <div className={styles.completionArea}>
            <span className={styles.successPill}>
              <Sparkles size={12} />
              {t(
                'learner.lessonContent.actions.supportCompleted',
                'You reviewed this support step. You can continue now.',
              )}
            </span>
          </div>
        ) : null
      ) : null}

      {note && showInstructionalNote ? (
        <footer className={styles.noteBox}>
          <Lightbulb size={14} />
          <span>{note}</span>
        </footer>
      ) : null}
    </article>
  );
}
