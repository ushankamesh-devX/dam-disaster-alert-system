"""Dataset management, chronological splitting, and immutable snapshot versioning.

Strictly adheres to:
- Chronological train/validation splitting with prediction horizon gaps (to prevent data leakage).
- Immutable snapshot storage with SHA-256 checksum verification.
- Metadata manifests recording record counts, feature schemas, and coverage bounds.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pandas as pd


@dataclass
class DatasetManifest:
    version: str
    created_at: str
    sha256: str
    record_count: int
    column_count: int
    feature_columns: list[str]
    target_columns: list[str]
    min_timestamp: str | None
    max_timestamp: str | None
    dams_covered: list[int]
    metadata: dict[str, Any]


def train_test_split_chronological(
    df: pd.DataFrame,
    test_ratio: float = 0.2,
    gap_hours: int = 6,
    time_col: str = "timestamp",
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Splits a time-ordered DataFrame chronologically with an explicit horizon gap.

    The gap between training and validation prevents future leakage of features/targets
    across the prediction horizon (e.g., 6 hours).
    """
    if not 0.0 < test_ratio < 1.0:
        raise ValueError(f"test_ratio must be between 0 and 1, got {test_ratio}")

    sorted_df = df.sort_values(by=time_col).reset_index(drop=True)
    n = len(sorted_df)
    test_size = int(n * test_ratio)

    if test_size == 0 or (n - test_size - gap_hours) <= 0:
        raise ValueError("Dataset is too small for chronological splitting with the requested gap.")

    train_end_idx = n - test_size - gap_hours
    test_start_idx = n - test_size

    train_df = sorted_df.iloc[:train_end_idx].copy().reset_index(drop=True)
    test_df = sorted_df.iloc[test_start_idx:].copy().reset_index(drop=True)
    return train_df, test_df


def compute_sha256(file_path: Path) -> str:
    """Computes SHA-256 hash of a file."""
    hasher = hashlib.sha256()
    with file_path.open("rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def save_dataset_snapshot(
    df: pd.DataFrame,
    output_dir: Path,
    version: str,
    time_col: str = "timestamp",
    dam_col: str = "dam_id",
    metadata: dict[str, Any] | None = None,
    storage_client: Any | None = None,
) -> DatasetManifest:
    """Saves DataFrame as an immutable CSV/Parquet snapshot with SHA-256 manifest."""
    output_dir.mkdir(parents=True, exist_ok=True)
    data_file = output_dir / f"dataset_v{version}.csv"
    manifest_file = output_dir / f"manifest_v{version}.json"

    # Export CSV with standard UTC formatting
    df.to_csv(data_file, index=False)
    sha256 = compute_sha256(data_file)

    target_cols = [c for c in df.columns if c.startswith("target_")]
    feature_cols = [
        c for c in df.columns if not c.startswith("target_") and c not in [time_col, dam_col]
    ]

    min_ts = str(df[time_col].min()) if time_col in df.columns and not df.empty else None
    max_ts = str(df[time_col].max()) if time_col in df.columns and not df.empty else None
    dams = sorted(df[dam_col].dropna().unique().tolist()) if dam_col in df.columns else []

    manifest = DatasetManifest(
        version=version,
        created_at=datetime.now(UTC).isoformat(),
        sha256=sha256,
        record_count=len(df),
        column_count=len(df.columns),
        feature_columns=feature_cols,
        target_columns=target_cols,
        min_timestamp=min_ts,
        max_timestamp=max_ts,
        dams_covered=dams,
        metadata=metadata or {},
    )

    manifest_file.write_text(json.dumps(asdict(manifest), indent=2), encoding="utf-8")

    # Sync snapshot and manifest to remote object storage if configured
    if storage_client:
        try:
            storage_client.put_file(f"datasets/dataset_v{version}.csv", data_file)
            storage_client.put_file(f"datasets/manifest_v{version}.json", manifest_file)
        except Exception as e:
            # Non-blocking log if remote sync fails
            import logging
            logging.getLogger(__name__).warning("Failed to sync dataset snapshot to storage: %s", e)

    return manifest


def load_dataset_snapshot(
    snapshot_dir: Path, version: str, storage_client: Any | None = None
) -> tuple[pd.DataFrame, DatasetManifest]:
    """Loads dataset and verifies SHA-256 against the manifest, syncing from storage if needed."""
    snapshot_dir.mkdir(parents=True, exist_ok=True)
    data_file = snapshot_dir / f"dataset_v{version}.csv"
    manifest_file = snapshot_dir / f"manifest_v{version}.json"

    if (not data_file.exists() or not manifest_file.exists()) and storage_client:
        try:
            storage_client.get_file(f"datasets/dataset_v{version}.csv", data_file)
            storage_client.get_file(f"datasets/manifest_v{version}.json", manifest_file)
        except Exception as e:
            import logging
            logging.getLogger(__name__).debug("Could not fetch dataset from remote storage: %s", e)

    if not data_file.exists() or not manifest_file.exists():
        raise FileNotFoundError(f"Snapshot version {version} not found in {snapshot_dir}")

    manifest_dict = json.loads(manifest_file.read_text(encoding="utf-8"))
    manifest = DatasetManifest(**manifest_dict)

    current_hash = compute_sha256(data_file)
    if current_hash != manifest.sha256:
        raise ValueError(
            f"Dataset checksum mismatch! Expected {manifest.sha256}, got {current_hash}."
        )

    df = pd.read_csv(data_file)
    return df, manifest
