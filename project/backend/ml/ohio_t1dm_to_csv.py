#!/usr/bin/env python3
"""
Convert OhioT1DM XML (archive folder) to train/test CSV for XGBoost glucose direction.
Uses official *-ws-training.xml / *-ws-testing.xml splits per patient.
"""
from __future__ import annotations

import argparse
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

DATE_FMT = "%d-%m-%Y %H:%M:%S"


def parse_ts(ts: str) -> datetime:
    return datetime.strptime(ts.strip(), DATE_FMT)


def load_patient_xml(path: Path) -> Tuple[int, pd.DataFrame, List[dict], List[dict], List[dict]]:
    tree = ET.parse(path)
    root = tree.getroot()
    patient_id = int(root.attrib.get("id", "0"))

    glucose_rows = []
    for ev in root.find("glucose_level").findall("event"):
        glucose_rows.append({"ts": parse_ts(ev.attrib["ts"]), "glucose": float(ev.attrib["value"])})
    gdf = pd.DataFrame(glucose_rows).sort_values("ts").drop_duplicates("ts").reset_index(drop=True)

    meals = []
    meal_node = root.find("meal")
    if meal_node is not None:
        for ev in meal_node.findall("event"):
            meals.append(
                {
                    "ts": parse_ts(ev.attrib["ts"]),
                    "carbs": float(ev.attrib.get("carbs", 0) or 0),
                    "meal_type": ev.attrib.get("type", ""),
                }
            )

    boluses = []
    bolus_node = root.find("bolus")
    if bolus_node is not None:
        for ev in bolus_node.findall("event"):
            ts = ev.attrib.get("ts_begin") or ev.attrib.get("ts")
            boluses.append(
                {
                    "ts": parse_ts(ts),
                    "dose": float(ev.attrib.get("dose", 0) or 0),
                    "bwz_carbs": float(ev.attrib.get("bwz_carb_input", 0) or 0),
                }
            )

    exercises = []
    ex_node = root.find("exercise")
    if ex_node is not None:
        for ev in ex_node.findall("event"):
            exercises.append(
                {
                    "ts": parse_ts(ev.attrib["ts"]),
                    "duration": float(ev.attrib.get("duration", 0) or 0),
                    "intensity": float(ev.attrib.get("intensity", 0) or 0),
                }
            )

    return patient_id, gdf, meals, boluses, exercises


def minutes_since(events: List[dict], ts: datetime, key: str = "ts") -> float:
    prior = [e for e in events if e[key] <= ts]
    if not prior:
        return 9999.0
    last = max(prior, key=lambda e: e[key])
    return (ts - last[key]).total_seconds() / 60.0


def carbs_in_window(meals: List[dict], ts: datetime, minutes: int) -> float:
    start = ts - pd.Timedelta(minutes=minutes)
    total = 0.0
    for m in meals:
        if start < m["ts"] <= ts:
            total += m["carbs"]
    return total


def exercise_active(exercises: List[dict], ts: datetime, window_min: int = 120) -> float:
    start = ts - pd.Timedelta(minutes=window_min)
    for ex in exercises:
        end = ex["ts"] + pd.Timedelta(minutes=ex["duration"])
        if ex["ts"] <= ts <= end or (start <= ex["ts"] <= ts):
            return 1.0
    return 0.0


def nearest_bolus(boluses: List[dict], ts: datetime, window_min: int = 180) -> float:
    start = ts - pd.Timedelta(minutes=window_min)
    doses = [b["dose"] for b in boluses if start <= b["ts"] <= ts]
    return float(sum(doses)) if doses else 0.0


def build_feature_rows(
    patient_id: int,
    gdf: pd.DataFrame,
    meals: List[dict],
    boluses: List[dict],
    exercises: List[dict],
    horizon_steps: int = 6,
    up_threshold: float = 5.0,
) -> pd.DataFrame:
    """horizon_steps=6 => 30 minutes ahead at 5-min CGM spacing."""
    values = gdf["glucose"].astype(float).values
    ts_list = gdf["ts"].tolist()
    n = len(values)
    rows = []

    for i in range(n):
        if i < 12 or i + horizon_steps >= n:
            continue

        ts = ts_list[i]
        g0 = values[i]
        g_future = values[i + horizon_steps]
        delta_future = g_future - g0
        target = int(delta_future >= up_threshold)

        def roc(steps: int) -> float:
            if i - steps < 0:
                return 0.0
            return (values[i] - values[i - steps]) / max(steps, 1)

        def delta(steps: int) -> float:
            if i - steps < 0:
                return 0.0
            return values[i] - values[i - steps]

        w30 = values[max(0, i - 5) : i + 1]
        w60 = values[max(0, i - 11) : i + 1]
        h = ts.hour + ts.minute / 60.0
        sin_h = float(np.sin(2 * np.pi * h / 24))
        cos_h = float(np.cos(2 * np.pi * h / 24))

        recent_carbs = carbs_in_window(meals, ts, 60)
        bolus_recent = nearest_bolus(boluses, ts, 180)

        rows.append(
            {
                "timestamp": ts.isoformat(),
                "patient_id": patient_id,
                "glucose": g0,
                "carbs": recent_carbs,
                "bolus_dose": bolus_recent,
                "hour_sin": sin_h,
                "hour_cos": cos_h,
                "glucose_roc_5": roc(1),
                "glucose_roc_15": roc(3),
                "glucose_roc_30": roc(6),
                "glucose_delta_15": delta(3),
                "glucose_delta_30": delta(6),
                "glucose_delta_60": delta(12),
                "glucose_mean_30": float(np.mean(w30)),
                "glucose_mean_60": float(np.mean(w60)),
                "glucose_std_30": float(np.std(w30)) if len(w30) > 1 else 0.0,
                "glucose_std_60": float(np.std(w60)) if len(w60) > 1 else 0.0,
                "glucose_min_60": float(np.min(w60)),
                "glucose_max_60": float(np.max(w60)),
                "glucose_range_60": float(np.max(w60) - np.min(w60)),
                "time_since_meal": minutes_since(meals, ts),
                "time_since_bolus": minutes_since(boluses, ts),
                "carbs_sum_60": recent_carbs,
                "exercise_active": exercise_active(exercises, ts),
                "in_hyperglycemia": float(g0 >= 180),
                "in_hypoglycemia": float(g0 < 70),
                "future_glucose_30min": g_future,
                "glucose_delta_future": delta_future,
                "target": target,
            }
        )

    return pd.DataFrame(rows)


def process_archive(archive_dir: Path, split: str) -> pd.DataFrame:
    pattern = f"*-ws-{split}.xml"
    files = sorted(archive_dir.glob(pattern))
    if not files:
        raise SystemExit(f"No files matching {pattern} in {archive_dir}")

    parts = []
    for fp in files:
        print(f"Processing {fp.name} ...")
        pid, gdf, meals, boluses, exercises = load_patient_xml(fp)
        part = build_feature_rows(pid, gdf, meals, boluses, exercises)
        print(f"  patient {pid}: {len(part)} rows")
        parts.append(part)

    out = pd.concat(parts, ignore_index=True)
    print(f"{split} total rows: {len(out)}  target rate: {out['target'].mean():.3f}")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--archive-dir", type=str, required=True)
    ap.add_argument("--out-dir", type=str, required=True)
    args = ap.parse_args()

    archive = Path(args.archive_dir)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    train_df = process_archive(archive, "training")
    test_df = process_archive(archive, "testing")

    train_path = out_dir / "ohio_train_features.csv"
    test_path = out_dir / "ohio_test_features.csv"
    train_df.to_csv(train_path, index=False)
    test_df.to_csv(test_path, index=False)
    print(f"Saved {train_path}")
    print(f"Saved {test_path}")


if __name__ == "__main__":
    main()
