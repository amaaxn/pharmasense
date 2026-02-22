"""DigitalOcean Spaces storage service (Part 6 §5.8).

Bucket structure:
  pharmasense-assets/
  ├── voice/          Voice packs (MP3)
  ├── pdf/            Patient pack PDFs
  └── uploads/        Uploaded images (OCR, insurance cards)

Falls back to an in-memory store when Spaces credentials are not configured
(development mode).
"""

from __future__ import annotations

import logging
import uuid
from typing import Literal

from pharmasense.config import settings

logger = logging.getLogger(__name__)

_in_memory_store: dict[str, bytes] = {}

_CONTENT_TYPES: dict[str, str] = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}

BucketPrefix = Literal["voice", "pdf", "uploads"]


class StorageService:
    """S3-compatible object storage backed by DigitalOcean Spaces."""

    def __init__(self) -> None:
        self._endpoint = settings.spaces_endpoint
        self._bucket = settings.spaces_bucket
        self._region = settings.spaces_region
        self._client = None

        if settings.spaces_access_key and settings.spaces_secret_key:
            try:
                import boto3

                self._client = boto3.client(
                    "s3",
                    endpoint_url=self._endpoint,
                    region_name=self._region,
                    aws_access_key_id=settings.spaces_access_key,
                    aws_secret_access_key=settings.spaces_secret_key,
                )
                logger.info("StorageService: connected to DigitalOcean Spaces (%s)", self._bucket)
            except Exception:
                logger.warning("StorageService: boto3 unavailable, using in-memory store")
        else:
            logger.info("StorageService: no Spaces credentials, using in-memory store")

    def generate_key(self, prefix: BucketPrefix = "uploads", extension: str = "bin") -> str:
        return f"{prefix}/{uuid.uuid4()}.{extension}"

    async def upload(self, data: bytes, key: str) -> str:
        """Upload bytes to Spaces (or in-memory fallback).  Returns the public URL."""
        if self._client:
            ext = "." + key.rsplit(".", 1)[-1] if "." in key else ""
            content_type = _CONTENT_TYPES.get(ext, "application/octet-stream")
            self._client.put_object(
                Bucket=self._bucket,
                Key=key,
                Body=data,
                ContentType=content_type,
                ACL="public-read",
            )
            url = f"{self._endpoint}/{self._bucket}/{key}"
            logger.info("Uploaded to Spaces: %s (%d bytes)", url, len(data))
            return url

        _in_memory_store[key] = data
        url = f"/storage/{key}"
        logger.info("Stored in-memory: %s (%d bytes)", key, len(data))
        return url

    async def download(self, key: str) -> bytes | None:
        """Download an object from Spaces (or in-memory fallback)."""
        if self._client:
            try:
                response = self._client.get_object(Bucket=self._bucket, Key=key)
                return response["Body"].read()
            except Exception:
                logger.warning("Failed to download %s from Spaces", key)
                return None

        return _in_memory_store.get(key)

    async def delete(self, key: str) -> bool:
        """Delete an object.  Returns True on success."""
        if self._client:
            try:
                self._client.delete_object(Bucket=self._bucket, Key=key)
                return True
            except Exception:
                logger.warning("Failed to delete %s from Spaces", key)
                return False

        return _in_memory_store.pop(key, None) is not None

    async def get_url(self, key: str) -> str:
        """Return the public URL for an existing object."""
        if self._client:
            return f"{self._endpoint}/{self._bucket}/{key}"
        return f"/storage/{key}"
