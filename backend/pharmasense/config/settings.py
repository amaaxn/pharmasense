from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_REPO_ROOT = _BACKEND_DIR.parent

_env_candidates = [_BACKEND_DIR / ".env", _REPO_ROOT / ".env"]
_env_file = next((p for p in _env_candidates if p.exists()), _REPO_ROOT / ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_env_file),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    database_url: str = ""

    # Gemini (server-side only)
    gemini_api_key: str = ""

    # ElevenLabs (server-side only)
    elevenlabs_api_key: str = ""

    # Snowflake (server-side only)
    snowflake_account: str = ""
    snowflake_user: str = ""
    snowflake_password: str = ""
    snowflake_database: str = "PHARMASENSE"
    snowflake_schema: str = "PUBLIC"
    snowflake_warehouse: str = "COMPUTE_WH"

    # DigitalOcean Spaces (server-side only)
    spaces_endpoint: str = ""
    spaces_region: str = "nyc3"
    spaces_bucket: str = "pharmasense-assets"
    spaces_access_key: str = ""
    spaces_secret_key: str = ""

    # Application
    app_env: str = "development"
    backend_port: int = 8000
    frontend_url: str = "http://localhost:3000"
    cors_origins: list[str] = ["http://localhost:3000"]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


settings = Settings()
