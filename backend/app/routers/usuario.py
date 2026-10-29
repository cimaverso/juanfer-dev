from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.schemas.usuario import UsuarioRead, UsuarioCreate, UsuarioUpdate
from app.schemas.auth import CodigoResetGenerado
from app.services.usuario import UsuarioService
from app.core.security import get_current_user_data, require_admin

router = APIRouter(
    prefix="/usuarios",
    tags=["Usuarios"]
)

@router.get("/", response_model=list[UsuarioRead])
def get_usuarios_activos(db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    return UsuarioService.listar_usuarios_activos(db, user)


@router.post("/", response_model=UsuarioRead, status_code=201)
def crear_usuario(data: UsuarioCreate, db: Session = Depends(get_db), user = Depends(require_admin)):
    resultado = UsuarioService.crear(db, data)

    if resultado == "rol_invalido":
        raise HTTPException(status_code=400, detail="rol debe ser ADMIN o ASESOR")

    if resultado == "email_duplicado":
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese correo")

    return resultado


@router.put("/{usuario_id}", response_model=UsuarioRead)
def actualizar_usuario(usuario_id: int, data: UsuarioUpdate, db: Session = Depends(get_db), user = Depends(require_admin)):
    resultado = UsuarioService.actualizar(db, usuario_id, data)

    if resultado is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if resultado == "rol_invalido":
        raise HTTPException(status_code=400, detail="rol debe ser ADMIN o ASESOR")

    if resultado == "email_duplicado":
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese correo")

    return resultado


@router.delete("/{usuario_id}", status_code=204)
def eliminar_usuario(usuario_id: int, db: Session = Depends(get_db), admin = Depends(require_admin)):
    resultado = UsuarioService.eliminar(db, usuario_id, admin.id)

    if resultado is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if resultado == "no_puede_eliminarse_a_si_mismo":
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propio usuario")


@router.post("/{usuario_id}/generar-codigo-reset", response_model=CodigoResetGenerado)
def generar_codigo_reset(usuario_id: int, db: Session = Depends(get_db), user = Depends(require_admin)):
    codigo = UsuarioService.generar_codigo_reset(db, usuario_id)
    if codigo is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"codigo": codigo}