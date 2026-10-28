from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
from app.core.db import get_db
from app.schemas.formulario import (
    FormularioRead, FormularioCreate, FormularioUpdate,
    FormularioVersionRead,
    FormularioGrupoPreguntaRead, FormularioGrupoPreguntaCreate, FormularioGrupoPreguntaUpdate,
    FormularioPreguntaRead, FormularioPreguntaCreate, FormularioPreguntaUpdate
)
from app.schemas.formulario_respuesta import FormularioRespuestaRead, FormularioMetricasRead
from app.services.formulario import (
    FormularioService, FormularioVersionService,
    FormularioGrupoPreguntaService, FormularioPreguntaService
)
from app.services.formulario_respuesta import FormularioRespuestaService
from app.core.security import get_current_user_data, require_admin

router = APIRouter(
    prefix="/formularios",
    tags=["Formularios"]
)


@router.get("", response_model=list[FormularioRead])
def listar_formularios(
    categoria_codigo: str | None = Query(None),
    estado_codigo: str | None = Query(None),
    titulo: str | None = Query(None),
    fecha_desde: date | None = Query(None),
    fecha_hasta: date | None = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user_data),
):
    return FormularioService.listar(
        db,
        categoria_codigo=categoria_codigo,
        estado_codigo=estado_codigo,
        titulo=titulo,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
    )


@router.get("/{id}", response_model=FormularioRead)
def obtener_formulario(id: int, db: Session = Depends(get_db), user=Depends(get_current_user_data)):
    formulario = FormularioService.obtener(db, id)

    if not formulario:
        raise HTTPException(status_code=404, detail="El formulario no existe")

    return formulario


@router.post("", response_model=FormularioRead, status_code=201)
def crear_formulario(data: FormularioCreate, db: Session = Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    resultado = FormularioService.crear(db, data)

    if resultado == "categoria_invalida":
        raise HTTPException(status_code=400, detail="categoria_codigo no corresponde a ningún valor de formulario_categoria")

    return resultado


@router.put("/{id}", response_model=FormularioRead)
def actualizar_formulario(id: int, data: FormularioUpdate, db: Session = Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    formulario = FormularioService.actualizar(db, id, data)

    if formulario is None:
        raise HTTPException(status_code=404, detail="El formulario no existe")

    if formulario == "categoria_invalida":
        raise HTTPException(status_code=400, detail="categoria_codigo no corresponde a ningún valor de formulario_categoria")

    return formulario


@router.delete("/{id}", status_code=204)
def eliminar_formulario(id: int, db: Session = Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    resultado = FormularioService.eliminar(db, id)

    if resultado is None:
        raise HTTPException(status_code=404, detail="El formulario no existe")

    if resultado == "tiene_respuestas":
        raise HTTPException(status_code=409, detail="No se puede eliminar: el formulario ya tiene respuestas")


# ── Publicación / versiones ────────────────────────────────────────────

@router.get("/{formulario_id}/versiones", response_model=list[FormularioVersionRead])
def listar_versiones(formulario_id: int, db: Session = Depends(get_db), user=Depends(get_current_user_data)):
    return FormularioVersionService.listar(db, formulario_id)


@router.post("/{formulario_id}/publicar", response_model=FormularioVersionRead, status_code=201)
def publicar_formulario(formulario_id: int, db: Session = Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    nueva_version = FormularioVersionService.publicar(db, formulario_id)

    if nueva_version is None:
        raise HTTPException(status_code=404, detail="El formulario no existe")

    return nueva_version


# ── Respuestas (vista admin) ───────────────────────────────────────────

@router.get("/{formulario_id}/respuestas", response_model=list[FormularioRespuestaRead])
def listar_respuestas(formulario_id: int, db: Session = Depends(get_db), user=Depends(get_current_user_data)):
    return FormularioRespuestaService.listar(db, formulario_id)


@router.get("/{formulario_id}/metricas", response_model=FormularioMetricasRead)
def obtener_metricas(formulario_id: int, db: Session = Depends(get_db), user=Depends(get_current_user_data)):
    metricas = FormularioRespuestaService.metricas(db, formulario_id)

    if metricas is None:
        raise HTTPException(status_code=404, detail="El formulario no existe")

    return metricas


# ── Grupos de pregunta ──────────────────────────────────────────────────

@router.get("/{formulario_id}/grupos", response_model=list[FormularioGrupoPreguntaRead])
def listar_grupos(formulario_id: int, db: Session = Depends(get_db), user=Depends(get_current_user_data)):
    return FormularioGrupoPreguntaService.listar(db, formulario_id)


@router.post("/{formulario_id}/grupos", response_model=FormularioGrupoPreguntaRead, status_code=201)
def crear_grupo(formulario_id: int, data: FormularioGrupoPreguntaCreate, db: Session = Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    if not FormularioService.obtener(db, formulario_id):
        raise HTTPException(status_code=404, detail="El formulario no existe")

    resultado = FormularioGrupoPreguntaService.crear(db, formulario_id, data)

    if resultado == "codigo_duplicado":
        raise HTTPException(status_code=409, detail="Ya existe un grupo con ese código en este formulario")

    return resultado


@router.put("/grupos/{id}", response_model=FormularioGrupoPreguntaRead)
def actualizar_grupo(id: int, data: FormularioGrupoPreguntaUpdate, db: Session = Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    resultado = FormularioGrupoPreguntaService.actualizar(db, id, data)

    if resultado is None:
        raise HTTPException(status_code=404, detail="El grupo no existe")

    if resultado == "codigo_duplicado":
        raise HTTPException(status_code=409, detail="Ya existe un grupo con ese código en este formulario")

    return resultado


@router.delete("/grupos/{id}", status_code=204)
def eliminar_grupo(id: int, db: Session = Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    resultado = FormularioGrupoPreguntaService.eliminar(db, id)

    if resultado is None:
        raise HTTPException(status_code=404, detail="El grupo no existe")


# ── Preguntas ─────────────────────────────────────────────────────────────

@router.get("/{formulario_id}/preguntas", response_model=list[FormularioPreguntaRead])
def listar_preguntas(formulario_id: int, db: Session = Depends(get_db), user=Depends(get_current_user_data)):
    return FormularioPreguntaService.listar(db, formulario_id)


@router.post("/{formulario_id}/preguntas", response_model=FormularioPreguntaRead, status_code=201)
def crear_pregunta(formulario_id: int, data: FormularioPreguntaCreate, db: Session = Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    if not FormularioService.obtener(db, formulario_id):
        raise HTTPException(status_code=404, detail="El formulario no existe")

    resultado = FormularioPreguntaService.crear(db, formulario_id, data)

    if resultado == "codigo_duplicado":
        raise HTTPException(status_code=409, detail="Ya existe una pregunta con ese código en este formulario")

    if resultado == "tipo_invalido":
        raise HTTPException(status_code=400, detail="tipo_codigo no corresponde a ningún valor de formulario_pregunta_tipo")

    if resultado == "grupo_no_pertenece":
        raise HTTPException(status_code=400, detail="El grupo indicado no pertenece a este formulario")

    return resultado


@router.put("/preguntas/{id}", response_model=FormularioPreguntaRead)
def actualizar_pregunta(id: int, data: FormularioPreguntaUpdate, db: Session = Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    resultado = FormularioPreguntaService.actualizar(db, id, data)

    if resultado is None:
        raise HTTPException(status_code=404, detail="La pregunta no existe")

    if resultado == "codigo_duplicado":
        raise HTTPException(status_code=409, detail="Ya existe una pregunta con ese código en este formulario")

    if resultado == "tipo_invalido":
        raise HTTPException(status_code=400, detail="tipo_codigo no corresponde a ningún valor de formulario_pregunta_tipo")

    if resultado == "grupo_no_pertenece":
        raise HTTPException(status_code=400, detail="El grupo indicado no pertenece a este formulario")

    return resultado


@router.delete("/preguntas/{id}", status_code=204)
def eliminar_pregunta(id: int, db: Session = Depends(get_db), user=Depends(get_current_user_data), admin=Depends(require_admin)):
    resultado = FormularioPreguntaService.eliminar(db, id)

    if resultado is None:
        raise HTTPException(status_code=404, detail="La pregunta no existe")
