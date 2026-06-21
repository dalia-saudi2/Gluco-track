"""
Diabetic-complications inference (Retinopathy / Nephropathy / Neuropathy).

Prediction policy (no ensemble):
  - 0 visits   -> ask for labs
  - 1 visit    -> XGBoost only   (xgb_thresholds, optional SHAP explanation)
  - >= 2 visits -> LSTM only      (lstm_thresholds, attention-weight explanation)

NOTES
- Artifacts were saved with joblib -> load with joblib.load, in an environment
  whose numpy / scikit-learn / xgboost / torch versions match training.
- Sequence padding mirrors TRAINING exactly (raw zero-pad at the front, THEN
  impute, THEN scale) so 2-5 visit patients are not out-of-distribution.
- Raw LSTM/XGBoost probabilities are NOT calibrated (the isotonic calibration
  lived in the ensemble, which is removed). The thresholded label and the
  LOW/MODERATE/HIGH band are reliable; if you display a raw probability % to
  patients, fit a separate calibrator (isotonic/Platt) on validation for the
  chosen model first.
- ensemble_artifacts.pkl is NOT needed anymore.
"""

import json
import os
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import joblib

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
SLOPE_CANDIDATES = ["HbA1c", "Systolic_BP"]
HIGH_BAND = 0.75   # heuristic upper band on (uncalibrated) probability


# ----------------------------------------------------------------------------- 
# Human input -> model features  (encoding MUST match training)
# ----------------------------------------------------------------------------- 
def encode_visit(raw):
    """
    Convert one human-readable lab report into the 17 model features.
    Expected raw keys (strings/numbers): Duration_Years, Age, BMI, HbA1c,
      Systolic_BP, Diastolic_BP, Total_Cholesterol, LDL, HDL, Triglycerides,
      Hematocrit, Gender ('Male'/'Female'), Diabetes_Type ('Type 1'/'Type 2'),
      Hypertension ('Yes'/'No'), Medications (free text or list).
    Encodings replicate the training notebook exactly.
    """
    meds = raw.get("Medications", "") or ""
    if isinstance(meds, (list, tuple)):
        meds = " ".join(map(str, meds))
    meds = meds.lower()

    def num(k):
        v = raw.get(k, None)
        return float(v) if v not in (None, "") else np.nan

    gender = str(raw.get("Gender", "")).strip().lower()
    dmtype = str(raw.get("Diabetes_Type", "")).strip().lower()
    htn = str(raw.get("Hypertension", "")).strip().lower()

    return {
        "Duration_Years": num("Duration_Years"), "Age": num("Age"), "BMI": num("BMI"),
        "HbA1c": num("HbA1c"), "Systolic_BP": num("Systolic_BP"),
        "Diastolic_BP": num("Diastolic_BP"), "Total_Cholesterol": num("Total_Cholesterol"),
        "LDL": num("LDL"), "HDL": num("HDL"), "Triglycerides": num("Triglycerides"),
        "Hematocrit": num("Hematocrit"),
        "Gender_enc": {"male": 0, "female": 1}.get(gender, 0),
        "DM_Type_enc": {"type 1": 0, "type 2": 1}.get(dmtype, 0),
        "Hypertension_enc": {"no": 0, "yes": 1}.get(htn, 0),
        "On_Insulin": float("insulin" in meds),
        "On_SGLT2i": float("sglt2i" in meds),
        "On_ACEi": float(("acei" in meds) or ("arb" in meds)),
    }


# ----------------------------------------------------------------------------- 
# Model definition (must match training exactly)
# ----------------------------------------------------------------------------- 
class AttentionLayer(nn.Module):
    def __init__(self, h):
        super().__init__()
        self.w = nn.Linear(h * 2, 1)

    def forward(self, out):
        scores = self.w(out).squeeze(-1)
        weights = torch.softmax(scores, dim=-1)
        ctx = torch.bmm(weights.unsqueeze(1), out).squeeze(1)
        return ctx, weights


class LSTMClassifier(nn.Module):
    def __init__(self, n_features, hidden=128, n_layers=2, dropout=0.35, fc=64):
        super().__init__()
        self.norm = nn.LayerNorm(n_features)
        self.lstm = nn.LSTM(n_features, hidden, n_layers, batch_first=True,
                            bidirectional=True, dropout=dropout if n_layers > 1 else 0.0)
        self.attn = AttentionLayer(hidden)
        self.head = nn.Sequential(
            nn.Linear(hidden * 2, fc), nn.ReLU(), nn.Dropout(dropout),
            nn.Linear(fc, fc // 2),  nn.ReLU(), nn.Dropout(dropout / 2),
            nn.Linear(fc // 2, 1),
        )

    def forward(self, x):
        x = self.norm(x)
        out, _ = self.lstm(x)
        ctx, attn = self.attn(out)
        return self.head(ctx).squeeze(-1), attn


# ----------------------------------------------------------------------------- 
# Artifact loading
# ----------------------------------------------------------------------------- 
def load_artifacts(artifact_dir, with_shap=False):
    cfg = json.load(open(os.path.join(artifact_dir, "feature_config.json")))
    thr = json.load(open(os.path.join(artifact_dir, "thresholds.json")))
    pre = joblib.load(os.path.join(artifact_dir, "preprocessors.pkl"))

    targets = cfg["TARGET_COLS"]
    n_features = cfg["N_FEATURES"]

    lstm_models, xgb_models = {}, {}
    for t in targets:
        m = LSTMClassifier(n_features)
        state = torch.load(os.path.join(artifact_dir, f"lstm_{t}.pt"),
                           map_location=DEVICE, weights_only=True)
        m.load_state_dict(state)
        m.to(DEVICE).eval()
        lstm_models[t] = m
        xgb_models[t] = joblib.load(os.path.join(artifact_dir, f"xgb_{t}.pkl"))

    shap_explainers = (joblib.load(os.path.join(artifact_dir, "shap_explainers.pkl"))
                       if with_shap else None)

    return {
        "cfg": cfg, "targets": targets,
        "seq_features": cfg["SEQ_FEATURES"], "xgb_feat_cols": cfg["XGB_FEAT_COLS"],
        "n_timesteps": cfg["N_TIMESTEPS"],
        "seq_scaler": pre["seq_scaler"], "seq_imputer": pre["seq_imputer"],
        "xgb_imputer": pre["xgb_imputer"],
        "lstm_thresholds": thr["lstm_thresholds"], "xgb_thresholds": thr["xgb_thresholds"],
        "lstm_models": lstm_models, "xgb_models": xgb_models,
        "shap_explainers": shap_explainers,
    }


# ----------------------------------------------------------------------------- 
# Feature construction
# ----------------------------------------------------------------------------- 
def _prep_xgb_row(visits, features, n_ts):
    window = visits[-n_ts:] if len(visits) > n_ts else visits
    grp = pd.DataFrame([{f: v.get(f, np.nan) for f in features} for v in window])
    last = grp.iloc[-1]
    row = {}
    for f in features:
        row[f"{f}_last"] = float(last[f]) if pd.notna(last[f]) else np.nan
    t_arr = np.arange(len(grp), dtype=float)
    for f in SLOPE_CANDIDATES:
        if f in features:
            vals = grp[f].values.astype(float)
            row[f"{f}_slope"] = (np.polyfit(t_arr, vals, 1)[0]
                                 if (not np.any(np.isnan(vals)) and len(vals) >= 2) else 0.0)
    if "HbA1c" in features:
        h = grp["HbA1c"].dropna()
        row.update({"HbA1c_max": h.max() if len(h) else np.nan,
                    "HbA1c_mean": h.mean() if len(h) else np.nan,
                    "HbA1c_std": h.std() if len(h) > 1 else 0.0,
                    "HbA1c_visits_above_8": int((h >= 8.0).sum()),
                    "HbA1c_visits_above_9": int((h >= 9.0).sum())})
    if "Systolic_BP" in features:
        row["SBP_at_target_frac"] = float((grp["Systolic_BP"] < 130).mean())
    return row


def _build_sequence_tensor(visits, A):
    """Raw zero-pad at the FRONT, then impute, then scale -- identical to training."""
    seq_features = A["seq_features"]
    n_ts = A["n_timesteps"]
    window = visits[-n_ts:] if len(visits) > n_ts else visits
    rows = [{f: v.get(f, np.nan) for f in seq_features} for v in window]
    X_raw = pd.DataFrame(rows)[seq_features].values.astype(np.float32)
    pad = n_ts - len(window)
    if pad > 0:
        X_raw = np.vstack([np.zeros((pad, len(seq_features)), dtype=np.float32), X_raw])
    X_imp = A["seq_imputer"].transform(X_raw)
    X_sc = A["seq_scaler"].transform(X_imp).astype(np.float32)
    return torch.tensor(X_sc[np.newaxis], dtype=torch.float32).to(DEVICE), pad, len(window)


def _band(prob, thr):
    return "HIGH" if prob >= HIGH_BAND else ("MODERATE" if prob >= thr else "LOW")


# ----------------------------------------------------------------------------- 
# Prediction
# ----------------------------------------------------------------------------- 
def predict_patient(visits, A, with_shap=False, top_k=5):
    """
    visits: list of dicts, oldest -> newest, each containing the SEQ_FEATURES keys.
    """
    n = len(visits)
    if n == 0:
        return {"error": "no_visits", "message": "Add at least one lab entry."}

    targets = A["targets"]
    n_ts = A["n_timesteps"]

    # --------------------------- single visit: XGBoost ----------------------- 
    if n == 1:
        xgb_cols = A["xgb_feat_cols"]
        xrow = _prep_xgb_row(visits, A["seq_features"], n_ts)
        X_xgb = A["xgb_imputer"].transform(
            np.array([[xrow.get(f, np.nan) for f in xgb_cols]], dtype=np.float32))
        out = {"meta": {"visits_provided": 1, "model": "xgboost",
                        "confidence": "single_visit"}, "predictions": {}}
        for t in targets:
            p = float(A["xgb_models"][t].predict_proba(X_xgb)[0, 1])
            thr = A["xgb_thresholds"][t]
            rec = {"prediction": int(p >= thr), "probability": round(p, 4),
                   "risk_level": _band(p, thr)}
            if with_shap and A["shap_explainers"] is not None:
                fold = []
                for ex in A["shap_explainers"][t]:
                    sv = ex.shap_values(X_xgb)
                    if isinstance(sv, list):
                        sv = sv[1]
                    fold.append(sv[0])
                avg = np.mean(fold, axis=0)
                order = np.argsort(np.abs(avg))[::-1][:top_k]
                rec["top_features"] = [
                    {"feature": xgb_cols[i],
                     "effect": "increase_risk" if avg[i] > 0 else "decrease_risk",
                     "shap_value": round(float(avg[i]), 4)} for i in order]
            out["predictions"][t] = rec
        return out

    # --------------------------- >= 2 visits: LSTM --------------------------- 
    X_seq, pad, used = _build_sequence_tensor(visits, A)
    out = {"meta": {"visits_provided": n, "visits_used": used, "visits_padded": pad,
                    "model": "lstm",
                    "confidence": "full" if n >= n_ts else "preliminary"},
           "predictions": {}}
    for t in targets:
        with torch.no_grad():
            logit, attn = A["lstm_models"][t](X_seq)
            p = float(torch.sigmoid(logit).cpu().numpy()[0])
            # attention over real (non-padded) timesteps, oldest -> newest
            visit_attention = [round(float(a), 4) for a in attn.cpu().numpy()[0][pad:]]
        thr = A["lstm_thresholds"][t]
        out["predictions"][t] = {
            "prediction": int(p >= thr), "probability": round(p, 4),
            "risk_level": _band(p, thr),
            "visit_attention": visit_attention,   # which visit drove the prediction
        }
    return out


if __name__ == "__main__":
    A = load_artifacts("ml_models/artifacts", with_shap=False)
    v = {f: 0.0 for f in A["seq_features"]}
    v.update({"Duration_Years": 8, "Age": 60, "BMI": 29, "HbA1c": 8.4,
              "Systolic_BP": 145, "Diastolic_BP": 88})
    v2 = dict(v); v2["HbA1c"] = 9.1            # second visit, worsening
    print("1 visit :", json.dumps(predict_patient([v], A)["meta"]))
    print("2 visits:", json.dumps(predict_patient([v, v2], A)["meta"]))
