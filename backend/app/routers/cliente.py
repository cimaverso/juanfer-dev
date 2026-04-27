from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.schemas.cliente import ClienteRead, ClienteCreate
from app.services.cliente import ClienteService
from app.core.security import get_current_user_data

router = APIRouter(
    prefix="/clientes",
    tags=["Clientes"]
)

@router.get("/buscar/{documento}", response_model=ClienteRead | None)
def buscar_por_documento(documento:str, db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    cliente = ClienteService.buscar_por_documento(db, documento)
    if not cliente:
        return None
    
    return cliente

@router.post("/registrar", response_model=ClienteRead)
def registrar_cliente(data: ClienteCreate, db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    cliente = ClienteService.registrar_cliente(db, data)
    if not cliente:
        raise HTTPException(status_code=409, detail="El cliente ya se encuentra registrado")
    
    return cliente