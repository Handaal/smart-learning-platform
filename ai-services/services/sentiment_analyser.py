"""
Sentiment & Reflection Analyser
Combines VADER lexicon analysis with pattern matching for:
  - Valence / Arousal scoring
  - Reflection depth classification
  - Self-regulation language markers
  - IDPM competency concept detection
"""

import re
from typing import Any, Dict, List
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

MODEL_VERSION = "vader-rule-v0.1"

SELF_REG_PATTERNS = [
    (r"next time I (will|would|plan to)",       "plans future action"),
    (r"I (should|could) have",                   "retrospective appraisal"),
    (r"in future",                               "forward orientation"),
    (r"I (learned|realised|noticed|recognised)", "insight statement"),
    (r"to improve",                              "improvement intent"),
    (r"I will (try|apply|use|approach)",         "commitment to change"),
    (r"what I (can|could) do",                   "agency language"),
]

COMPETENCY_PATTERNS: Dict[str, List[str]] = {
    "scope management":          [r"scope", r"requirement", r"brief", r"stakeholder need"],
    "stakeholder communication": [r"stakeholder", r"email", r"SME", r"communication", r"escalat"],
    "planning & scheduling":     [r"plan", r"schedule", r"timeline", r"WBS", r"milestone", r"gantt"],
    "risk management":           [r"risk", r"mitigation", r"contingency", r"quality", r"issue"],
    "decision making":           [r"decision", r"choice", r"option", r"trade.?off", r"prioritis"],
}


class SentimentAnalyser:
    def __init__(self):
        self._vader = SentimentIntensityAnalyzer()

    def analyse(self, text: str) -> Dict[str, Any]:
        words = text.split()
        word_count = len(words)

        # ── Valence via VADER ─────────────────────────────────
        scores = self._vader.polarity_scores(text)
        valence = round(scores["compound"], 3)               # -1 to 1
        # Arousal proxy: absolute sum of pos/neg signals
        arousal = round(min(scores["pos"] + scores["neg"], 1.0), 3)

        # ── Self-regulation markers ───────────────────────────
        self_reg = []
        for pattern, label in SELF_REG_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                self_reg.append(label)

        # ── Competency concepts ───────────────────────────────
        concepts = []
        for concept, patterns in COMPETENCY_PATTERNS.items():
            if any(re.search(p, text, re.IGNORECASE) for p in patterns):
                concepts.append(concept)

        # ── Reflection depth ──────────────────────────────────
        depth = self._classify_depth(word_count, self_reg, concepts, text)

        # ── Composite score ───────────────────────────────────
        score = self._compute_score(word_count, self_reg, concepts, depth, valence)

        # ── Feedback points ───────────────────────────────────
        feedback = self._generate_feedback(self_reg, concepts, depth, valence)

        return {
            "valence":             valence,
            "arousal":             arousal,
            "reflection_depth":    depth,
            "self_reg_markers":    self_reg,
            "competency_concepts": concepts,
            "score":               score,
            "feedback_points":     feedback,
            "model_version":       MODEL_VERSION,
        }

    def _classify_depth(self, wc: int, self_reg: list, concepts: list, text: str) -> str:
        critical_signals = (
            wc >= 200
            and len(self_reg) >= 2
            and len(concepts) >= 2
            and bool(re.search(r"because|therefore|as a result|this means", text, re.I))
        )
        analytical_signals = (
            wc >= 120
            and (len(self_reg) >= 1 or len(concepts) >= 1)
        )
        if critical_signals:
            return "critical"
        if analytical_signals:
            return "analytical"
        return "surface"

    def _compute_score(self, wc: int, sr: list, concepts: list, depth: str, valence: float) -> float:
        score = (
            min(wc / 3, 33)                                  # length max 33
            + len(sr) * 8                                    # self-reg max ~24
            + len(concepts) * 6                              # concepts max ~18
            + (15 if depth == "critical" else 8 if depth == "analytical" else 0)
            + max(valence * 10, 0)                           # positive framing
        )
        return round(min(score, 100), 1)

    def _generate_feedback(self, sr: list, concepts: list, depth: str, valence: float) -> list:
        points = []
        if not sr:
            points.append("Consider: what will you do differently next time?")
        if not concepts:
            points.append("Try connecting your reflection to a specific IDPM skill.")
        if depth == "surface":
            points.append("Good foundation — push deeper on the 'why' behind what happened.")
        if valence < -0.3:
            points.append("Reflecting on difficulties is valuable. Also note: what did you do well?")
        if not points:
            points.append("Strong reflection — clear thinking and actionable self-awareness.")
        return points
