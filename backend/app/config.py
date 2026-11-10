from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
import os


class Settings(BaseSettings):
    # App
    app_name: str = "Stock Predictor API"
    environment: str = Field(default="development", alias="ENVIRONMENT")
    debug: bool = Field(default=True, alias="DEBUG")
    api_prefix: str = "/api"

    # Database
    database_url: str = Field(default="sqlite+aiosqlite:///./stock_predictor.db", alias="DATABASE_URL")

    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")

    # Alpha Vantage
    alpha_vantage_api_key: str = Field(default="demo", alias="ALPHA_VANTAGE_API_KEY")
    alpha_vantage_base_url: str = "https://www.alphavantage.co/query"
    alpha_vantage_rate_limit: int = 25  # requests per day for free tier
    alpha_vantage_rate_limit_per_minute: int = 5

    # ML
    ml_artifacts_path: str = Field(default="./ml-artifacts", alias="ML_ARTIFACTS_PATH")
    model_retrain_schedule: str = "0 2 * * 0"  # Weekly on Sunday at 2 AM
    prediction_horizon_default: int = 5
    sequence_length: int = 30
    lstm_hidden_size: int = 128
    lstm_num_layers: int = 2
    dropout: float = 0.2

    # WebSocket
    ws_heartbeat_interval: int = 30

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        protected_namespaces = ('settings_',)


settings = Settings()