"""
Capa de persistencia del importador de Microsoft Forms: toma el resultado
de `formulario_importador_ms.parsear_formulario_ms` y lo materializa como
Formulario + FormularioGrupoPregunta + FormularioPregunta, reusando los
services del builder (para no duplicar las validaciones de catálogo/orden/
codigo_duplicado que ya tienen).

Si algo falla a mitad de la importación de UN formulario (ej. un
tipo_codigo que el catálogo no reconoce, o un error real de DB como un
texto más largo de lo que la columna permite), se borra el Formulario que
ya se había creado para ese item -- el cascade de FKs se encarga de sus
grupos y preguntas -- y se reporta el motivo. Un formulario fallido no
afecta a los demás del mismo lote (ver importar_formularios_ms).
"""

from decimal import Decimal
from typing import Optional

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.catalogos.tipo_documento import TipoDocumento
from app.models.formularios.formulario import Formulario
from app.schemas.formulario import (
    FormularioCreate,
    FormularioGrupoPreguntaCreate,
    FormularioPreguntaCreate,
)
from app.services.formulario import (
    FormularioGrupoPreguntaService,
    FormularioPreguntaService,
    FormularioService,
)
from app.services.formulario_importador_ms import parsear_formulario_ms, sin_tildes


class _ImportacionFallida(Exception):
    pass


def _detectar_categoria(titulo: str) -> Optional[str]:
    """
    Regla de negocio: si el título dice "Cotización" es formulario_categoria
    'cotizacion'; si dice "Expedición" es 'expedicion'. Si no aparece
    ninguna de las dos palabras, no se adivina -- queda para que el admin
    la indique a mano (categoria_codigo del endpoint) o le cambie el
    título al formulario.
    """
    titulo_norm = sin_tildes(titulo or "").upper()
    if "COTIZACION" in titulo_norm:
        return "cotizacion"
    if "EXPEDICION" in titulo_norm:
        return "expedicion"
    return None


def _a_decimal_orden(orden) -> Decimal:
    return Decimal(str(round(float(orden), 4)))


def _nombres_tipo_documento(db: Session) -> list[str]:
    stmt = select(TipoDocumento.nombre).order_by(TipoDocumento.nombre)
    return list(db.execute(stmt).scalars().all())


def _configuracion_para_persistir(db: Session, pregunta: dict) -> Optional[dict]:
    """
    Si la pregunta quedó vinculada a Cliente.tipo_documento (ver
    CAMPOS_CLIENTE_CRITICOS en formulario_importador_ms_codigos.py), sus
    opciones de MS Forms ("CEDULA DE CIUDADANIA", "PASAPORTE", ...) NO
    sirven: el backend resuelve el tipo de documento del Cliente buscando
    coincidencia EXACTA contra `tipo_documento.nombre` en la DB ("CC",
    "CE", "NIT", "TI" -- ver CatalogoService.get_id_tipo_doc). Si se deja
    el texto de MS Forms, todo envío público de ese formulario fallaría
    con "tipo_documento_invalido". Se reemplazan las choices por las
    reales ANTES de crear la pregunta, sin esperar a que un admin abra el
    builder (que también las sincroniza, pero solo al abrirlo).
    """
    configuracion = pregunta["configuracion"]
    if (pregunta.get("mapea_a") or {}).get("campo") != "tipo_documento":
        return configuracion

    nombres = _nombres_tipo_documento(db)
    if not nombres:
        return configuracion

    configuracion = dict(configuracion or {})
    configuracion["choices"] = nombres
    configuracion.pop("branching", None)  # las opciones cambiaron, el branching viejo ya no aplica
    return configuracion


def _crear_pregunta(db: Session, formulario_id: int, grupo_id: Optional[int], pregunta: dict):
    resultado = FormularioPreguntaService.crear(db, formulario_id, FormularioPreguntaCreate(
        grupo_id=grupo_id,
        codigo=pregunta["codigo"],
        tipo_codigo=pregunta["tipo_codigo"],
        # titulo es Text (sin límite) a propósito: algunas cláusulas
        # legales reales (habeas data) superan los 1700 caracteres y no
        # se pueden truncar, ver docs/ESTADO.md.
        titulo=pregunta["titulo"],
        subtitulo=(pregunta["subtitulo"] or None),
        requerida=pregunta["requerida"],
        orden=_a_decimal_orden(pregunta["orden"]),
        configuracion=_configuracion_para_persistir(db, pregunta),
        mapea_a=pregunta["mapea_a"],
    ))

    if isinstance(resultado, str):
        raise _ImportacionFallida(f"pregunta '{pregunta['codigo']}': {resultado}")

    return resultado


def importar_formulario_ms(db: Session, data: dict, categoria_codigo: Optional[str] = None) -> dict:
    """
    Parsea un único JSON de MS Forms y lo persiste. Devuelve siempre un
    dict con "ok": True/False -- nunca levanta una excepción hacia el
    caller, para que un lote de varios formularios pueda seguir con los
    siguientes si uno falla.
    """
    parseado = parsear_formulario_ms(data)
    titulo = parseado["titulo"] or "(sin título)"

    categoria = categoria_codigo or _detectar_categoria(titulo)
    if categoria is None:
        return {
            "titulo": titulo,
            "ok": False,
            "motivo": "no se pudo determinar categoria_codigo desde el título; indícalo a mano",
        }

    formulario = FormularioService.crear(db, FormularioCreate(
        titulo=titulo[:200],
        descripcion=(parseado["descripcion"] or None),
        categoria_codigo=categoria,
    ))

    if isinstance(formulario, str):
        return {"titulo": titulo, "ok": False, "motivo": formulario}

    try:
        for grupo in parseado["grupos"]:
            # El orden del grupo NO se autoasigna (quedaría 1, por ser el
            # primer/único grupo del formulario): se fija al de su
            # primera pregunta, para que quede en la misma posición
            # relativa a las preguntas sueltas que tenía en MS Forms.
            # Sin esto, FormularioPublico.jsx (que mezcla sueltas y
            # grupos por su propio "orden") mostraba el grupo de
            # Asegurado ANTES que el Tomador, aunque en MS Forms vaya
            # después -- bug real encontrado en PAC 60+ ya importado.
            orden_grupo = _a_decimal_orden(grupo["preguntas"][0]["orden"]) if grupo["preguntas"] else None
            grupo_obj = FormularioGrupoPreguntaService.crear(db, formulario.id, FormularioGrupoPreguntaCreate(
                codigo=grupo["codigo"],
                titulo_template=grupo["titulo_template"][:200],
                minimo_repeticiones=grupo["minimo_repeticiones"],
                maximo_repeticiones=grupo["maximo_repeticiones"],
                orden=orden_grupo,
            ))

            if isinstance(grupo_obj, str):
                raise _ImportacionFallida(f"grupo '{grupo['codigo']}': {grupo_obj}")

            for pregunta in grupo["preguntas"]:
                _crear_pregunta(db, formulario.id, grupo_obj.id, pregunta)

        for pregunta in parseado["preguntas_sueltas"]:
            _crear_pregunta(db, formulario.id, None, pregunta)

    except _ImportacionFallida as exc:
        db.delete(formulario)
        db.commit()
        return {"titulo": titulo, "ok": False, "motivo": str(exc)}
    except SQLAlchemyError as exc:
        # Un error real de DB (ej. StringDataRightTruncation por un
        # texto más largo de lo que la columna permite) deja la
        # transacción en curso inválida -- hay que revertirla ANTES de
        # poder borrar el formulario a medias, si no el db.delete()
        # de abajo también falla. Sin este catch, el error subía sin
        # control y tumbaba el lote completo de /formularios/importar-ms
        # con un 500, dejando el formulario de este ítem a medio
        # insertar (bug real: pasó con "Exclusiones" de SURAPET, ver
        # docs/ESTADO.md).
        db.rollback()
        formulario_a_medias = db.get(Formulario, formulario.id)
        if formulario_a_medias:
            db.delete(formulario_a_medias)
            db.commit()
        return {"titulo": titulo, "ok": False, "motivo": f"error de base de datos: {exc}"}

    return {
        "titulo": titulo,
        "ok": True,
        "formulario_id": formulario.id,
        "sin_mapear": parseado["sin_mapear"],
        "branching_sin_resolver": parseado["branching_sin_resolver"],
        "duplicados_omitidos": parseado["duplicados_omitidos"],
        "posibles_controles_repeticion": parseado["posibles_controles_repeticion"],
        "campos_criticos_agregados": parseado["campos_criticos_agregados"],
    }


def importar_formularios_ms(db: Session, items: list[dict], categoria_codigo: Optional[str] = None) -> dict:
    """Importa un lote (1 a N) de JSON de MS Forms, uno por uno e independiente."""
    creados = []
    fallidos = []

    for data in items:
        resultado = importar_formulario_ms(db, data, categoria_codigo)
        (creados if resultado["ok"] else fallidos).append(resultado)

    return {"creados": creados, "fallidos": fallidos}
