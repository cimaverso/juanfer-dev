from pydantic import BaseModel
from app.schemas.usuario import UsuarioRead

class Token(BaseModel):
    access_token: str
    token_type: str
    usuario: UsuarioRead

class LoginRequest(BaseModel):
    email: str
    password: str

class CodigoResetGenerado(BaseModel):
    codigo: str

class ValidarCodigoResetRequest(BaseModel):
    email: str
    codigo: str

class ResetPasswordRequest(BaseModel):
    email: str
    codigo: str
    nueva_password: str