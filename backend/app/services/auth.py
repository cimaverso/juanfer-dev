from app.core.security import verify_password, create_access_token
from app.services.usuario import UsuarioService
from sqlalchemy.orm import Session

class auth_service:

    @staticmethod
    def auth_me(user_id: int, db: Session):
        return UsuarioService.buscar_por_id(db, user_id)

    @staticmethod
    def authenticate_user(email_or_username: str, password: str, db: Session):
        if "@" in email_or_username:
            user = UsuarioService.buscar_por_email(db, email_or_username)
        else:
            user = UsuarioService.buscar_por_usuario(db, email_or_username)

        if not user or not verify_password(password, user.password_hash):
            return None

        token_data = {
            "user_id": user.id,
            "user_name": user.nombre,
            "sub": user.email,
            "rol": user.rol.nombre
        }

        access_token = create_access_token(data=token_data)

        return {"access_token": access_token, "token_type": "bearer", "usuario": user}