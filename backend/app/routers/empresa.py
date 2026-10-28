from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.security import get_current_user_data, require_admin
from app.schemas.empresa import EmpresaRead, EmpresaUpdate
from app.services.empresa import EmpresaService

router = APIRouter(
    prefix="/empresa",
    tags=["Empresa"]
)


@router.get("", response_model=EmpresaRead)
def get_empresa(db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    return EmpresaService.obtener(db)


@router.put("", response_model=EmpresaRead)
def put_empresa(
    datos: EmpresaUpdate,
    db: Session = Depends(get_db),
    user = Depends(require_admin),
):
    return EmpresaService.actualizar(db, datos.model_dump())
