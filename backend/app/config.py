from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://dev:dev@localhost:5432/filestorage"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    REDIS_URL: str
    AUTH_BUCKET_CAPACITY: int = 5
    AUTH_BUCKET_REFILL_RATE:float = 1 / 60
    GENERAL_BUCKET_CAPACITY: int = 40
    GENERAL_BUCKET_REFILL_RATE:float = 1 / 2

    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = "cachette-files-459653582452"

    MULTIPART_THRESHOLD: int = 5 * 1024 * 1024 #5MB
    MAX_FILE_SIZE: int = 50 * 1024 * 1024 * 1024 #50GB

    RESEND_API_KEY: str
    EMAIL_FROM: str = "noreply@cachette.cloud"

settings = Settings()