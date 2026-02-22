from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    environment: str = "development"
    cors_origins: list[str] = ["http://localhost:3000"]

    # Database
    database_url: str = "postgresql+asyncpg://localhost:5432/pharmasense"

    # Supabase Auth
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_jwt_secret: str = ""

    # Gemini AI
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta/models/"

    # ElevenLabs
    elevenlabs_api_key: str = ""

    # DigitalOcean Spaces
    spaces_access_key: str = ""
    spaces_secret_key: str = ""
    spaces_bucket: str = "pharmasense-assets"
    spaces_region: str = "nyc3"
    spaces_endpoint: str = "https://nyc3.digitaloceanspaces.com"

    # Snowflake
    snowflake_account: str = ""
    snowflake_user: str = ""
    snowflake_password: str = ""
    snowflake_database: str = "PHARMASENSE"
    snowflake_schema: str = "ANALYTICS"
    snowflake_warehouse: str = "COMPUTE_WH"
    snowflake_role: str = "SYSADMIN"

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def snowflake_configured(self) -> bool:
        return bool(self.snowflake_account and self.snowflake_user and self.snowflake_password)

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
