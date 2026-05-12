from pydantic import BaseModel
from typing import Optional, Literal

class CatalogoBase(BaseModel):
    id: int
    nombre: str

class EstadoPolizaRead(CatalogoBase):
    color: str

class ActualizarEstadoPoliza(BaseModel):
    nombre: Optional[str] = None
    color: Optional[str] = None

class CrearEstadoPoliza(BaseModel):
    nombre: str
    color: str

class AseguradoraRead(CatalogoBase):
    pass

class ActualizarAseguradora(BaseModel):
    nombre: str

class CrearAseguradora(ActualizarAseguradora): # Solo se requiere nombre
    pass

class ProductoRead(CatalogoBase):
    pass

class ActualizarProducto(BaseModel):
    nombre: str

class CrearProducto(ActualizarProducto):
    pass


class RamoRead(CatalogoBase):
    codigo: str

class ActualizarRamo(BaseModel):
    codigo: Optional[str] = None
    nombre: Optional[str] = None

class CrearRamo(BaseModel):
    codigo: str
    nombre: str

class TiposDocumentoRead(CatalogoBase):
    pass

class ActualizarTipoDocumento(BaseModel):
    nombre: Optional[str] = None

class CrearTipoDocumento(BaseModel):
    nombre: str