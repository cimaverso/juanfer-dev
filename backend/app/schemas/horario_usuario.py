from pydantic import BaseModel, ConfigDict
from datetime import time


class HorarioDiaRead(BaseModel):
    dia_semana: str
    activo: bool
    hora_desde: time
    hora_hasta: time

    model_config = ConfigDict(from_attributes=True)


class HorarioDiaUpdate(BaseModel):
    dia_semana: str
    activo: bool
    hora_desde: time
    hora_hasta: time


class HorarioEquipoRead(BaseModel):
    usuario_id: int
    nombre: str
    rol: str
    dias: list[HorarioDiaRead]
