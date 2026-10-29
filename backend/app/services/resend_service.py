import httpx
from typing import Optional
from app.core.config import settings

RESEND_API_URL = "https://api.resend.com/emails"

# Remitente compartido de Resend, válido sin dominio propio verificado
# (ver docs Resend "onboarding@resend.dev"). Dinámico vía RESEND_REMITENTE
# para cuando el cliente verifique su propio dominio -- no debe tocarse
# código, solo el .env.
REMITENTE_DEFAULT = "onboarding@resend.dev"

# Llamada de red fuera de cualquier sesión de DB (ver ResendService.enviar):
# un timeout corto evita que un Resend lento retenga un hilo del
# threadpool indefinidamente bajo carga.
TIMEOUT_SEGUNDOS = 8


class ResendService:
    """
    Envío de correo vía la API REST de Resend, llamada HTTP directa con
    httpx (una sola llamada no justifica el SDK oficial). Sin dependencia
    de ninguna sesión de SQLAlchemy -- quien la use no debe tener una
    conexión del pool abierta mientras espera esta llamada.
    """

    @staticmethod
    def enviar(destinatario: Optional[str], asunto: str, html: str) -> tuple[bool, Optional[str]]:
        if not settings.RESEND_APIKEY:
            return False, "RESEND_APIKEY no configurada"

        if not destinatario:
            return False, "RESEND_CORREO no configurado"

        remitente = settings.RESEND_REMITENTE or REMITENTE_DEFAULT

        try:
            respuesta = httpx.post(
                RESEND_API_URL,
                headers={"Authorization": f"Bearer {settings.RESEND_APIKEY}"},
                json={
                    "from": remitente,
                    "to": [destinatario],
                    "subject": asunto,
                    "html": html,
                },
                timeout=TIMEOUT_SEGUNDOS,
            )
        except httpx.HTTPError as error:
            return False, f"Error de red llamando a Resend: {error}"

        if respuesta.status_code >= 400:
            return False, f"Resend respondió {respuesta.status_code}: {respuesta.text[:300]}"

        return True, None
