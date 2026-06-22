"""
Affect Classifier — ML pipeline (scikit-learn)

Phase 1 (v0.1): Rule-based (mirrors TypeScript AffectClassifier)
Phase 2 (v1.0): Train RandomForestClassifier on pilot study data
                Features: AU vector + behavioral signals
                Target:   AffectState label (annotated from pilot)
"""

import numpy as np
from typing import Dict, Any

# ── Rule-based classifier (v0.1) ─────────────────────────────
# Mirrors the TypeScript AffectClassifier logic for consistency.
# Swap _classify_rules for _classify_ml() once model is trained.

# Canonical state names — identical to the backend/frontend taxonomy
# (CanonicalEmotionState). Emitting these directly removes the fragile
# name-mapping layer that used to translate Flow/Anxiety/... back to canonical.
AFFECT_STATES = [
    "high_engagement",
    "confusion",
    "frustration",
    "test_anxiety",
    "boredom_disengagement",
    "neutral",
    "no_face_low_confidence",
]

MODEL_VERSION = "rule-v0.2"  # update to "rf-v1.0" when ML model deployed


class AffectClassifierML:
    def __init__(self):
        self._model = None   # placeholder for sklearn Pipeline
        self._model_version = MODEL_VERSION
        # Attempt to load trained model from disk
        self._try_load_model()

    def _try_load_model(self):
        """Load trained sklearn model if available."""
        import os, pickle
        model_path = os.path.join(os.path.dirname(__file__), "../models/affect_classifier.pkl")
        if os.path.exists(model_path):
            with open(model_path, "rb") as f:
                self._model = pickle.load(f)
            self._model_version = "rf-v1.0"

    def classify(self, au: Dict[str, float]) -> Dict[str, Any]:
        confidence = au.get("confidence", 0.0)

        if confidence < 0.50:
            return {"state": "no_face_low_confidence", "confidence": confidence,
                    "model_version": self._model_version}

        if self._model is not None:
            return self._classify_ml(au)
        return self._classify_rules(au)

    def _classify_ml(self, au: Dict[str, float]) -> Dict[str, Any]:
        features = np.array([[
            au["au1"], au["au4"], au["au6"],
            au["au12"], au["au20"], au["au23"],
        ]])
        proba = self._model.predict_proba(features)[0]
        idx   = int(np.argmax(proba))
        return {
            "state":         self._model.classes_[idx],
            "confidence":    float(proba[idx]),
            "model_version": self._model_version,
        }

    def _classify_rules(self, au: Dict[str, float]) -> Dict[str, Any]:
        au1, au4 = au["au1"], au["au4"]
        au6, au12 = au["au6"], au["au12"]
        au20, au23 = au["au20"], au["au23"]

        # AU values now arrive from the MediaPipe Face Landmarker pipeline as
        # *deviation from the participant's neutral baseline* (0..1), where the
        # 6 AUs map to real blendshapes:
        #   au1  = browInnerUp                       (inner brow raiser)
        #   au4  = mean(browDownLeft, browDownRight) (brow lowerer)
        #   au6  = mean(cheekSquintLeft/Right)       (cheek raiser)
        #   au12 = mean(mouthSmileLeft/Right)        (lip corner puller / smile)
        #   au20 = mean(mouthStretchLeft/Right)      (lip stretcher)
        #   au23 = mean(mouthPressLeft/Right)        (lip tightener)
        #
        # Active AUs typically land ~0.10–0.60 after baseline subtraction;
        # thresholds below are calibrated for that range and tuned live via the
        # researcher EmotionValidation panel.

        # Priority 1: Frustration — brow lowered + lips pressed/tight, not smiling
        if au4 > 0.18 and au23 > 0.12 and au12 < 0.20:
            conf = min(0.62 + (au4 + au23 - 0.30) * 0.6, 0.95)
            return {"state": "frustration", "confidence": round(conf, 3),
                    "model_version": self._model_version}
        # Priority 2: Confusion — brow activity (inner raise OR furrow), not
        # smiling, not pressing lips (which would be frustration)
        if (au1 > 0.12 or au4 > 0.12) and au12 < 0.22 and au23 < 0.15:
            conf = min(0.62 + (max(au1, au4) - 0.12) * 0.8, 0.95)
            return {"state": "confusion", "confidence": round(conf, 3),
                    "model_version": self._model_version}
        # Priority 3: Test anxiety — lip stretch + inner brow raise
        if au20 > 0.18 and au1 > 0.12:
            conf = min(0.62 + (au20 + au1 - 0.30) * 0.5, 0.95)
            return {"state": "test_anxiety", "confidence": round(conf, 3),
                    "model_version": self._model_version}
        # Priority 4: High engagement — a genuine smile (lip-corner pull),
        # not merely squinting (which raises cheek/au6)
        if au12 > 0.18:
            conf = min(0.62 + (au12 - 0.18) * 0.8, 0.95)
            return {"state": "high_engagement", "confidence": round(conf, 3),
                    "model_version": self._model_version}
        # Priority 5: Boredom — near-zero activation (blank, still face)
        au_max = max(au1, au4, au6, au12, au20, au23)
        if au_max < 0.08:
            return {"state": "boredom_disengagement", "confidence": 0.60,
                    "model_version": self._model_version}
        # Default: Neutral
        return {"state": "neutral", "confidence": 0.62,
                "model_version": self._model_version}
