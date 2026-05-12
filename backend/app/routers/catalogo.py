from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.schemas.catalogo import EstadoPolizaRead, AseguradoraRead, ProductoRead, RamoRead, TiposDocumentoRead, CrearEstadoPoliza, ActualizarEstadoPoliza, CrearAseguradora, ActualizarAseguradora, CrearProducto, ActualizarProducto, ActualizarRamo, CrearRamo, CrearTipoDocumento, ActualizarTipoDocumento
from app.services.catalogo import CatalogoService
from app.core.security import get_current_user_data, require_admin

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


@router.post("/estados-poliza", response_model=EstadoPolizaRead, status_code=201)
def crear_estado_poliza(data: CrearEstadoPoliza, db: Session = Depends(get_db), user = Depends(get_current_user_data), admin = Depends(require_admin)):
    nuevo_estado = CatalogoService.crear_estado(db, data)

    if nuevo_estado is "400":
        raise HTTPException(
            status_code=400,
            detail="El estado de póliza ya existe"
        )
    
    return nuevo_estado

@router.post("/aseguradoras", response_model=AseguradoraRead)
def crear_aseguradora(data: CrearAseguradora, db: Session = Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    response = CatalogoService.crear_aseguradora(data, db)

    if response is None:
        raise HTTPException(
            status_code=400,
            detail="Error al crear la aseguradora"
        )
    
    return response

@router.post("/productos", response_model=ProductoRead, status_code=201)
def crear_producto(data: CrearProducto, db: Session=Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    response = CatalogoService.crear_producto(data, db)

    if response is None:
        raise HTTPException(
            status_code=400,
            detail="Error al crear el producto, debe incluir el nombre"
        )
    
    return response

@router.post("/ramos", response_model=RamoRead, status_code=201)
def crear_ramo(data: CrearRamo, db: Session=Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    response = CatalogoService.crear_ramo(data, db)

    if response is None:
        raise HTTPException(
            status_code=400,
            detail="Error al crear el ramo, debe incluir el nombre y el código"
        )
    
    return response

@router.post("/tipos-documento", response_model=TiposDocumentoRead, status_code=201)
def crear_tipo_doc(data: CrearTipoDocumento, db: Session=Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    response, obj = CatalogoService.crear_tipo_documento(data, db)

    if response == "empty_name":
        raise HTTPException(
            status_code=400,
            detail="El nombre es obligatorio"
        )
    
    if response == "duplicate":
        raise HTTPException(
            status_code=409,
            detail="Ya existe el tipo de documento"
        )

    return obj


@router.put("/estados-poliza/{id}", response_model=EstadoPolizaRead)
def update_estado_poliza(id: int, data: ActualizarEstadoPoliza, db: Session = Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    estado_updated = CatalogoService.update_estado_poliza(db, id, data)

    if estado_updated is "400":
        raise HTTPException(
            status_code=400,
            detail="El estado no existe"
        )
    
    return estado_updated

@router.put("/aseguradoras/{id}", response_model=AseguradoraRead)
def update_aseguradora(id: int, data: ActualizarAseguradora, db: Session = Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    response = CatalogoService.update_aseguradora(id, db, data)

    if response is None:
        raise HTTPException(
            status_code=404,
            detail="La aseguradora no existe"
        )
    
    return response

@router.put("/productos/{id}", response_model=ProductoRead)
def update_producto(id: int, data: ActualizarProducto, db: Session=Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    response = CatalogoService.update_producto(id, db, data)

    if response is None:
        raise HTTPException(
            status_code=404,
            detail="El producto no se encuantra registrado"
        )
    
    return response

@router.put("/ramos/{id}", response_model=RamoRead)
def update_ramo(id: int, data: ActualizarRamo, db: Session=Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    response = CatalogoService.update_ramo(id, db, data)

    if response is None:
        raise HTTPException(
            status_code=404,
            detail="El ramo no se encuantra registrado"
        )
    
    return response

@router.put("/tipos-documento/{id}", response_model=TiposDocumentoRead)
def update_tipo_doc(id: int, data: ActualizarTipoDocumento, db: Session=Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    response = CatalogoService.update_tipo_doc(id, db, data)

    if response is None:
        raise HTTPException(
            status_code=404,
            detail="El tipo de documento no se encuantra registrado"
        )
    
    return response


@router.delete("/estados-poliza/{id}", status_code=204)
def eliminar_estado(id: int, db: Session = Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    deleted = CatalogoService.eliminar_estado(id, db)

    if deleted is None:
        raise HTTPException(
            status_code=404,
            detail="Error al eliminar: Estado no encontrado"
        )
    
    return {"message": "Estado eliminado correctamente"}

@router.delete("/aseguradoras/{id}", status_code=204)
def eliminar_aseguradora(id: int, db: Session = Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    response = CatalogoService.eliminar_aseguradora(id, db)

    if response is None:
        raise HTTPException(
            status_code=404,
            detail="La aseguradora no existe"
        )
    
    return {"message": "Aseguradora eliminada correctamente"}

@router.delete("/productos/{id}", status_code=204)
def eliminar_producto(id: int, db: Session=Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    response = CatalogoService.eliminar_producto(id, db)

    if not response:
        raise HTTPException(
            status_code=404,
            detail="El producto no existe"
        )
    
    return {"message": "Producto eliminado correctamente"}

@router.delete("/ramos/{id}", status_code=204)
def eliminar_ramo(id: int, db: Session=Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    response = CatalogoService.eliminar_ramo(id, db)

    if not response:
        raise HTTPException(
            status_code=404,
            detail="El ramo no existe"
        )
    
    return {"message": "Ramo eliminado correctamente"}

@router.delete("/tipos-documento/{id}", status_code=204)
def eliminar_tipo_doc(id: int, db: Session=Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    response = CatalogoService.eliminar_tipo_doc(id, db)

    if not response:
        raise HTTPException(
            status_code=404,
            detail="El tipo de documento no existe"
        )
    
    return {"message": "Tipo de documento eliminado correctamente"}