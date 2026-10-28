from pydantic import BaseModel, Field
from typing import Optional

class ClienteBase(BaseModel):
    nombre_completo: str = Field(..., max_length=150)
    numero_documento: str

    class Config:
        populate_by_name = True

class ClienteCreate(ClienteBase):
    tipo_documento_id: int
    celular: str = Field(..., max_length=20)
    correo: str = Field(..., max_length=100)
    ocupacion: str = Field(..., max_length=100)
    ciudad: str = Field(..., max_length=80)
    responsable_id: int  

class ClienteRead(ClienteBase):
    id: int
    celular: str
    tipo_de_documento: str = Field(..., alias="tipo_de_documento")
    total_formularios_respondidos: int

    class Config:
        from_attributes = True

class ClienteProspectoRead(ClienteRead):
    correo: Optional[str] = None
    ocupacion: Optional[str] = None
    ciudad: Optional[str] = None

# Actualizar desde Prospecto
class ClienteUpdate(BaseModel):
    nombre_completo: Optional[str]
    tipo_documento_id: Optional[int]
    numero_documento: Optional[str]
    celular: Optional[str]
    correo: Optional[str]
    ocupacion: Optional[str]
    ciudad: Optional[str]