from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from decimal import Decimal
import uuid


class CatalogoValorRead(BaseModel):
    """Forma genérica de un valor de catalogo_valor (estado, tipo de pregunta, etc.)."""
    id: int
    codigo: str
    nombre: str

    model_config = ConfigDict(from_attributes=True)


class FormularioCreate(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    categoria_codigo: str
    configuracion: Optional[dict] = None


class FormularioUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    estado_id: Optional[int] = None
    categoria_codigo: Optional[str] = None
    configuracion: Optional[dict] = None


class FormularioRead(BaseModel):
    id: int
    titulo: str
    descripcion: Optional[str] = None
    estado: CatalogoValorRead
    categoria: CatalogoValorRead
    version_activa_id: Optional[int] = None
    token_publico: uuid.UUID
    configuracion: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Grupos de pregunta (bloques repetibles) ──────────────────────────────

class FormularioGrupoPreguntaCreate(BaseModel):
    codigo: str
    titulo_template: str
    minimo_repeticiones: int = 0
    maximo_repeticiones: Optional[int] = None
    entidad_destino: Optional[str] = None
    orden: Optional[Decimal] = None


class FormularioGrupoPreguntaUpdate(BaseModel):
    codigo: Optional[str] = None
    titulo_template: Optional[str] = None
    minimo_repeticiones: Optional[int] = None
    maximo_repeticiones: Optional[int] = None
    entidad_destino: Optional[str] = None
    orden: Optional[Decimal] = None


class FormularioGrupoPreguntaRead(BaseModel):
    id: int
    formulario_id: int
    codigo: str
    titulo_template: str
    minimo_repeticiones: int
    maximo_repeticiones: Optional[int] = None
    entidad_destino: Optional[str] = None
    orden: Decimal

    model_config = ConfigDict(from_attributes=True)


# ── Preguntas ─────────────────────────────────────────────────────────────

class FormularioPreguntaCreate(BaseModel):
    grupo_id: Optional[int] = None
    codigo: str
    tipo_codigo: str
    titulo: str
    subtitulo: Optional[str] = None
    requerida: bool = False
    orden: Optional[Decimal] = None
    configuracion: Optional[dict] = None
    mapea_a: Optional[dict] = None


class FormularioPreguntaUpdate(BaseModel):
    grupo_id: Optional[int] = None
    codigo: Optional[str] = None
    tipo_codigo: Optional[str] = None
    titulo: Optional[str] = None
    subtitulo: Optional[str] = None
    requerida: Optional[bool] = None
    orden: Optional[Decimal] = None
    configuracion: Optional[dict] = None
    mapea_a: Optional[dict] = None


class FormularioVersionRead(BaseModel):
    id: int
    formulario_id: int
    numero_version: int
    estructura: dict
    publicado_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FormularioPreguntaRead(BaseModel):
    id: int
    formulario_id: int
    grupo_id: Optional[int] = None
    codigo: str
    tipo: CatalogoValorRead
    titulo: str
    subtitulo: Optional[str] = None
    requerida: bool
    orden: Decimal
    configuracion: Optional[dict] = None
    mapea_a: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)
