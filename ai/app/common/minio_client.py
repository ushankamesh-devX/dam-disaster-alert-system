from __future__ import annotations

import io
import json
import logging
from pathlib import Path
from typing import Any

from minio import Minio
from minio.error import S3Error

logger = logging.getLogger(__name__)


class MinioStorageClient:
    """S3-compatible object storage client with automatic local filesystem fallback."""

    def __init__(
        self,
        endpoint: str | None = None,
        access_key: str | None = None,
        secret_key: str | None = None,
        secure: bool = False,
        default_bucket: str = "ddas-artifacts",
        local_fallback_dir: Path | str = "artifacts/ml",
    ) -> None:
        self.endpoint = endpoint
        self.default_bucket = default_bucket
        self.local_dir = Path(local_fallback_dir)
        self.local_dir.mkdir(parents=True, exist_ok=True)
        self._client: Minio | None = None

        if endpoint and access_key and secret_key:
            try:
                # Strip http:// or https:// prefix if user provided it
                clean_endpoint = endpoint.replace("http://", "").replace("https://", "").rstrip("/")
                self._client = Minio(
                    clean_endpoint,
                    access_key=access_key,
                    secret_key=secret_key,
                    secure=secure,
                )
                self.ensure_bucket(self.default_bucket)
                logger.info("MinIO object storage initialized for bucket: %s", self.default_bucket)
            except Exception as e:
                logger.warning(
                    "Could not connect to MinIO at %s: %s. Using local fallback.", endpoint, e
                )
                self._client = None
        else:
            logger.info(
                "MinIO not configured; using local filesystem storage at %s", self.local_dir
            )

    def is_connected(self) -> bool:
        return self._client is not None

    def ensure_bucket(self, bucket: str | None = None) -> bool:
        if not self._client:
            return False
        b_name = bucket or self.default_bucket
        try:
            if not self._client.bucket_exists(b_name):
                self._client.make_bucket(b_name)
                logger.info("Created MinIO bucket: %s", b_name)
            return True
        except Exception as e:
            logger.warning("Failed ensuring MinIO bucket %s: %s", b_name, e)
            return False

    def put_json(self, object_name: str, data: Any, bucket: str | None = None) -> bool:
        """Stores a JSON-serializable object in MinIO and caches locally."""
        # Always persist locally
        local_path = self.local_dir / object_name
        local_path.parent.mkdir(parents=True, exist_ok=True)
        json_bytes = json.dumps(data, indent=2, default=str).encode("utf-8")
        local_path.write_bytes(json_bytes)

        if not self._client:
            return True

        b_name = bucket or self.default_bucket
        try:
            self._client.put_object(
                bucket_name=b_name,
                object_name=object_name,
                data=io.BytesIO(json_bytes),
                length=len(json_bytes),
                content_type="application/json",
            )
            return True
        except S3Error as e:
            logger.error("Failed uploading JSON %s to MinIO: %s", object_name, e)
            return False

    def get_json(self, object_name: str, bucket: str | None = None) -> Any | None:
        """Retrieves a JSON object from MinIO, falling back to local disk."""
        if self._client:
            b_name = bucket or self.default_bucket
            try:
                response = self._client.get_object(b_name, object_name)
                try:
                    data = json.loads(response.read().decode("utf-8"))
                    # Update local cache
                    local_path = self.local_dir / object_name
                    local_path.parent.mkdir(parents=True, exist_ok=True)
                    text_dump = json.dumps(data, indent=2, default=str)
                    local_path.write_text(text_dump, encoding="utf-8")
                    return data
                finally:
                    response.close()
                    response.release_conn()
            except Exception as e:
                logger.debug(
                    "Object %s not retrieved from MinIO: %s. Trying local disk.", object_name, e
                )

        # Fallback to local
        local_path = self.local_dir / object_name
        if local_path.is_file():
            try:
                with local_path.open("r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error("Failed reading local fallback JSON %s: %s", local_path, e)
        return None

    def put_file(self, object_name: str, file_path: Path, bucket: str | None = None) -> bool:
        """Uploads a file to MinIO and copies to local fallback storage."""
        local_target = self.local_dir / object_name
        local_target.parent.mkdir(parents=True, exist_ok=True)
        if Path(file_path).resolve() != local_target.resolve():
            import shutil

            shutil.copyfile(file_path, local_target)

        if not self._client:
            return True

        b_name = bucket or self.default_bucket
        try:
            self._client.fput_object(b_name, object_name, str(file_path))
            return True
        except Exception as e:
            logger.error("Failed uploading file %s to MinIO: %s", object_name, e)
            return False

    def get_file(self, object_name: str, dest_path: Path, bucket: str | None = None) -> bool:
        """Downloads an object from MinIO to dest_path."""
        dest_path = Path(dest_path)
        dest_path.parent.mkdir(parents=True, exist_ok=True)

        if self._client:
            b_name = bucket or self.default_bucket
            try:
                self._client.fget_object(b_name, object_name, str(dest_path))
                return True
            except Exception as e:
                logger.debug("Failed downloading %s from MinIO: %s", object_name, e)

        # Check local storage fallback
        local_src = self.local_dir / object_name
        if local_src.is_file() and local_src != dest_path:
            import shutil

            shutil.copyfile(local_src, dest_path)
            return True
        return dest_path.is_file()

    def delete_object(self, object_name: str, bucket: str | None = None) -> bool:
        """Deletes an object from MinIO and local disk."""
        local_path = self.local_dir / object_name
        if local_path.is_file():
            try:
                local_path.unlink()
            except Exception as e:
                logger.warning("Could not delete local file %s: %s", local_path, e)

        if not self._client:
            return True

        b_name = bucket or self.default_bucket
        try:
            self._client.remove_object(b_name, object_name)
            return True
        except Exception as e:
            logger.error("Failed deleting %s from MinIO: %s", object_name, e)
            return False

    def list_objects(self, prefix: str = "", bucket: str | None = None) -> list[str]:
        """Lists object keys with the given prefix from MinIO (or local fallback)."""
        if self._client:
            b_name = bucket or self.default_bucket
            try:
                objects = self._client.list_objects(b_name, prefix=prefix, recursive=True)
                return [obj.object_name for obj in objects if obj.object_name]
            except Exception as e:
                logger.warning("Failed listing objects from MinIO: %s. Using local.", e)

        prefix_path = self.local_dir / prefix
        if prefix_path.is_dir():
            return [
                str(p.relative_to(self.local_dir)).replace("\\", "/")
                for p in prefix_path.rglob("*")
                if p.is_file()
            ]
        return []

    def sync_directory_to_storage(
        self, local_dir: Path, remote_prefix: str, bucket: str | None = None
    ) -> int:
        """Uploads an entire directory of files to MinIO object storage."""
        local_dir = Path(local_dir)
        if not local_dir.is_dir():
            return 0
        uploaded_count = 0
        b_name = bucket or self.default_bucket
        prefix = remote_prefix.strip("/")
        for p in local_dir.rglob("*"):
            if p.is_file():
                rel_path = p.relative_to(local_dir).as_posix()
                obj_key = f"{prefix}/{rel_path}" if prefix else rel_path
                if self.put_file(obj_key, p, bucket=b_name):
                    uploaded_count += 1
        return uploaded_count

    def sync_directory_from_storage(
        self, remote_prefix: str, local_dir: Path, bucket: str | None = None
    ) -> int:
        """Downloads all objects under a remote prefix from MinIO to a local directory."""
        local_dir = Path(local_dir)
        local_dir.mkdir(parents=True, exist_ok=True)
        b_name = bucket or self.default_bucket
        prefix = remote_prefix.strip("/")
        search_prefix = f"{prefix}/" if prefix else ""
        obj_keys = self.list_objects(prefix=search_prefix, bucket=b_name)
        downloaded_count = 0
        for obj_key in obj_keys:
            rel_path = obj_key[len(search_prefix):].lstrip("/")
            dest_file = local_dir / rel_path
            if not dest_file.exists():
                if self.get_file(obj_key, dest_file, bucket=b_name):
                    downloaded_count += 1
        return downloaded_count
