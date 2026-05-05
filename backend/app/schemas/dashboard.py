from pydantic import BaseModel
from typing import Optional, Literal
from pydantic import BaseModel
from decimal import Decimal

class DashboardMetricas(BaseModel):
    total_polizas: int
    expedidas: int
    en_proceso: int
    pospuestas: int
    declinadas: int
    canceladas: int

    prima_total: Decimal
    prima_mes: Decimal

    polizas_mes: int
    sin_expedicion: int
    alertas_criticas: int

    tasa_exito: float  # porcentaje (ej: 73 = 73%)

    meta_prima_mes: Decimal
    meta_polizas_mes: int

class AlertaPoliza(BaseModel):
    poliza_id: int
    cliente_nombre: str

    estado: Optional[str] = None
    responsable: Optional[str] = None

    dias_sin_exp: int

    nivel: Literal["info", "atencion", "critico"]

class ProduccionMensual(BaseModel):
    mes: str  # formato YYYY-MM
    total_polizas: int
    prima_total: Decimal

class DistribucionEstado(BaseModel):
    estado: str
    cantidad: int
    color: str
    #total: int