from pydantic import BaseModel, Field, EmailStr

class UsuarioBase(BaseModel):
    id: int
    nombre: str = Field(..., max_length=100)
    email: EmailStr

class UsuarioRead(UsuarioBase):
    rol: str = Field(alias="rol_name")
    iniciales: str