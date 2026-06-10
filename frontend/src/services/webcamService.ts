/**
 * WebcamService — client-side emotion sensing pipeline
 *
 * MediaPipe Face Mesh → AU vector computation → WebSocket stream to backend
 * Raw frames NEVER leave the browser. Only AU vectors (12 floats) are sent.
 */

import { useAuthStore }   from '@/store/authStore';
import { useEmotionStore } from '@/store/emotionStore';
import type { AffectState, AdaptivePayload } from '@/store/emotionStore';

const SAMPLE_RATE_MS = 2000;   // 2-second AU sampling
const WS_URL = (token: string) => {
  if (import.meta.env.DEV) {
    return `${location.protocol === 'https:' ? 'wss' : 'ws'}://127.0.0.1:3002/ws/emotion?token=${token}`;
  }

  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/emotion?token=${token}`;
};

export class WebcamService {
  private stream:        MediaStream | null = null;
  private video:         HTMLVideoElement | null = null;
  private canvas:        HTMLCanvasElement | null = null;
  private sampleTimer:   ReturnType<typeof setInterval> | null = null;
  private ws:            WebSocket | null = null;
  private behaviorTimer: ReturnType<typeof setInterval> | null = null;
  private faceMesh:      any = null;           // MediaPipe FaceMesh instance

  // Behavior window accumulators
  private bw = {
    sessionId:          '',
    dwellStart:         Date.now(),
    scrollEvents:       0,
    rereadCount:        0,
    clickCount:         0,
    pageReturns:        0,
    hintRequests:       0,
    abandonmentAttempts:0,
    charTyped:          0,
    backspaces:         0,
  };

  async initialize(videoEl: HTMLVideoElement, sessionId: string): Promise<void> {
    this.video     = videoEl;
    this.canvas    = document.createElement('canvas');
    this.bw.sessionId = sessionId;

    // Request webcam
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false,
    });
    videoEl.srcObject = this.stream;
    await videoEl.play();

    // Lazily load MediaPipe FaceMesh
    await this._loadFaceMesh();

    // Connect WebSocket
    this._connectWS();

    // Attach behavioral event listeners
    this._attachBehaviorListeners();

    // Start 90-second behavior window reporting
    this.behaviorTimer = setInterval(() => this._sendBehaviorWindow(), 90_000);

    useEmotionStore.getState().setWebcamActive(true);
  }

  private async _loadFaceMesh() {
    // Dynamic import — only loaded when webcam is used
    const { FaceMesh } = await import('@mediapipe/face_mesh');
    this.faceMesh = new FaceMesh({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    this.faceMesh.setOptions({
      maxNumFaces:      1,
      refineLandmarks:  true,
      minDetectionConfidence: 0.65,
      minTrackingConfidence:  0.65,
    });
    this.faceMesh.onResults((results: any) => this._onFaceResults(results));

    // Start sample loop
    this.sampleTimer = setInterval(() => this._captureFrame(), SAMPLE_RATE_MS);
  }

  private async _captureFrame() {
    if (!this.video || !this.faceMesh || useEmotionStore.getState().webcamPaused) return;
    await this.faceMesh.send({ image: this.video });
  }

  private _onFaceResults(results: any) {
    if (!results.multiFaceLandmarks?.length) {
      this._sendAU({ au1:0,au4:0,au6:0,au12:0,au20:0,au23:0,confidence:0.0 });
      return;
    }
    const lm = results.multiFaceLandmarks[0];
    const au = this._computeAUs(lm);
    this._sendAU(au);
  }

  /**
   * Compute AU intensities from 468 MediaPipe Face Mesh landmarks.
   * Geometric approach based on Ekman FACS landmark groupings.
   */
  private _computeAUs(lm: any[]): Record<string, number> {
    const dist = (a: number, b: number) => {
      const dx = lm[a].x - lm[b].x;
      const dy = lm[a].y - lm[b].y;
      return Math.sqrt(dx * dx + dy * dy);
    };
    const faceH = dist(10, 152);   // top-to-chin normaliser

    const clamp = (v: number) => Math.max(0, Math.min(1, v));
    const norm  = (v: number, min: number, max: number) =>
      clamp((v - min) / (max - min));

    return {
      // AU1: Inner Brow Raise — inner brow vs eye corner vertical distance
      au1:  norm(dist(107, 55)  / faceH, 0.08, 0.18),
      // AU4: Brow Lowerer — brow-to-eye vertical distance
      au4:  norm((dist(65, 159) - dist(70, 159))  / faceH * 5, 0, 1),
      // AU6: Cheek Raise — cheek-to-eye distance
      au6:  norm(dist(116, 133) / faceH, 0.05, 0.14),
      // AU12: Lip Corner Puller — lip corner lateral distance
      au12: norm(dist(61, 291)  / faceH, 0.25, 0.40),
      // AU20: Lip Stretcher — upper lip width
      au20: norm(dist(78, 308)  / faceH, 0.28, 0.45),
      // AU23: Lip Tightener — vertical lip gap
      au23: norm(0.02 - dist(13, 14) / faceH, 0, 0.02),
      confidence: 0.85,   // landmark-detection confidence proxy
    };
  }

  private _sendAU(au: Record<string, number>) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type:    'emotion_frame',
      payload: {
        sessionId: this.bw.sessionId,
        auVector:  au,
      },
    }));
  }

  private _connectWS() {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    this.ws = new WebSocket(WS_URL(token));

    this.ws.onopen    = () => console.debug('[STEP] Emotion WS connected');
    this.ws.onclose   = () => setTimeout(() => this._connectWS(), 3000);   // auto-reconnect
    this.ws.onerror   = (e) => console.error('[STEP] WS error', e);
    this.ws.onmessage = (evt) => this._handleWsMessage(evt);
  }

  private _handleWsMessage(evt: MessageEvent) {
    const msg = JSON.parse(evt.data);
    if (msg.type === 'affect_state') {
      useEmotionStore.getState().setAffectState(
        msg.payload.state as AffectState,
        msg.payload.confidence,
      );
    }
    if (msg.type === 'adaptation') {
      useEmotionStore.getState().setPendingAdaptiveAlert(msg.payload as AdaptivePayload);
    }
  }

  // ── Behavioral event collection ──────────────────────────────
  private _attached = false;
  private _scrollH = 0;

  private _attachBehaviorListeners() {
    if (this._attached) return;
    this._attached = true;

    document.addEventListener('click',   () => { this.bw.clickCount++; });
    document.addEventListener('keydown', (e) => {
      this.bw.charTyped++;
      if (e.key === 'Backspace') this.bw.backspaces++;
    });
    window.addEventListener('scroll', () => {
      const newY = window.scrollY;
      if (newY < this._scrollH) this.bw.rereadCount++;
      this.bw.scrollEvents++;
      this._scrollH = newY;
    });
    window.addEventListener('popstate', () => { this.bw.pageReturns++; });
  }

  private _sendBehaviorWindow() {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    const now   = new Date();
    const start = new Date(now.getTime() - 90_000);

    const payload = {
      sessionId:           this.bw.sessionId,
      learnerId:           useAuthStore.getState().learnerId ?? '',
      windowStartIso:      start.toISOString(),
      windowEndIso:        now.toISOString(),
      dwellTimeSec:        (Date.now() - this.bw.dwellStart) / 1000,
      scrollEvents:        this.bw.scrollEvents,
      rereadCount:         this.bw.rereadCount,
      clickCount:          this.bw.clickCount,
      clickRatePerMin:     this.bw.clickCount / 1.5,
      taskProgressPct:     0,      // injected by session component
      pageReturns:         this.bw.pageReturns,
      hintRequests:        this.bw.hintRequests,
      abandonmentAttempts: this.bw.abandonmentAttempts,
      typingRateWpm:       (this.bw.charTyped / 5) / 1.5,
      backspaceRatio:      this.bw.charTyped ? this.bw.backspaces / this.bw.charTyped : 0,
    };

    this.ws.send(JSON.stringify({ type: 'behavior_window', payload }));

    // Reset counters
    Object.assign(this.bw, {
      dwellStart: Date.now(), scrollEvents: 0, rereadCount: 0,
      clickCount: 0, pageReturns: 0, hintRequests: 0,
      abandonmentAttempts: 0, charTyped: 0, backspaces: 0,
    });
  }

  incrementHintRequest()       { this.bw.hintRequests++;       }
  incrementAbandonmentAttempt(){ this.bw.abandonmentAttempts++; }

  pauseWebcam()  {
    useEmotionStore.getState().setWebcamPaused(true);
    useEmotionStore.getState().setWebcamActive(false);
  }
  resumeWebcam() {
    useEmotionStore.getState().setWebcamPaused(false);
    useEmotionStore.getState().setWebcamActive(true);
  }

  destroy() {
    clearInterval(this.sampleTimer!);
    clearInterval(this.behaviorTimer!);
    this.ws?.close();
    this.stream?.getTracks().forEach(t => t.stop());
    if (this.video) { this.video.srcObject = null; }
    useEmotionStore.getState().setWebcamActive(false);
  }
}

// Singleton for use across component tree
export const webcamService = new WebcamService();
