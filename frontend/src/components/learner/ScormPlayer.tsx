import { useEffect, useRef, useState } from 'react';
import { scormApi, type ScormResumeData } from '@/services/api';
import { useI18n } from '@/i18n';
import styles from './LessonContentBlock.module.css';

type Props = {
  /** Root-relative launch URL, e.g. /uploads/scorm/<id>/index.html (same origin). */
  src: string;
  title: string;
  /** LearningContent id of this SCORM block (used as the progress key). */
  contentId: string;
  /** Current session id. When present, progress is persisted to the backend. */
  sessionId?: string;
  /** Extracted package id (stored alongside the progress row). */
  scormId?: string;
  /** Called when the SCORM content reports a completed/passed lesson status. */
  onComplete?: () => void;
};

type Scorm12Api = {
  LMSInitialize(): string;
  LMSFinish(): string;
  LMSGetValue(element: string): string;
  LMSSetValue(element: string, value: string): string;
  LMSCommit(): string;
  LMSGetLastError(): string;
  LMSGetErrorString(): string;
  LMSGetDiagnostic(): string;
  getData(): Record<string, string>;
};

/**
 * Minimal SCORM 1.2 runtime. SCORM content, loaded in a same-origin iframe,
 * discovers the LMS API by walking `window.parent` for an `API` object. We
 * expose exactly that object while the player is mounted and tear it down on
 * unmount. The CMI data model is kept in memory, mirrored to localStorage, and
 * — when a session id is present — committed to the backend so completion,
 * score and time are persisted per participant and can resume cross-device.
 *
 * It is intentionally conservative: every getter returns a string and never
 * throws, which is what SCORM 1.2 packages expect from a conformant LMS.
 */
function createScorm12Api(options: {
  storageKey: string;
  seed: ScormResumeData;
  onStatus: (status: string) => void;
  onCommit: (data: Record<string, string>, final: boolean) => void;
}): Scorm12Api {
  const { storageKey, seed, onStatus, onCommit } = options;
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
    'cmi.core.lesson_mode': 'normal',
    'cmi.core.exit': '',
    'cmi.core.session_time': '00:00:00',
    'cmi.suspend_data': '',
    'cmi.launch_data': '',
    'cmi.comments': '',
    'cmi.student_data.mastery_score': '',
  };

  let data: Record<string, string> = { ...defaults };

  // 1) Resume from localStorage (same-device fallback).
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, string>;
      data = { ...data, ...parsed, 'cmi.core.entry': 'resume' };
    }
  } catch {
    /* storage unavailable — run without local resume */
  }

  // 2) Server-side resume wins (cross-device): seed the opaque suspend_data,
  //    location and status the backend holds for this participant.
  if (seed) {
    if (seed.suspendData != null) data['cmi.suspend_data'] = seed.suspendData;
    if (seed.lessonLocation != null) data['cmi.core.lesson_location'] = seed.lessonLocation;
    if (seed.lessonStatus) data['cmi.core.lesson_status'] = seed.lessonStatus;
    if (seed.suspendData || seed.lessonLocation) data['cmi.core.entry'] = 'resume';
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
      onCommit(data, true);
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
      onCommit(data, false);
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
    getData() {
      return { ...data };
    },
  };
}

export default function ScormPlayer({ src, title, contentId, sessionId, scormId, onComplete }: Props) {
  const { t } = useI18n();
  const [apiReady, setApiReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [completed, setCompleted] = useState(false);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const w = window as unknown as Record<string, unknown>;
    const previousApi = w.API;
    let apiInstance: Scorm12Api | null = null;

    const sendCommit = (data: Record<string, string>) => {
      if (!sessionId) return; // no backend persistence without a real session
      scormApi.commit({ sessionId, contentId, scormId, cmi: data }).catch(() => {
        /* progress is best-effort; a failed commit must never break playback */
      });
    };

    const onCommit = (data: Record<string, string>, final: boolean) => {
      if (final) {
        if (debounceTimer) clearTimeout(debounceTimer);
        sendCommit({ ...data });
        return;
      }
      // Rise commits frequently; debounce so we persist at most ~1/1.5s.
      if (debounceTimer) clearTimeout(debounceTimer);
      const snapshot = { ...data };
      debounceTimer = setTimeout(() => sendCommit(snapshot), 1500);
    };

    (async () => {
      let seed: ScormResumeData = null;
      if (sessionId) {
        seed = await scormApi
          .getProgress(sessionId, contentId)
          .then((r) => r.data)
          .catch(() => null);
      }
      if (cancelled) return;

      apiInstance = createScorm12Api({
        storageKey: `scorm:cmi:${src}`,
        seed,
        onStatus: (status) => {
          if (status === 'completed' || status === 'passed') {
            setCompleted(true);
            completeRef.current?.();
          }
        },
        onCommit,
      });

      // The SCORM API MUST exist on window before the iframe is inserted. Rise
      // (loadOnlyInLms: true) runs findAPI() the moment its bundle executes; the
      // <iframe> below is gated on `apiReady` so it only mounts once the API is
      // reachable at window.parent.API.
      w.API = apiInstance;
      setApiReady(true);
    })();

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      // Flush a final snapshot on unmount (SPA navigation keeps the fetch alive).
      if (apiInstance) sendCommit(apiInstance.getData());
      setApiReady(false);
      if (previousApi === undefined) delete w.API;
      else w.API = previousApi;
    };
  }, [src, sessionId, contentId, scormId]);

  return (
    <div className={styles.mediaSection}>
      <div className={styles.scormFrameWrap}>
        {!loaded ? (
          <div className={styles.scormLoading}>
            {t('learner.lessonContent.scorm.loading', 'Loading the interactive content…')}
          </div>
        ) : null}
        {apiReady ? (
          <iframe
            className={styles.scormFrame}
            src={src}
            title={title}
            onLoad={() => setLoaded(true)}
            allow="autoplay; fullscreen; microphone; camera"
            allowFullScreen
          />
        ) : null}
      </div>
      {completed ? (
        <p className={styles.caption}>
          {t('learner.lessonContent.scorm.completed', 'You have completed this interactive content.')}
        </p>
      ) : null}
    </div>
  );
}
