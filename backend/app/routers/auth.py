from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.schemas.auth import Token, ValidarCodigoResetRequest, ResetPasswordRequest
from app.services.auth import auth_service
from app.services.usuario import UsuarioService

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

@router.post("/login", response_model=Token)
async def login(request: Request, db: Session = Depends(get_db)):
    try:
        body = await request.json()
        email = body.get("email")
        password = body.get("password")
    except Exception:
        form_data = await request.form()
        email = form_data.get("username")
        password = form_data.get("password")

    if not email or not password:
        raise HTTPException(status_code=422, detail="Email y password son requeridos")
    
    token_response = auth_service.authenticate_user(email, password, db)

    if not token_response:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    return token_response


@router.post("/validar-codigo-reset")
def validar_codigo_reset(datos: ValidarCodigoResetRequest, db: Session = Depends(get_db)):
    if not UsuarioService.validar_codigo_reset(db, datos.email, datos.codigo):
        raise HTTPException(status_code=400, detail="Código inválido o expirado")
    return {"valido": True}


@router.post("/reset-password")
def reset_password(datos: ResetPasswordRequest, db: Session = Depends(get_db)):
    ok = UsuarioService.completar_reset_password(db, datos.email, datos.codigo, datos.nueva_password)
    if not ok:
        raise HTTPException(status_code=400, detail="Código inválido o expirado")
    return {"actualizado": True}