import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(BASE_DIR, ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str
    SECRET_KEY: str
    RESEND_APIKEY: Optional[str] = None
    RESEND_CORREO: Optional[str] = None
    RESEND_REMITENTE: Optional[str] = None

    # Orígenes permitidos por CORS, separados por coma. Default: solo el
    # puerto de Vite en desarrollo local (DT-011; antes era "*", cualquier
    # origen). Detrás de nginx (ver nginx/nginx.conf) el navegador ve un
    # solo origen (front y /api/ bajo el mismo dominio:puerto), así que en
    # ese caso CORS casi no entra en juego salvo que el front se sirva
    # desde un dominio distinto al backend.
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origen.strip() for origen in self.CORS_ORIGINS.split(",") if origen.strip()]

settings = Settings()