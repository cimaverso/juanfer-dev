from pydantic import BaseModel, Field, ConfigDict
from datetime import date
from typing import Optional
from decimal import Decimal
from app.schemas.cliente import ClienteRead

class PolizaBase(BaseModel):
    # Relaciones obligatorias
    cliente_id: int
    ramo_id: int
    aseguradora_id: int
    producto_id: int
    estado_id: int
    
    # Información del Asegurado (Puede ser distinta al cliente)
    asegurado_nombre: Optional[str] = Field(None, max_length=150)
    
    # Fechas (REQ-04)
    fecha_solicitud: date
    fecha_expedicion: Optional[date] = None
    
    # Campos diferidos (REQ-02) - Se permiten NULL al inicio
    numero_poliza: Optional[str] = Field(None, max_length=50)
    prima: Optional[Decimal] = Field(None, ge=0)
    
    # Gestión
    responsable_id: Optional[int] = None
    cotizacion_id: Optional[int] = None
    observacion: Optional[str] = None

    class Config:
        from_attributes = True


class PolizaFiltro(BaseModel):
    estado: str | None = None
    aseguradora: str | None = None
    ramo: str | None = None
    mes: str | None = None
    responsable_id: int | None = None
    search: str | None = None # Búsqueda libre (nombre cliente, documento o número póliza)

from pydantic import BaseModel, Field, field_validator
from datetime import date
from typing import Optional
from decimal import Decimal

class PolizaCreate(BaseModel):
    # --- Datos del Tomador (Cliente) ---
    tipo_documento: str = Field(..., description="CC | CE | NIT | TI")
    numero_documento: str = Field(..., description="Cédula o NIT del tomador")
    nombre_completo: str = Field(..., min_length=3, max_length=150)
    celular: Optional[str] = Field(None, max_length=20)

    # --- Datos de la Póliza ---
    ramo_id: int = Field(..., gt=0)
    aseguradora_id: int = Field(..., gt=0)
    producto_id: int = Field(..., gt=0)
    estado_id: int = Field(..., gt=0)
    responsable_id: int = Field(..., gt=0)
    
    # Asegurado
    asegurado_nombre: Optional[str] = Field(None, max_length=150)
    
    # Fechas
    fecha_solicitud: date = Field(..., description="Fecha ISO: YYYY-MM-DD")
    fecha_expedicion: Optional[date] = Field(None)
    
    # Valores y Referencias
    numero_poliza: Optional[str] = Field(None, max_length=50)
    prima: Optional[Decimal] = Field(None, gt=0)
    observacion: Optional[str] = Field(None)

    # ─── VALIDADOR PARA STRINGS VACÍOS ──────────────────
    # Este validador intercepta los campos antes de que Pydantic intente convertirlos.
    # Si detecta un "", lo cambia a None para que no explote el parsing.
    @field_validator("fecha_expedicion", "prima", "numero_poliza", "celular", "asegurado_nombre", mode="before")
    @classmethod
    def transform_empty_string_to_none(cls, v):
        return None if v == "" else v

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "tipo_documento": "CC",
                "numero_documento": "43917910",
                "nombre_completo": "María Fernanda Gómez",
                "ramo_id": 1,
                "aseguradora_id": 2,
                "producto_id": 5,
                "estado_id": 1,
                "responsable_id": 3,
                "fecha_solicitud": "2026-04-28",
                "prima": 285000.0
            }
        }
    }

class PolizaRead(BaseModel):
    id: int
    
    # Campos del Cliente (planos)
    cliente_id: int = Field(validation_alias="cliente_id")
    cliente_nombre: str = Field(validation_alias="cliente_nombre_completo")
    cliente_documento: str = Field(validation_alias="cliente_documento")
    cliente_celular: Optional[str] = Field(None, validation_alias="cliente_celular")
    
    # Asegurado
    asegurado_nombre: Optional[str] = None
    
    # Catálogos (usando tus @property del modelo)
    ramo: str = Field(validation_alias="ramo_name")
    aseguradora: str = Field(validation_alias="aseguradora_name")
    producto: str = Field(validation_alias="producto_name")
    estado: str = Field(validation_alias="estado_name")
    estado_color: str = Field(validation_alias="estado_color") # Necesitas esta property en el modelo
    
    # Gestión
    responsable_id: Optional[int] = None
    responsable_nombre: str = Field(validation_alias="responsable_nombre")
    
    # Datos póliza
    fecha_solicitud: date
    fecha_expedicion: Optional[date] = None
    numero_poliza: Optional[str] = None
    prima: Optional[Decimal] = None
    observacion: Optional[str] = None
    version: int
    
    # Metadata
    # cotizacion_id: Optional[int] = None # Si lo necesitas, agrégalo

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class PolizaListResponse(BaseModel):
    data: list[PolizaRead]
    total: int


class PolizaUpdate(BaseModel):
    version: int = Field(..., description="Versión actual para concurrencia")
    
    # Todos los demás campos son opcionales porque es un PATCH parcial en la práctica
    ramo_id: Optional[int] = None
    aseguradora_id: Optional[int] = None
    producto_id: Optional[int] = None
    estado_id: Optional[int] = None
    responsable_id: Optional[int] = None
    asegurado_nombre: Optional[str] = None
    fecha_expedicion: Optional[date] = None
    numero_poliza: Optional[str] = None
    prima: Optional[Decimal] = None
    observacion: Optional[str] = None

    # Reutilizamos el validador de strings vacíos del POST
    @field_validator("fecha_expedicion", "prima", "numero_poliza", mode="before")
    @classmethod
    def empty_string_to_none(cls, v):
        return None if v == "" else v

    model_config = ConfigDict(from_attributes=True)

class PolizaDelete(BaseModel):
    ok: bool
    message: str