from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.forecasting.models import (
    OverflowProbabilityModel,
    WaterLevelMultiQuantileModel,
)

logger = logging.getLogger(__name__)


@dataclass
class ReleaseMetadata:
    release_id: str
    created_at: str
    status: str  # "active", "candidate", "archived", "rejected"
    dataset_version: str | None
    dataset_sha256: str | None
    git_commit: str | None
    feature_names: list[str]
    horizons_hours: list[int]
    passed_gates: bool
    evaluation_summary: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class LoadedReleaseBundle:
    metadata: ReleaseMetadata
    level_models: dict[int, WaterLevelMultiQuantileModel]
    overflow_models: dict[int, OverflowProbabilityModel]


class ModelReleaseRegistry:
    """Manages versioned model releases, active release pointers, and rollbacks with remote storage sync."""

    def __init__(self, artifacts_dir: Path, storage_client: Any | None = None) -> None:
        self.artifacts_dir = Path(artifacts_dir)
        self.releases_dir = self.artifacts_dir / "releases"
        self.active_pointer_file = self.artifacts_dir / "active_release.json"
        self.storage_client = storage_client
        self._cached_bundle: LoadedReleaseBundle | None = None

    def _ensure_dirs(self) -> None:
        self.releases_dir.mkdir(parents=True, exist_ok=True)

    def sync_release_to_storage(self, release_id: str) -> None:
        """Syncs a local release bundle and metadata to MinIO object storage."""
        if not self.storage_client:
            return
        rel_dir = self.releases_dir / release_id
        if rel_dir.is_dir():
            try:
                self.storage_client.sync_directory_to_storage(rel_dir, f"models/{release_id}")
                logger.info("Synced model release %s to object storage", release_id)
            except Exception as e:
                logger.warning("Failed syncing release %s to storage: %s", release_id, e)

    def list_releases(self) -> list[ReleaseMetadata]:
        """Lists all registered model releases in descending order of creation."""
        self._ensure_dirs()
        active_id = self.get_active_release_id()
        releases = []

        # Also discover remote releases from object storage if configured
        if self.storage_client:
            try:
                remote_keys = self.storage_client.list_objects(prefix="models/")
                for key in remote_keys:
                    parts = key.split("/")
                    if len(parts) >= 3 and parts[0] == "models" and parts[2] == "metadata.json":
                        remote_rel_id = parts[1]
                        dest_dir = self.releases_dir / remote_rel_id
                        if not dest_dir.exists():
                            self.storage_client.sync_directory_from_storage(
                                f"models/{remote_rel_id}", dest_dir
                            )
            except Exception as e:
                logger.debug("Could not inspect remote storage releases: %s", e)

        for rel_dir in self.releases_dir.iterdir():
            if not rel_dir.is_dir():
                continue
            meta_file = rel_dir / "metadata.json"
            if not meta_file.exists():
                continue
            try:
                with meta_file.open("r", encoding="utf-8") as f:
                    data = json.load(f)
                meta = ReleaseMetadata(**data)
                if meta.release_id == active_id:
                    meta.status = "active"
                releases.append(meta)
            except Exception as e:
                logger.error("Failed to read release metadata from %s: %s", meta_file, e)

        releases.sort(key=lambda r: r.created_at, reverse=True)
        return releases

    def get_release(self, release_id: str) -> ReleaseMetadata | None:
        """Fetches metadata for a specific release, checking remote storage if needed."""
        meta_file = self.releases_dir / release_id / "metadata.json"
        if not meta_file.exists() and self.storage_client:
            try:
                remote_meta = self.storage_client.get_json(f"models/{release_id}/metadata.json")
                if remote_meta:
                    meta_file.parent.mkdir(parents=True, exist_ok=True)
                    meta_file.write_text(json.dumps(remote_meta, indent=2), encoding="utf-8")
            except Exception as e:
                logger.debug("Could not fetch remote metadata for %s: %s", release_id, e)

        if not meta_file.exists():
            return None
        with meta_file.open("r", encoding="utf-8") as f:
            data = json.load(f)
        meta = ReleaseMetadata(**data)
        if meta.release_id == self.get_active_release_id():
            meta.status = "active"
        return meta

    def get_active_release_id(self) -> str | None:
        """Reads the currently active release ID from the pointer file, checking remote storage if needed."""
        if not self.active_pointer_file.exists() and self.storage_client:
            try:
                remote_pointer = self.storage_client.get_json("models/active_release.json")
                if remote_pointer and "active_release_id" in remote_pointer:
                    self.active_pointer_file.parent.mkdir(parents=True, exist_ok=True)
                    self.active_pointer_file.write_text(
                        json.dumps(remote_pointer, indent=2), encoding="utf-8"
                    )
            except Exception as e:
                logger.debug("Could not fetch remote active pointer: %s", e)

        if not self.active_pointer_file.exists():
            return None
        try:
            with self.active_pointer_file.open("r", encoding="utf-8") as f:
                data = json.load(f)
            return data.get("active_release_id")
        except Exception:
            return None

    def get_active_release(self) -> ReleaseMetadata | None:
        """Returns the active release metadata, or None if none is active."""
        active_id = self.get_active_release_id()
        if active_id is None:
            return None
        return self.get_release(active_id)

    def activate_release(self, release_id: str) -> ReleaseMetadata:
        """Validates models, atomically switches the active release pointer, and syncs to storage."""
        rel_dir = self.releases_dir / release_id
        if not rel_dir.exists() and self.storage_client:
            self.storage_client.sync_directory_from_storage(f"models/{release_id}", rel_dir)

        if not rel_dir.exists():
            raise FileNotFoundError(f"Release '{release_id}' does not exist.")

        meta = self.get_release(release_id)
        if meta is None:
            raise ValueError(f"Metadata missing for release '{release_id}'.")

        # Verify all models can be loaded before activating
        bundle = self.load_release_bundle(release_id)

        # Atomic pointer swap with previous release rollback support
        previous_active = self.get_active_release_id()
        pointer_data = {
            "active_release_id": release_id,
            "previous_release_id": previous_active,
            "activated_at": datetime.now(UTC).isoformat(),
        }

        temp_pointer = self.active_pointer_file.with_suffix(".tmp")
        with temp_pointer.open("w", encoding="utf-8") as f:
            json.dump(pointer_data, f, indent=2)
        temp_pointer.replace(self.active_pointer_file)

        # Sync active release pointer & model bundle to storage
        if self.storage_client:
            try:
                self.storage_client.put_json("models/active_release.json", pointer_data)
                self.storage_client.sync_directory_to_storage(rel_dir, f"models/{release_id}")
            except Exception as e:
                logger.warning("Failed syncing active pointer to storage: %s", e)

        meta.status = "active"
        self._cached_bundle = bundle
        logger.info(
            "Successfully activated model release: %s (previous: %s)", release_id, previous_active
        )
        return meta

    def rollback_release(self) -> ReleaseMetadata:
        """Rolls back to the previously active release."""
        if not self.active_pointer_file.exists():
            raise ValueError("No active release pointer found to roll back from.")

        with self.active_pointer_file.open("r", encoding="utf-8") as f:
            pointer_data = json.load(f)

        prev_id = pointer_data.get("previous_release_id")
        if not prev_id:
            raise ValueError("No previous release recorded for rollback.")

        return self.activate_release(prev_id)

    def load_release_bundle(self, release_id: str) -> LoadedReleaseBundle:
        """Loads all horizon models and metadata for a release, downloading from storage if absent."""
        rel_dir = self.releases_dir / release_id
        models_dir = rel_dir / "models"

        # If release does not exist locally, download from object storage
        if (not models_dir.exists() or not (rel_dir / "metadata.json").exists()) and self.storage_client:
            self.storage_client.sync_directory_from_storage(f"models/{release_id}", rel_dir)

        meta = self.get_release(release_id)
        if meta is None:
            raise FileNotFoundError(f"Release '{release_id}' not found.")

        rel_dir = self.releases_dir / release_id
        models_dir = rel_dir / "models"

        level_models = {}
        overflow_models = {}

        for h in meta.horizons_hours:
            lvl_file = models_dir / f"level_{h}h.joblib"
            if not lvl_file.exists():
                raise FileNotFoundError(f"Missing level model file: {lvl_file}")
            level_models[h] = WaterLevelMultiQuantileModel.load(lvl_file)

            ovf_file = models_dir / f"overflow_{h}h.joblib"
            if not ovf_file.exists():
                raise FileNotFoundError(f"Missing overflow model file: {ovf_file}")
            overflow_models[h] = OverflowProbabilityModel.load(ovf_file)

        return LoadedReleaseBundle(
            metadata=meta,
            level_models=level_models,
            overflow_models=overflow_models,
        )

    def get_loaded_active_bundle(self) -> LoadedReleaseBundle | None:
        """Returns the cached in-memory loaded bundle for active inference, or loads it."""
        active_id = self.get_active_release_id()
        if active_id is None:
            return None

        if self._cached_bundle is not None and self._cached_bundle.metadata.release_id == active_id:
            return self._cached_bundle

        self._cached_bundle = self.load_release_bundle(active_id)
        return self._cached_bundle
