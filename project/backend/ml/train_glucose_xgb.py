#!/usr/bin/env python3
"""
Train XGBoost binary classifier for glucose direction (up vs not-up).

For OhioT1DM-style training, prepare a CSV with columns:
  carbs_g, glucose_mg_dl, insulin_units, meal_hour, trend_slope, trend_mean_delta,
  icr_g_per_unit, isf_mg_dl_per_unit, label_up (0/1)

Then run:
  python ml/train_glucose_xgb.py --csv path/to/ohio_features.csv

Without --csv, generates synthetic physiology-inspired data (development default).
"""
from __future__ import annotations

import argparse
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, roc_auc_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier


ROOT = Path(__file__).resolve().parents[1]
MODEL_OUT = ROOT / "ml_models" / "glucose_direction.joblib"


def synthetic_dataset(n: int = 12000, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    carbs = rng.uniform(0, 130, n)
    cg = rng.uniform(72, 280, n)
    ins = rng.uniform(0, 22, n)
    hour = rng.integers(0, 24, n)
    trend_slope = rng.uniform(-10, 10, n)
    icr = rng.uniform(8, 18, n)
    isf = rng.uniform(35, 65, n)
    trend_mean_delta = rng.normal(0, 12, n)

    carb_units = carbs / np.maximum(icr, 4)
    insulin_cover = ins
    net_units = carb_units - insulin_cover
    baseline = 0.15 * (cg - 125) / 40
    signal = net_units * (isf / 50.0) * 0.85 + 0.22 * trend_slope / 5.0 + baseline + trend_mean_delta * 0.02
    noise = rng.normal(0, 0.35, n)
    label_up = ((signal + noise) > 0.08).astype(np.int32)

    return pd.DataFrame(
        {
            "carbs_g": carbs,
            "glucose_mg_dl": cg,
            "insulin_units": ins,
            "meal_hour": hour,
            "trend_slope": trend_slope,
            "trend_mean_delta": trend_mean_delta,
            "icr_g_per_unit": icr,
            "isf_mg_dl_per_unit": isf,
            "label_up": label_up,
        }
    )


def load_csv(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    required = {
        "carbs_g",
        "glucose_mg_dl",
        "insulin_units",
        "meal_hour",
        "trend_slope",
        "trend_mean_delta",
        "icr_g_per_unit",
        "isf_mg_dl_per_unit",
        "label_up",
    }
    missing = required - set(df.columns)
    if missing:
        raise SystemExit(f"CSV missing columns: {missing}")
    return df


def add_cyclical_hour(df: pd.DataFrame) -> np.ndarray:
    h = (df["meal_hour"].astype(float).values % 24.0) * (2 * np.pi / 24)
    sin_h = np.sin(h)
    cos_h = np.cos(h)
    X = np.column_stack(
        [
            df["carbs_g"].values,
            df["glucose_mg_dl"].values,
            df["insulin_units"].values,
            sin_h,
            cos_h,
            df["trend_slope"].values,
            df["trend_mean_delta"].values,
            df["icr_g_per_unit"].values,
            df["isf_mg_dl_per_unit"].values,
        ]
    ).astype(np.float32)
    return X


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", type=str, default=None)
    ap.add_argument("--n-synthetic", type=int, default=12000)
    args = ap.parse_args()

    MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)

    df = load_csv(Path(args.csv)) if args.csv else synthetic_dataset(n=args.n_synthetic)
    X = add_cyclical_hour(df)
    y = df["label_up"].astype(int).values

    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    clf = XGBClassifier(
        n_estimators=180,
        max_depth=5,
        learning_rate=0.06,
        subsample=0.85,
        colsample_bytree=0.85,
        reg_lambda=1.2,
        random_state=42,
        eval_metric="logloss",
    )
    clf.fit(X_train, y_train)
    pred = clf.predict(X_val)
    proba = clf.predict_proba(X_val)[:, 1]
    acc = accuracy_score(y_val, pred)
    try:
        auc = roc_auc_score(y_val, proba)
    except ValueError:
        auc = float("nan")

    joblib.dump(clf, MODEL_OUT)
    print(f"Saved model to {MODEL_OUT}")
    print(f"Val accuracy: {acc:.4f}  ROC-AUC: {auc:.4f}")


if __name__ == "__main__":
    main()
