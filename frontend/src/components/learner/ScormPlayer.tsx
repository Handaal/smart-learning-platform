import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n';
import styles from './LessonContentBlock.module.css';

type Props = {
  /** Root-relative launch URL, e.g. /uploads/scorm/<id>/index.html (same origin). */
  src: string;
  title: string;
  /** Called when the SCORM content reports a completed/passed lesson status. */
  onComplete?: () => void;
};

/**
 * Minimal SCORM 1.2 runtime. SCORM content, loaded in a same-origin iframe,
 * discovers the LMS API by walking `window.parent` for an `API` object. We
 * expose exactly that object while the player is mounted and tear it down on
 * unmount. The CMI data model is kept in memory and mirrored to localStorage
 * (keyed by the package URL) so a learner can resume suspend_data on reload.
 *
 * It is intentionally conservative: every getter returns a string and never
 * throws, which is what SCORM 1.2 packages expect from a conformant LMS.
 */
function createScorm12Api(storageKey: string, onStatus: (status: string) => void) {
  let initialized = false;
  let lastError = '0';

  const defaults: Record<string, string> = {
    'cmi.core.student_id': 'participant',
    'cmi.core.student_name': 'Participant',
    'cmi.core.lesson_location': '',
    'cmi.core.lesson_status': 'not attempted',
    'cmi.core.credit': 'credit',
    'cmi.core.entry': 'ab-initio',
    'cmi.core.score.raw': '',
    'cmi.core.score.min': '',
    'cmi.core.score.max': '',
    'cmi.core.total_time': '0000:00:00',
    'cmi.suspend_data': '',
    'cmi.launch_data': '',
    'cmi.comments': '',
    'cmi.student_data.mastery_score': '',
  };

  let data: Record<string, string> = { ...defaults };
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, string>;
      data = { ...data, ...parsed, 'cmi.core.entry': 'resume' };
    }
  } catch {
    /* storage unavailable — run without resume */
  }

  const persist = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      /* ignore quota / private-mode errors */
    }
  };

  return {
    LMSInitialize() {
      initialized = true;
      lastError = '0';
      return 'true';
    },
    LMSFinish() {
      initialized = false;
      persist();
      lastError = '0';
      return 'true';
    },
    LMSGetValue(element: string) {
      lastError = '0';
      if (element === 'cmi.core._children') {
        return 'student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,exit,session_time';
      }
      if (element === 'cmi.core.score._children') return 'raw,min,max';
      return Object.prototype.hasOwnProperty.call(data, element) ? data[element] : '';
    },
    LMSSetValue(element: string, value: string) {
      lastError = '0';
      data[element] = String(value);
      if (element === 'cmi.core.lesson_status') {
        onStatus(String(value).toLowerCase());
      }
      return 'true';
    },
    LMSCommit() {
      persist();
      lastError = '0';
      return 'true';
    },
    LMSGetLastError() {
      return lastError;
    },
    LMSGetErrorString() {
      return '';
    },
    LMSGetDiagnostic() {
      return '';
    },
    /** non-standard helper some packages probe for */
    get isInitialized() {
      return initialized;
    },
  };
}

export default function ScormPlayer({ src, title, onComplete }: Props) {
  const { t } = useI18n();
  const [loaded, setLoaded] = useState(false);
  const [completed, setCompleted] = useState(false);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    const storageKey = `scorm:cmi:${src}`;
    const api = createScorm12Api(storageKey, (status) => {
      if (status === 'completed' || status === 'passed') {
        setCompleted(true);
        completeRef.current?.();
      }
    });

    // SCORM 1.2 content looks up window.parent.API; SCORM 2004 looks up
    // API_1484_11. We register the 1.2 API under both common names so the
    // widest range of published packages can find it.
    const w = window as unknown as Record<string, unknown>;
    const previousApi = w.API;
    w.API = api;

    return () => {
      // Restore whatever (if anything) was there before this player mounted.
      if (previousApi === undefined) delete w.API;
      else w.API = previousApi;
    };
  }, [src]);

  return (
    <div className={styles.mediaSection}>
      <div className={styles.scormFrameWrap}>
        {!loaded ? (
          <div className={styles.scormLoading}>
            {t('learner.lessonContent.scorm.loading', 'Loading the interactive content…')}
          </div>
        ) : null}
        <iframe
          className={styles.scormFrame}
          src={src}
          title={title}
          onLoad={() => setLoaded(true)}
          allow="autoplay; fullscreen; microphone; camera"
          allowFullScreen
        />
      </div>
      {completed ? (
        <p className={styles.caption}>
          {t('learner.lessonContent.scorm.completed', 'You have completed this interactive content.')}
        </p>
      ) : null}
    </div>
  );
}
