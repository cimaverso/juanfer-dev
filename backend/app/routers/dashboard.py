from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.schemas.dashboard import DashboardMetricas, AlertaPoliza, ProduccionMensual, DistribucionEstado
from app.schemas.traspaso import TraspasoDetalleRead
from app.services.poliza import PolizaService
from app.services.historial_responsable import HistorialResponsableService
from typing import Optional
from app.core.security import get_current_user_data, require_admin

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

@router.get("/metricas", response_model=DashboardMetricas) 
def get_metricas(responsable_id: Optional[int] = None, db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    return PolizaService.get_metricas_dashboard(responsable_id, db, user)

@router.get("/alertas", response_model=list[AlertaPoliza]) 
def get_metricas(db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    return PolizaService.obtener_alertas(db)

@router.get("/produccion-mensual", response_model=list[ProduccionMensual])
def get_produccion_mensual(db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    return PolizaService.obtener_produccion_mensual(db)

@router.get("/distribucion-estados", response_model=list[DistribucionEstado])
def get_distribucion_estados(db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    return PolizaService.obtener_distribucion_estados(db)