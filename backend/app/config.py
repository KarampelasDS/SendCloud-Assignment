from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    poll_interval_seconds: float = 1.0
    webhook_timeout_seconds: float = 10.0
    webhook_max_attempts: int = 5
    test_database_url: str | None = None

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
