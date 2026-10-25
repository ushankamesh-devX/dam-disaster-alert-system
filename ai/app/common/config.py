from pathlib import Path

from pydantic import AliasChoices, AnyHttpUrl, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="DDAS_AI_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        hide_input_in_errors=True,
    )

    spring_data_base_url: AnyHttpUrl = AnyHttpUrl("http://127.0.0.1:8080/api/v1/internal/ml")
    spring_timeout_seconds: float = Field(default=10, gt=0, le=60)
    incoming_service_token: SecretStr | None = None
    spring_service_token: SecretStr | None = None
    enable_docs: bool = False
    ml_artifacts_dir: Path = Path("artifacts/ml")
    mlflow_tracking_uri: str = "http://127.0.0.1:5000"
    enable_mlflow_auto_tracking: bool = True
    mlflow_s3_endpoint_url: str | None = None

    # Qdrant Vector Database
    qdrant_url: str | None = None
    qdrant_api_key: SecretStr | None = None
    qdrant_collection: str = "ddas_rag_documents"

    # MinIO Object Storage
    minio_endpoint: str | None = None
    minio_access_key: SecretStr | None = None
    minio_secret_key: SecretStr | None = None
    minio_secure: bool = False
    minio_bucket: str = "ddas-artifacts"

    # Gemini LLM & RAG Settings
    gemini_api_key: SecretStr | None = Field(
        default=None,
        validation_alias=AliasChoices("DDAS_AI_GEMINI_API_KEY", "GEMINI_API_KEY"),
    )
    embedding_model: str = "text-embedding-004"
    embedding_dimension: int = Field(default=768, gt=0)
    chat_model: str = "gemini-3.5-flash-lite"

    @field_validator(
        "incoming_service_token",
        "spring_service_token",
        "qdrant_url",
        "qdrant_api_key",
        "minio_endpoint",
        "minio_access_key",
        "minio_secret_key",
        "gemini_api_key",
        mode="before",
    )
    @classmethod
    def empty_token_is_unconfigured(cls, value):
        return None if value == "" else value

    @field_validator("incoming_service_token", "spring_service_token")
    @classmethod
    def validate_token_length(cls, value: SecretStr | None) -> SecretStr | None:
        if value is not None and len(value.get_secret_value()) < 32:
            raise ValueError("Service tokens must contain at least 32 characters")
        return value

    @field_validator("spring_data_base_url")
    @classmethod
    def validate_data_url(cls, value: AnyHttpUrl) -> AnyHttpUrl:
        if value.username or value.password or value.query or value.fragment:
            raise ValueError("Data URL must not contain credentials, a query, or a fragment")
        if (value.path or "").rstrip("/") != "/api/v1/internal/ml":
            raise ValueError("Data URL must use the dedicated /api/v1/internal/ml prefix")
        return value
