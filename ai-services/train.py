"""
STEP AI Services — Affect Classifier Training Pipeline
======================================================
Usage:
  python train.py --input data/pilot_annotated.csv --output models/affect_classifier.pkl

Input CSV columns:
  session_id, learner_id, au1, au4, au6, au12, au20, au23,
  confidence, label   (label = AffectState string)

This script:
  1. Loads and validates the annotated pilot dataset
  2. Extracts AU feature vectors
  3. Trains a RandomForestClassifier with cross-validation
  4. Reports Balanced Accuracy + per-class F1
  5. Saves the trained sklearn Pipeline to models/affect_classifier.pkl

Phase 1 (v0.1): Rule-based classifier active
Phase 2 (v1.0): Run this script once pilot annotations are complete (~n≥30 per state)
"""

import argparse
import os
import pickle
import sys
import numpy as np
import pandas as pd
from sklearn.ensemble      import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline      import Pipeline
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.metrics       import (
    classification_report, balanced_accuracy_score, confusion_matrix
)

FEATURES = ['au1', 'au4', 'au6', 'au12', 'au20', 'au23']
LABELS   = ['Flow', 'Confusion', 'Frustration', 'Anxiety', 'Boredom', 'Neutral']
MIN_SAMPLES_PER_CLASS = 10


def load_data(path: str) -> tuple[np.ndarray, np.ndarray]:
    """Load annotated CSV and validate shape."""
    print(f"Loading data from: {path}")
    df = pd.read_csv(path)

    # Validate columns
    required = FEATURES + ['label', 'confidence']
    missing = [c for c in required if c not in df.columns]
    if missing:
        print(f"ERROR: Missing columns: {missing}")
        sys.exit(1)

    # Drop low-confidence rows
    df = df[df['confidence'] >= 0.50].copy()
    print(f"  Rows after confidence filter (>=0.50): {len(df)}")

    # Filter to known labels only
    df = df[df['label'].isin(LABELS)].copy()
    print(f"  Rows with valid labels: {len(df)}")

    # Check minimum class sizes
    counts = df['label'].value_counts()
    print("\nClass distribution:")
    for label in LABELS:
        n = counts.get(label, 0)
        status = "✓" if n >= MIN_SAMPLES_PER_CLASS else "⚠ LOW"
        print(f"  {label:<14} n={n:>3}  {status}")

    low = [l for l in LABELS if counts.get(l, 0) < MIN_SAMPLES_PER_CLASS]
    if low:
        print(f"\nWARNING: Low sample counts for: {low}")
        print("Consider collecting more annotations before training.")

    X = df[FEATURES].values.astype(np.float32)
    y = df['label'].values

    return X, y


def train(X: np.ndarray, y: np.ndarray) -> Pipeline:
    """Train RandomForest pipeline with cross-validation."""
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('clf', RandomForestClassifier(
            n_estimators=200,
            max_depth=None,
            min_samples_split=4,
            class_weight='balanced',
            random_state=42,
            n_jobs=-1,
        )),
    ])

    print("\nRunning 5-fold stratified cross-validation…")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_results = cross_validate(
        pipeline, X, y, cv=cv,
        scoring=['balanced_accuracy', 'f1_macro'],
        return_train_score=False,
    )

    print(f"  Balanced Accuracy : {np.mean(cv_results['test_balanced_accuracy']):.3f} "
          f"± {np.std(cv_results['test_balanced_accuracy']):.3f}")
    print(f"  F1 Macro          : {np.mean(cv_results['test_f1_macro']):.3f} "
          f"± {np.std(cv_results['test_f1_macro']):.3f}")

    # Final fit on all data
    print("\nFitting final model on full dataset…")
    pipeline.fit(X, y)

    # Full-data metrics (for sanity check)
    y_pred = pipeline.predict(X)
    print("\nClassification Report (train set):")
    print(classification_report(y, y_pred, labels=LABELS, zero_division=0))

    return pipeline


def save_model(pipeline: Pipeline, output_path: str) -> None:
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'wb') as f:
        pickle.dump(pipeline, f)
    print(f"\n✅ Model saved: {output_path}")


def compute_irr(csv_path: str) -> None:
    """
    Inter-Rater Reliability — Cohen's Kappa between two annotators.
    Expected columns: rater_a, rater_b
    """
    from sklearn.metrics import cohen_kappa_score
    df = pd.read_csv(csv_path)
    if 'rater_a' not in df.columns or 'rater_b' not in df.columns:
        print("IRR: requires 'rater_a' and 'rater_b' columns. Skipping.")
        return
    kappa = cohen_kappa_score(df['rater_a'], df['rater_b'])
    print(f"\nCohen's Kappa (Inter-Rater Reliability): {kappa:.3f}")
    if kappa >= 0.80:
        print("  → Excellent agreement (κ ≥ 0.80)")
    elif kappa >= 0.60:
        print("  → Substantial agreement (0.60 ≤ κ < 0.80)")
    else:
        print("  → Moderate or poor agreement — consider re-annotation")


def main():
    parser = argparse.ArgumentParser(description="STEP Affect Classifier Training")
    parser.add_argument('--input',  required=True, help='Path to annotated CSV file')
    parser.add_argument('--output', default='models/affect_classifier.pkl',
                        help='Output path for trained model')
    parser.add_argument('--irr',    nargs='?', const=True, default=False,
                        help='Compute Cohen\'s Kappa IRR (uses same input CSV)')
    args = parser.parse_args()

    X, y = load_data(args.input)

    if len(X) < 30:
        print(f"\nERROR: Only {len(X)} valid samples. Minimum 30 required for training.")
        sys.exit(1)

    if args.irr:
        compute_irr(args.input)

    pipeline = train(X, y)
    save_model(pipeline, args.output)


if __name__ == '__main__':
    main()
