from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.schemas.formulario import CatalogoValorRead


class FormularioPublicoRead(BaseModel):
    """Vista pública (sin login) de la versión activa de un formulario."""
    titulo: str
    descripcion: Optional[str] = None
    configuracion: Optional[dict] = None
    estructura: dict


class FormularioRespuestaCreate(BaseModel):
    respuestas: dict
    metadatos: Optional[dict] = None


class FormularioRespuestaRead(BaseModel):
    id: int
    formulario_id: int
    formulario_version_id: Optional[int] = None
    cliente_id: Optional[int] = None
    poliza_id: Optional[int] = None
    cotizacion_id: Optional[int] = None
    respuestas: dict
    estado: CatalogoValorRead
    metadatos: Optional[dict] = None
    iniciado_at: datetime
    completado_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
