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

AFFECT_STATES = ["Flow", "Confusion", "Frustration", "Anxiety", "Boredom", "Neutral", "Unknown"]

MODEL_VERSION = "rule-v0.1"  # update to "rf-v1.0" when ML model deployed


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
            return {"state": "Unknown", "confidence": confidence,
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

        # Priority 1: Frustration
        if au20 > 0.55 and au23 > 0.55:
            conf = min(0.65 + ((au20 + au23 - 1.10) / 0.90) * 0.30, 0.95)
            return {"state": "Frustration", "confidence": conf,
                    "model_version": self._model_version}
        # Priority 2: Confusion
        if au4 > 0.60 and au12 < 0.35:
            conf = min(0.65 + ((au4 - 0.60) / 0.40) * 0.30, 0.95)
            return {"state": "Confusion", "confidence": conf,
                    "model_version": self._model_version}
        # Priority 3: Anxiety
        if au1 > 0.55 and au4 > 0.40:
            conf = min(0.65 + ((au1 + au4 - 0.95) / 1.05) * 0.30, 0.95)
            return {"state": "Anxiety", "confidence": conf,
                    "model_version": self._model_version}
        # Priority 4: Flow
        if au6 > 0.40 and au12 > 0.40 and au4 < 0.30:
            conf = min(0.65 + ((au6 + au12 - 0.80) / 1.20) * 0.30, 0.95)
            return {"state": "Flow", "confidence": conf,
                    "model_version": self._model_version}
        # Priority 5: Boredom
        au_max = max(au1, au4, au6, au12, au20, au23)
        if au_max < 0.25:
            return {"state": "Boredom", "confidence": 0.60,
                    "model_version": self._model_version}
        # Default: Neutral
        return {"state": "Neutral", "confidence": 0.65,
                "model_version": self._model_version}
