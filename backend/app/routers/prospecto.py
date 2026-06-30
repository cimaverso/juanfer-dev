from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from datetime import datetime
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.schemas.prospecto import ProspectoRead, ProspectoCreate, ProspectoListResponse, ResumenPipeline, ProspectoTareaRead, CambiarEstado, ProspectoUpdate, ProspectoFiltro, ImportarResponse, ProspectoCreateImport
from app.utils.parse_file import parse_file
from app.core.security import get_current_user_data, require_admin
from app.services.prospecto import ProspectoService
from fastapi.responses import StreamingResponse

router = APIRouter(
    prefix="/prospectos",
    tags=["Prospectos"]
)

@router.get("/plantilla-importacion")
def get_plantilla_importacion(db: Session = Depends(get_db)):
    archivo = ProspectoService.obtener_plantilla(db)

    return StreamingResponse(
        archivo,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=plantilla_prospectos.xlsx"
        },
    )

@router.get("/", response_model=ProspectoListResponse)
def obtener_prospectos(
    filtros: ProspectoFiltro = Depends(),
    page: int = 1,
    limit: int = 15,
    db: Session = Depends(get_db),
    user = Depends(get_current_user_data)
):
    return ProspectoService.obtener_prospectos(db, page, limit, user, filtros)

@router.get("/resumen-pipeline", response_model=list[ResumenPipeline])
def resumen_pipeline(db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    return ProspectoService.resumen_pipeline(db, user)

@router.get("/{id}", response_model=ProspectoRead)
def obtener_prospecto_id(id: int, db: Session = Depends(get_db)):
    return ProspectoService.obtener_prospecto_id(id, db)

@router.post("/", response_model=ProspectoRead)
def crear_prospecto(data: ProspectoCreate, db: Session = Depends(get_db)):
    return ProspectoService.crear_prospecto(db, data)

@router.post("/{id}/convertir")
def convertir_prospecto_poliza(id: int, db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    return ProspectoService.convertir_prospecto_poliza(id, db, user)

@router.post("/importar", response_model=ImportarResponse)
def importar_prospectos(data: ProspectoCreateImport, db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    return ProspectoService.importar_prospectos_csv(data, db, user)

@router.patch("/{id}/avanzar-contacto", response_model=ProspectoRead)
def avanzar_contacto(id: int, db: Session = Depends(get_db)):
    return ProspectoService.avanzar_contacto(id, db)

@router.patch("/{id}/estado", response_model=ProspectoRead)
def cambiar_estado_prospecto(id: int, estado_id: CambiarEstado, db: Session = Depends(get_db), admin = Depends(require_admin)):
    return ProspectoService.cambiar_estado_prospecto(id, estado_id, db)

@router.put("/{id}", response_model=ProspectoRead)
def editar_prospecto(id: int, data: ProspectoUpdate, db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    return ProspectoService.editar_prospecto(db, id, data, user)