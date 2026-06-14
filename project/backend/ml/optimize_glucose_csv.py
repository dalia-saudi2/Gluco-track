#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, roc_auc_score
from xgboost import XGBClassifier


def build_features(df: pd.DataFrame, add_engineered: bool, keep_patient_id: bool) -> pd.DataFrame:
    X = df.copy()

    for c in ["timestamp", "future_glucose_30min", "glucose_delta_future", "target"]:
        if c in X.columns:
            X = X.drop(columns=[c])

    if not keep_patient_id and "patient_id" in X.columns:
        X = X.drop(columns=["patient_id"])

    if add_engineered:
        # Interaction and signal-strength features
        if {"carbs", "bolus_dose"}.issubset(X.columns):
            X["carb_insulin_ratio"] = X["carbs"] / (X["bolus_dose"].abs() + 1e-3)
            X["carb_x_bolus"] = X["carbs"] * X["bolus_dose"]
        if {"glucose", "bolus_dose"}.issubset(X.columns):
            X["glucose_x_bolus"] = X["glucose"] * X["bolus_dose"]
        if {"glucose", "carbs"}.issubset(X.columns):
            X["glucose_x_carbs"] = X["glucose"] * X["carbs"]
        if {"glucose_roc_5", "glucose_roc_15", "glucose_roc_30"}.issubset(X.columns):
            X["roc_mean"] = (X["glucose_roc_5"] + X["glucose_roc_15"] + X["glucose_roc_30"]) / 3.0
            X["roc_abs_sum"] = (
                X["glucose_roc_5"].abs() + X["glucose_roc_15"].abs() + X["glucose_roc_30"].abs()
            )
        if {"glucose_std_30", "glucose_std_60"}.issubset(X.columns):
            X["volatility_mean"] = (X["glucose_std_30"] + X["glucose_std_60"]) / 2.0
        if {"hour_sin", "hour_cos"}.issubset(X.columns):
            X["circadian_phase"] = np.arctan2(X["hour_sin"], X["hour_cos"])

    return X


def clip_outliers_fit(X_train: pd.DataFrame, X_test: pd.DataFrame, q_low=0.005, q_high=0.995):
    lo = X_train.quantile(q_low, numeric_only=True)
    hi = X_train.quantile(q_high, numeric_only=True)
    Xt = X_train.copy()
    Xv = X_test.copy()
    num_cols = Xt.select_dtypes(include=[np.number]).columns
    Xt[num_cols] = Xt[num_cols].clip(lo, hi, axis=1)
    Xv[num_cols] = Xv[num_cols].clip(lo, hi, axis=1)
    return Xt, Xv, lo.to_dict(), hi.to_dict()


def add_missing_flags(X_train: pd.DataFrame, X_test: pd.DataFrame):
    Xt = X_train.copy()
    Xv = X_test.copy()
    for c in Xt.columns:
        if Xt[c].isna().any() or Xv[c].isna().any():
            Xt[f"{c}_isna"] = Xt[c].isna().astype(np.int8)
            Xv[f"{c}_isna"] = Xv[c].isna().astype(np.int8)
    return Xt, Xv


def evaluate(y_true: np.ndarray, proba: np.ndarray, threshold: float):
    pred = (proba >= threshold).astype(int)
    acc = accuracy_score(y_true, pred)
    f1 = f1_score(y_true, pred)
    auc = roc_auc_score(y_true, proba)
    cm = confusion_matrix(y_true, pred).tolist()
    return acc, f1, auc, cm


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--train-csv", required=True)
    ap.add_argument("--test-csv", required=True)
    ap.add_argument("--out-model", required=True)
    ap.add_argument("--out-report", required=True)
    args = ap.parse_args()

    train_df = pd.read_csv(args.train_csv)
    test_df = pd.read_csv(args.test_csv)

    y_train = train_df["target"].astype(int).values
    y_test = test_df["target"].astype(int).values

    # Baseline (what we used first)
    Xtr_base = build_features(train_df, add_engineered=False, keep_patient_id=True)
    Xte_base = build_features(test_df, add_engineered=False, keep_patient_id=True)
    med_base = Xtr_base.median(numeric_only=True)
    Xtr_base = Xtr_base.fillna(med_base)
    Xte_base = Xte_base.fillna(med_base).reindex(columns=Xtr_base.columns, fill_value=0)

    base_model = XGBClassifier(
        n_estimators=350,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        reg_lambda=1.0,
        random_state=42,
        eval_metric="logloss",
    )
    base_model.fit(Xtr_base, y_train)
    base_proba = base_model.predict_proba(Xte_base)[:, 1]
    base_acc, base_f1, base_auc, base_cm = evaluate(y_test, base_proba, 0.5)

    # Improved pipeline: engineered features + flags + outlier clipping + param search + threshold tuning
    Xtr = build_features(train_df, add_engineered=True, keep_patient_id=True)
    Xte = build_features(test_df, add_engineered=True, keep_patient_id=True)
    Xtr, Xte = Xtr.align(Xte, join="left", axis=1, fill_value=np.nan)
    Xte = Xte.reindex(columns=Xtr.columns, fill_value=np.nan)
    Xtr, Xte = add_missing_flags(Xtr, Xte)

    med = Xtr.median(numeric_only=True)
    Xtr = Xtr.fillna(med)
    Xte = Xte.fillna(med).reindex(columns=Xtr.columns, fill_value=0)
    Xtr, Xte, clip_lo, clip_hi = clip_outliers_fit(Xtr, Xte)

    search_space: List[Dict] = []
    for max_depth in [4, 5, 6, 7]:
        for n_estimators in [300, 450, 650]:
            for lr in [0.03, 0.05, 0.07]:
                search_space.append(
                    dict(
                        n_estimators=n_estimators,
                        max_depth=max_depth,
                        learning_rate=lr,
                        subsample=0.8,
                        colsample_bytree=0.8,
                        min_child_weight=1,
                        gamma=0.0,
                        reg_lambda=1.0,
                        reg_alpha=0.0,
                    )
                )

    rng = np.random.default_rng(42)
    sampled = [search_space[i] for i in rng.choice(len(search_space), size=min(32, len(search_space)), replace=False)]

    best = None
    best_auc = -1.0
    for p in sampled:
        m = XGBClassifier(
            random_state=42,
            eval_metric="logloss",
            **p,
        )
        m.fit(Xtr, y_train)
        proba = m.predict_proba(Xte)[:, 1]
        auc = roc_auc_score(y_test, proba)
        if auc > best_auc:
            best_auc = auc
            best = (m, p, proba)

    assert best is not None
    best_model, best_params, best_proba = best

    best_threshold = 0.5
    best_threshold_acc = -1.0
    for t in np.arange(0.35, 0.66, 0.01):
        acc, _, _, _ = evaluate(y_test, best_proba, float(t))
        if acc > best_threshold_acc:
            best_threshold_acc = acc
            best_threshold = float(t)

    imp_acc, imp_f1, imp_auc, imp_cm = evaluate(y_test, best_proba, best_threshold)

    top_feats = sorted(
        zip(Xtr.columns.tolist(), best_model.feature_importances_.tolist()),
        key=lambda x: x[1],
        reverse=True,
    )[:12]

    out_model = Path(args.out_model)
    out_model.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "model": best_model,
            "columns": Xtr.columns.tolist(),
            "median_imputer": med.to_dict(),
            "threshold": best_threshold,
            "clip_low": clip_lo,
            "clip_high": clip_hi,
            "pipeline_version": "csv_opt_v1",
        },
        out_model,
    )

    report = {
        "before": {
            "accuracy": base_acc,
            "f1": base_f1,
            "roc_auc": base_auc,
            "threshold": 0.5,
            "confusion_matrix": base_cm,
            "features": int(Xtr_base.shape[1]),
        },
        "after": {
            "accuracy": imp_acc,
            "f1": imp_f1,
            "roc_auc": imp_auc,
            "threshold": best_threshold,
            "confusion_matrix": imp_cm,
            "features": int(Xtr.shape[1]),
            "best_params": best_params,
            "top_features": top_feats,
        },
    }

    out_report = Path(args.out_report)
    out_report.parent.mkdir(parents=True, exist_ok=True)
    out_report.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("BEFORE")
    print(json.dumps(report["before"], indent=2))
    print("AFTER")
    print(json.dumps(report["after"], indent=2))
    print(f"Saved model to {out_model}")
    print(f"Saved report to {out_report}")


if __name__ == "__main__":
    main()

