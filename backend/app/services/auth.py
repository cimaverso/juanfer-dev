from app.core.security import verify_password, create_access_token
from app.services.usuario import UsuarioService
from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime, timedelta, timezone
from math import ceil

MAX_INTENTOS_FALLIDOS = 3
MINUTOS_BLOQUEO_LOGIN = 15


class auth_service:

    @staticmethod
    def auth_me(user_id: int, db: Session):
        return UsuarioService.buscar_por_id(db, user_id)

    @staticmethod
    def authenticate_user(email_or_username: str, password: str, db: Session):
        if "@" in email_or_username:
            user = UsuarioService.buscar_por_email(db, email_or_username)
        else:
            user = UsuarioService.buscar_por_nombre(db, email_or_username)

        if not user:
            return None

        ahora = datetime.now(timezone.utc).replace(tzinfo=None)

        if user.bloqueado_hasta and ahora < user.bloqueado_hasta:
            minutos_restantes = ceil((user.bloqueado_hasta - ahora).total_seconds() / 60)
            raise HTTPException(
                status_code=423,
                detail=f"Cuenta bloqueada por intentos fallidos. Intenta de nuevo en {minutos_restantes} minuto(s).",
            )

        if not verify_password(password, user.password_hash):
            user.intentos_fallidos += 1
            if user.intentos_fallidos >= MAX_INTENTOS_FALLIDOS:
                user.bloqueado_hasta = ahora + timedelta(minutes=MINUTOS_BLOQUEO_LOGIN)
                user.intentos_fallidos = 0
                db.commit()
                raise HTTPException(
                    status_code=423,
                    detail=f"Cuenta bloqueada por intentos fallidos. Intenta de nuevo en {MINUTOS_BLOQUEO_LOGIN} minuto(s).",
                )
            db.commit()
            return None

        user.intentos_fallidos = 0
        user.bloqueado_hasta = None
        db.commit()

        token_data = {
            "user_id": user.id,
            "user_name": user.nombre,
            "sub": user.email,
            "rol": user.rol.nombre
        }

        access_token = create_access_token(data=token_data)

        return {"access_token": access_token, "token_type": "bearer", "usuario": user}
