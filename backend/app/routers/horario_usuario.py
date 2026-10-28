from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.security import get_current_user_data, require_admin
from app.schemas.horario_usuario import HorarioDiaRead, HorarioDiaUpdate, HorarioEquipoRead
from app.services.horario_usuario import HorarioUsuarioService

router = APIRouter(
    tags=["Horarios"]
)


@router.get("/mi-horario", response_model=list[HorarioDiaRead])
def get_mi_horario(db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    return HorarioUsuarioService.obtener_horario(db, user.id)


@router.put("/mi-horario", response_model=list[HorarioDiaRead])
def put_mi_horario(
    dias: list[HorarioDiaUpdate],
    db: Session = Depends(get_db),
    user = Depends(get_current_user_data),
):
    resultado = HorarioUsuarioService.actualizar_horario(
        db, user.id, [d.model_dump() for d in dias]
    )
    if resultado == "dias_invalidos":
        raise HTTPException(
            status_code=422,
            detail="Deben enviarse los 7 días de la semana, sin repetidos ni códigos inválidos",
        )
    return resultado


@router.get("/horarios", response_model=list[HorarioEquipoRead])
def get_horarios_equipo(db: Session = Depends(get_db), user = Depends(require_admin)):
    return HorarioUsuarioService.listar_equipo(db)
