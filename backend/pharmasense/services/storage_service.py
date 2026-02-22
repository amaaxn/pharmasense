"""DigitalOcean Spaces storage service with in-memory fallback for dev."""

from __future__ import annotations

import logging
import os
import uuid

logger = logging.getLogger(__name__)

_in_memory_store: dict[str, bytes] = {}


class StorageService:
    def __init__(self) -> None:
        self._endpoint = os.getenv("DO_SPACES_ENDPOINT", "")
        self._bucket = os.getenv("DO_SPACES_BUCKET", "")
        self._region = os.getenv("DO_SPACES_REGION", "nyc3")
        self._access_key = os.getenv("DO_SPACES_KEY", "")
        self._secret_key = os.getenv("DO_SPACES_SECRET", "")
        self._client = None

        if self._endpoint and self._access_key and self._secret_key:
            try:
                import boto3

                self._client = boto3.client(
                    "s3",
                    endpoint_url=self._endpoint,
                    region_name=self._region,
                    aws_access_key_id=self._access_key,
                    aws_secret_access_key=self._secret_key,
                )
                logger.info("StorageService: connected to DigitalOcean Spaces")
            except Exception:
                logger.warning("StorageService: boto3 unavailable, using in-memory store")
        else:
            logger.info("StorageService: no Spaces credentials, using in-memory store")

    def generate_key(self, prefix: str = "files", extension: str = "bin") -> str:
        return f"{prefix}/{uuid.uuid4()}.{extension}"

    async def upload(self, data: bytes, key: str) -> str:
        if self._client:
            content_type = "audio/mpeg" if key.endswith(".mp3") else "application/octet-stream"
            self._client.put_object(
                Bucket=self._bucket,
                Key=key,
                Body=data,
                ContentType=content_type,
                ACL="public-read",
            )
            url = f"{self._endpoint}/{self._bucket}/{key}"
            logger.info("Uploaded to Spaces: %s", url)
            return url

        _in_memory_store[key] = data
        url = f"/storage/{key}"
        logger.info("Stored in-memory: %s (%d bytes)", key, len(data))
        return url
