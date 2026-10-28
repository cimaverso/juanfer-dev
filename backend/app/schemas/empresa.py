from pydantic import BaseModel, ConfigDict
from typing import Optional


class EmpresaRead(BaseModel):
    nombre: Optional[str] = None
    nit: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EmpresaUpdate(BaseModel):
    nombre: Optional[str] = None
    nit: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[str] = None
