from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.schemas.usuario import UsuarioRead
from app.services.usuario import UsuarioService
from app.core.security import get_current_user_data

router = APIRouter(
    prefix="/usuarios",
    tags=["Usuarios"]
)

@router.get("/", response_model=list[UsuarioRead])
def get_usuarios_activos(db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    return UsuarioService.listar_usuarios_activos(db)