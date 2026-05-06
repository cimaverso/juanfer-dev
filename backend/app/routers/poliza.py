from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from datetime import datetime
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.schemas.poliza import PolizaListResponse, PolizaFiltro, PolizaRead, PolizaCreate, PolizaUpdate, PolizaDelete, PolizaTraspasoRead, PolizaTraspaso
from app.schemas.traspaso import TraspasoDetalleRead
from app.services.poliza import PolizaService
from app.services.historial_responsable import HistorialResponsableService
from app.utils.parse_file import parse_file
from app.core.security import get_current_user_data, require_admin

router = APIRouter(
    prefix="/polizas",
    tags=["Polizas"]
)

@router.get("/", response_model=PolizaListResponse)
def listar_polizas(
    filtros: PolizaFiltro = Depends(),
    db: Session = Depends(get_db),
    user = Depends(get_current_user_data)
):
    return PolizaService.listar_polizas(filtros, db)

@router.post("/", response_model=PolizaRead)
def crear_poliza(poliza: PolizaCreate, db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    poliza = PolizaService.crear_poliza(poliza, db)

    if poliza is None:
        raise HTTPException(
            status_code=400, 
            detail="Error en los datos: Tipo de documento no válido o cliente no procesable"
        )
        
    return poliza

# Importación y exportación Excel (PRIMERO antes de rutas dinámicas)

@router.post("/importar")
def importar_polizas(
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_data)
):
    if current_user.rol != "ADMIN":
        raise HTTPException(status_code=403, detail="Sin permisos")

    try:
        rows = parse_file(archivo)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato no soportado")

    if not rows:
        raise HTTPException(status_code=422, detail="Archivo vacío")

    try:
        result = PolizaService.importar_desde_rows(
            rows,
            current_user,
            db
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/exportar")
def exportar_polizas(
    estado: str = None,
    aseguradora: str = None,
    ramo: str = None,
    mes: str = None,
    responsable_id: int = None,
    search: str = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_data)
):
    filtros = {
        "estado": estado,
        "aseguradora": aseguradora,
        "ramo": ramo,
        "mes": mes,
        "responsable_id": responsable_id,
        "search": search
    }

    file = PolizaService.exportar_polizas(db, current_user, filtros)

    filename = f"polizas_{datetime.now().date()}.xlsx"

    return StreamingResponse(
        file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

# Rutas específicas

@router.get("/meses-disponibles", response_model=list[str])
def obtener_meses(db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    return PolizaService.obtener_meses(db)

@router.get("/ramos-usados", response_model=list[str])
def obtener_ramos_usados(db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    return PolizaService.obtener_ramos_usados(db)

# Rutas dinámicas (AL FINAL)

@router.get("/{id}", response_model=PolizaRead)
def get_poliza_id(id: int, db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    return PolizaService.buscar_poliza_id(id, db)

@router.put("/{poliza_id}", response_model=PolizaRead)
def editar_poliza(
    poliza_id: int, 
    poliza_in: PolizaUpdate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_data),
):
    resultado = PolizaService.actualizar_poliza(db, poliza_id, poliza_in, current_user)

    if resultado == "NOT_FOUND":
        raise HTTPException(status_code=404, detail="La póliza no existe")
        
    if resultado == "FORBIDDEN":
        raise HTTPException(status_code=403, detail="No tienes permiso para editar esta póliza")
        
    if resultado == "CONFLICT":
        raise HTTPException(
            status_code=409, 
            detail="Conflicto de edición: El registro fue modificado por otro usuario. Por favor recarga los datos."
        )

    return resultado

@router.post("/{id}/traspaso", response_model=PolizaTraspasoRead)
def traspaso_poliza(id: int, traspaso_data: PolizaTraspaso, db: Session = Depends(get_db), user = Depends(get_current_user_data), admin = Depends(require_admin)):
    response = PolizaService.traspasar_poliza(id, traspaso_data, db)

    if not response:
        raise HTTPException(
            status_code=404,
            detail="Póliza no encontrada"
        )
    return response

@router.get("/{id}/historial-responsable", response_model=list[TraspasoDetalleRead])
def get_historial_responsable(id: int, db: Session = Depends(get_db), user = Depends(get_current_user_data)):
    return HistorialResponsableService.get_historial_id(id, db)

@router.delete("/", response_model=PolizaDelete)
def eliminar_poliza(id_poliza: int, db: Session = Depends(get_db), user = Depends(get_current_user_data), admin = Depends(require_admin)):
    response = PolizaService.borrar_poliza(id_poliza, db)

    if response == "NOT FOUND":
        raise HTTPException(
            status_code=400,
            detail="No se encontró la póliza"
        )
    
    return response