from pydantic import BaseModel, ConfigDict
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

class EstadoProspectoRead(BaseModel):
    id: int
    nombre: str
    color: str
    orden: int


# ── Catálogo genérico (catalogo_tipo / catalogo_valor) ──────────────────
# Lo usa hoy el módulo de formularios (formulario_estado,
# formulario_pregunta_tipo, formulario_respuesta_estado); cualquier
# catálogo nuevo del sistema puede apoyarse en este mismo par de tablas
# en vez de crear una tabla propia.

class CatalogoTipoRead(BaseModel):
    id: int
    codigo: str
    nombre: str
    descripcion: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CatalogoTipoCreate(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None


class CatalogoValorAdminRead(BaseModel):
    id: int
    catalogo_tipo_id: int
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    orden: int
    activo: bool
    metadatos: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)


class CatalogoValorCreate(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    orden: Optional[int] = None
    metadatos: Optional[dict] = None


class CatalogoValorUpdate(BaseModel):
    # codigo NO es editable aquí a propósito: el código de negocio lo usa
    # para ramificar lógica (ver docstring de CatalogoValor). Lo que el
    # admin edita libremente es nombre/descripcion/orden/activo/metadatos.
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    orden: Optional[int] = None
    activo: Optional[bool] = None
    metadatos: Optional[dict] = None