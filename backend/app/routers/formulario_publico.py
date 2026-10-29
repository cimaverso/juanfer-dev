from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import uuid
from app.core.db import get_db
from app.models.formularios.constantes import FormularioEstadoCodigos
from app.schemas.formulario_respuesta import FormularioPublicoRead, FormularioRespuestaCreate, FormularioRespuestaRead
from app.services.formulario import FormularioService
from app.services.formulario_respuesta import FormularioRespuestaService

router = APIRouter(
    prefix="/public/formularios",
    tags=["Formularios (público)"]
)


@router.get("/{token_publico}", response_model=FormularioPublicoRead)
def obtener_formulario_publico(token_publico: uuid.UUID, db: Session = Depends(get_db)):
    formulario = FormularioService.obtener_por_token(db, token_publico)

    # Antes solo chequeaba version_activa_id: un formulario archivado
    # (que conserva su version_activa_id, ver FormularioService.actualizar)
    # seguía mostrando la página pública completa y solo fallaba al
    # enviar la respuesta -- confuso para quien ya la diligenció. Mismo
    # criterio que FormularioRespuestaService.crear.
    if not formulario or formulario.version_activa_id is None or formulario.estado.codigo != FormularioEstadoCodigos.ACTIVO:
        raise HTTPException(status_code=404, detail="El formulario no existe o no está publicado")

    version = formulario.version_activa

    return FormularioPublicoRead(
        titulo=formulario.titulo,
        descripcion=formulario.descripcion,
        configuracion=formulario.configuracion,
        estructura=version.estructura
    )


@router.post("/{token_publico}/respuestas", response_model=FormularioRespuestaRead, status_code=201)
def enviar_respuesta(token_publico: uuid.UUID, data: FormularioRespuestaCreate, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    resultado = FormularioRespuestaService.crear(db, token_publico, data, ip, user_agent)

    if resultado == "no_encontrado":
        raise HTTPException(status_code=404, detail="El formulario no existe")

    if resultado == "no_disponible":
        raise HTTPException(status_code=409, detail="El formulario no está activo ni publicado")

    if resultado == "limite_ip":
        raise HTTPException(status_code=429, detail="Demasiados envíos desde este origen, intenta más tarde")

    if resultado == "faltan_campos_cliente":
        raise HTTPException(status_code=400, detail="El formulario no tiene mapeadas las preguntas obligatorias del tomador (numero_documento)")

    if resultado == "tipo_documento_invalido":
        raise HTTPException(status_code=400, detail="El tipo de documento enviado no existe en el catálogo")

    if isinstance(resultado, tuple) and resultado[0] == "validacion":
        raise HTTPException(status_code=400, detail={"mensaje": "Hay respuestas inválidas o faltantes", "preguntas": resultado[1]})

    return resultado
