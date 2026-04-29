from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional

class TraspasoDetalleRead(BaseModel):
    id: int
    poliza_id: int
    
    # IDs de referencia
    usuario_anterior_id: int
    nombre_anterior: str = Field(validation_alias="nombre_usuario_anterior")
    usuario_nuevo_id: int
    nombre_nuevo: str = Field(validation_alias="nombre_usuario_nuevo")
    realizado_por_id: int
    realizado_por: str = Field(validation_alias="nombre_admin")
    
    # Nombres (asumiendo que los extraes de las relaciones del modelo SQLAlchemy)
    
    tipo: str
    motivo: str
    fecha: datetime

    # Permite que Pydantic lea modelos de SQLAlchemy directamente
    model_config = ConfigDict(from_attributes=True)

class PolizaTraspasoResponse(BaseModel):
    poliza: dict  
    traspaso: TraspasoDetalleRead