from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.schemas.catalogo import EstadoPolizaRead, AseguradoraRead, ProductoRead, RamoRead, TiposDocumentoRead
from app.services.catalogo import CatalogoService
from app.core.security import get_current_user_data

router = APIRouter(
    prefix="/catalogos",
    tags=["Catálogos Maestros"]
)

@router.get("/estados-poliza", response_model=list[EstadoPolizaRead])
def get_estados_poliza(db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    return CatalogoService.get_estados_poliza(db)

@router.get("/aseguradoras", response_model=list[AseguradoraRead])
def get_aseguradoras(db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    return CatalogoService.get_aseguradoras(db)

@router.get("/productos", response_model=list[ProductoRead])
def get_productos(db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    return CatalogoService.get_productos(db)

@router.get("/ramos", response_model=list[RamoRead])
def get_ramos(db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    return CatalogoService.get_ramos(db)

@router.get("/tipos-documento", response_model=list[TiposDocumentoRead])
def get_tipos_documento(db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    return CatalogoService.get_tipos_documento(db)