# Función para el seed de datos en migracion de db inicial
# from passlib.context import CryptContext

# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# def get_password_hash(password: str) -> str:
#     return pwd_context.hash(password) 

from datetime import datetime, timedelta, UTC
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings
from app.schemas.auth import Token
from app.schemas.usuario import UsuarioBase
import secrets
from app.core.db import SessionLocal
from app.models.usuarios_clientes.usuario import Usuario

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.now(UTC) + (expires_delta or timedelta(minutes=30))
    to_encode.update({"exp": expire})
    encoded = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded


def get_current_user_data(token: str = Depends(oauth2_scheme)) -> Token:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        nombre: str = payload.get("user_name")
        email: str = payload.get("sub")
        rol: str = payload.get("rol")

        if email is None or user_id is None:
            raise credentials_exception

        return UsuarioBase(nombre=nombre, email=email, id=user_id, rol=rol)
    except JWTError:
        raise credentials_exception


# def require_admin(token_data: TokenData = Depends(get_current_user_data)):
#     if token_data.rol not in (RoleEnum.ADMINISTRADOR, RoleEnum.GERENTE):
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="No tienes permisos para realizar esta acción",
#         )
#     return token_data

def require_auth(user_data: UsuarioBase = Depends(get_current_user_data)):
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado",
        )
    return user_data