from pydantic import BaseModel
from app.schemas.usuario import UsuarioRead

class Token(BaseModel):
    access_token: str
    token_type: str
    usuario: UsuarioRead

class LoginRequest(BaseModel):
    email: str
    password: str