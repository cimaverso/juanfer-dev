from pydantic import BaseModel, Field
from datetime import date, datetime
from app.schemas.cliente import ClienteProspectoRead, ClienteCreate
from app.schemas.tarea import TareaRead
from typing import Optional

class ProspectoBase(BaseModel):
    id: int

class ProspectoRead(ProspectoBase):
    # Cliente

    nombre: str
    tipo_documento_id: int
    numero_documento: str
    telefono: Optional[str]
    correo: Optional[str]
    ocupacion: Optional[str]
    ciudad: Optional[str]

    canal_origen: str
    estado_id: int
    estado_nombre: str = Field(validation_alias="estado_nombre")
    estado_color: str = Field(validation_alias="estado_color")
    responsable_id: int
    responsable_nombre: str = Field(validation_alias="responsable_nombre")
    aseguradora_interes_id: Optional[int]
    aseguradora_interes_nombre: Optional[str] = Field(validation_alias="aseguradora_nombre")
    ramo_interes_id: Optional[int]
    ramo_interes_nombre: Optional[str] = Field(validation_alias="ramo_nombre")
    observaciones: Optional[str]
    intentos_contacto: int
    fecha_primer_contacto: Optional[date]
    fecha_ultimo_contacto: Optional[date]
    proximo_contacto: Optional[date]
    poliza_id: Optional[int]
    created_at: datetime
    updated_at: datetime

class ProspectoCreate(BaseModel):
    #cliente
    nombre: str
    tipo_documento_id: int
    numero_documento: str
    telefono: str
    correo: str
    ocupacion: str
    ciudad: str

    canal_origen: str
    aseguradora_interes_id: int
    ramo_interes_id: int
    responsable_id: int
    observaciones: Optional[str]

class ProspectoCreateOne(BaseModel):
    #cliente
    nombre: str
    tipo_documento: str
    numero_documento: str
    telefono: str
    correo: str
    ocupacion: str
    ciudad: str

    ramo_interes: str
    aseguradora: str
    observaciones: Optional[str]

class ProspectoCreateImport(BaseModel):
    filas: list[ProspectoCreateOne]

class ImportarError(BaseModel):
    fila: int
    motivo: str
class ImportarResponse(BaseModel):
    importados: Optional[int]
    omitidos: Optional[int]
    errores: Optional[list[ImportarError]]

class ProspectoListResponse(BaseModel):
    items: list[ProspectoRead]
    total: int
    page: int
    pages: int

class ResumenPipeline(BaseModel):
    estado_id: int
    estado_nombre: str
    estado_color: str
    cantidad: int

class ProspectoTareaRead(BaseModel):
    prospecto: ProspectoRead
    #tareas: list[TareaRead]

class CambiarEstado(BaseModel):
    estado_id: int


class ProspectoUpdate(BaseModel):
    # cliente
    nombre: Optional[str]
    tipo_documento_id: Optional[int]
    numero_documento: Optional[str]
    telefono: Optional[str]
    correo: Optional[str]
    ocupacion: Optional[str]
    ciudad: Optional[str]

    canal_origen: Optional[str]
    aseguradora_interes_id: Optional[int]
    ramo_interes_id: Optional[int]
    responsable_id: Optional[int]
    observaciones: Optional[str]


class ProspectoFiltro(BaseModel):
    busqueda: str | None = None
    estado_id: int | None = None
    canal_origen: str | None = None
    responsable_id: int | None = None
    proximo_contacto: str | None = None
