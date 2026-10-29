from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional

class UsuarioCreate(BaseModel):
    nombre: str = Field(..., max_length=100, min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=6)
    rol: str = Field(..., description="ADMIN o ASESOR")

class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=100, min_length=1)
    email: Optional[EmailStr] = None
    rol: Optional[str] = Field(None, description="ADMIN o ASESOR")

class UsuarioBase(BaseModel):
    id: int
    nombre: str = Field(..., max_length=100)
    email: EmailStr
    rol: str = Field(validation_alias="rol_name")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class UsuarioRead(UsuarioBase):
    iniciales: str

    class Config:
        populate_by_name = True
        from_attributes = True