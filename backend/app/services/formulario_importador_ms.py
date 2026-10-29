"""
Parser puro del export de Microsoft Forms (un JSON por formulario) a la
estructura intermedia que despues alimenta a FormularioService /
FormularioGrupoPreguntaService / FormularioPreguntaService. No toca la base
de datos ni importa nada de SQLAlchemy -- es deliberado, para poder
revisar el resultado antes de conectar el paso de persistencia (ver
docs/ESTADO.md).

Cómo MS Forms repite un bloque (ej. "Asegurado #1..#4"): NO es un grupo
repetible real, son preguntas duplicadas literalmente 4 veces y encadenadas
por "BranchInfo" (una pregunta "¿Cotizar otro asegurado?" salta a la
siguiente sección si responden SI). Este parser colapsa esas 4 copias en
UN solo FormularioGrupoPregunta, quedándose solo con las preguntas de la
copia #1 (o la sección sin número, que siempre es la primera) como
plantilla; las copias #2/#3/#4 se descartan y quedan listadas en
"duplicados_omitidos" para que quien revise confirme que de verdad son
copias idénticas y no un campo distinto.
"""

import json
import re
import unicodedata
from typing import Optional

from app.services.formulario_importador_ms_codigos import (
    CAMPOS_CLIENTE_CRITICOS,
    CAMPOS_CLIENTE_NOT_NULL,
    CODIGOS_POR_TRACKING_ID,
    FRASES_A_REMOVER_DEL_TITULO,
    PATRON_CONTROL_REPETICION,
    PATRON_ENTIDAD_NUMERADA,
)

_TIPO_MS_A_CODIGO_SIMPLE = {
    "Question.ColumnGroup": "seccion",
    "Question.Rating": "calificacion",
    "Question.NPS": "nps",
    "Question.DateTime": "fecha",
    "Question.Choice": "opcion",
}

_PALABRAS_TELEFONO = re.compile(r"(?i)celular|tel[eé]fono|whatsapp")
_ENTIDADES_CONOCIDAS = ("asegurado", "delegado")

# Último recurso para detectar un campo CRÍTICO de Cliente (los 4 NOT
# NULL) cuando ni el trackingId ni el slug derivado del título coinciden
# con los nombres conocidos de CAMPOS_CLIENTE_CRITICOS. MS Forms no
# reusa el mismo trackingId para preguntas equivalentes entre formularios
# distintos (confirmado con los 17 reales: "Número de celular [del
# tomador]" tiene un trackingId diferente en Autos, Bicicletas y Plan
# Vive) -- sin esto, esas preguntas quedaban sin vincular a Cliente y el
# envío público fallaba siempre al crear el Cliente (columnas NOT NULL),
# ver docs/ESTADO.md. Solo se usa para preguntas sueltas del rol
# "tomador" (mismo alcance que CAMPOS_CLIENTE_CRITICOS).
_PATRONES_CAMPO_CRITICO = [
    (re.compile(r"(?i)tipo\s+de?\s*documento"), "tipo_documento"),
    (re.compile(r"(?i)numero\s+de?\s*documento"), "numero_documento"),
    (re.compile(r"(?i)celular"), "celular"),
    (re.compile(r"(?i)nombres?\s+y\s+apellidos|nombre\s+completo"), "nombre_completo"),
]

# Título a usar cuando el formulario original de MS Forms NO pregunta
# un campo crítico del tomador (ej. SURAPET no pide documento; Plan
# Vive no pide celular del tomador) y hay que agregarlo de cero -- ver
# _agregar_campos_criticos_faltantes.
_TITULOS_CAMPO_CRITICO = {
    "tipo_documento": "Tipo de documento del tomador",
    "numero_documento": "Número de documento del tomador",
    "nombre_completo": "Nombres y apellidos completos del tomador",
    "celular": "Celular del tomador",
}


def _detectar_campo_critico_por_contenido(titulo: str) -> Optional[str]:
    texto = sin_tildes(titulo)
    for patron, campo in _PATRONES_CAMPO_CRITICO:
        if patron.search(texto):
            return campo
    return None


# "ubicacion" (Cliente.ubicacion, ver DT-028) no es un campo NOT NULL --
# a diferencia de los 4 de arriba, nunca se agrega si falta (puede
# quedar null). Pero si el formulario SÍ trae un campo de dirección en
# la sección del TOMADOR, hay que vincularlo aunque su trackingId no
# esté en CODIGOS_POR_TRACKING_ID (pedido explícito del usuario, ver
# docs/ESTADO.md). Fuera de la sección del tomador NUNCA se vincula --
# eso ya lo garantiza el mismo "if" de más abajo (rol=="tomador" y
# entidad is None).
_PATRON_UBICACION = re.compile(r"(?i)\bdireccion\b|\bubicacion\b")


def _es_campo_ubicacion_por_contenido(titulo: str) -> bool:
    return bool(_PATRON_UBICACION.search(sin_tildes(titulo)))


def sin_tildes(texto: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", texto)
        if unicodedata.category(c) != "Mn"
    )


def _slugify(texto: str) -> str:
    texto = sin_tildes(texto).lower().strip()
    texto = re.sub(r"[^a-z0-9]+", "_", texto)
    return re.sub(r"_+", "_", texto).strip("_") or "campo"


def _derivar_codigo_base(titulo: str) -> str:
    texto = titulo
    for patron in FRASES_A_REMOVER_DEL_TITULO:
        texto = re.sub(patron, "", texto)
    return _slugify(texto)[:100]


def _detectar_rol(titulo: str) -> str:
    texto = sin_tildes(titulo).lower()
    # "tomador" y "asegurado" juntos (ej. secciones tipo "TUS DATOS
    # (TOMADOR-ASEGURADO)" en los formularios de SURAPET) describen a la
    # MISMA persona -- se resuelve como "tomador" porque es el rol que
    # dispara el vínculo automático a Cliente (ver CAMPOS_CLIENTE_CRITICOS
    # en formulario_importador_ms_codigos.py). Antes esto ganaba
    # "asegurado" por revisarse primero, y las preguntas de esa sección
    # sin la palabra "tomador" en su propio título (ej. "Tipo Documento")
    # heredaban el rol equivocado y nunca se vinculaban -- bug real
    # encontrado en EXPEDICIÓN/COTIZACIÓN PÓLIZA MASCOTAS, ver
    # docs/ESTADO.md.
    if "tomador" in texto and "asegurado" in texto:
        return "tomador"
    if "asegurado" in texto:
        return "asegurado"
    if "delegado" in texto:
        return "delegado"
    if "titular" in texto and ("cuenta" in texto or "tarjeta" in texto):
        return "titular_cuenta"
    if "tomador" in texto:
        return "tomador"
    return "general"


def _detectar_entidad_numerada(titulo: str) -> Optional[tuple[str, int]]:
    match = re.search(PATRON_ENTIDAD_NUMERADA, titulo)
    if match is None:
        return None
    entidad = sin_tildes(match.group(1)).lower().rstrip("s")
    return entidad, int(match.group(2))


def _parsear_question_info(raw: Optional[str]) -> dict:
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return {}


def _tipo_codigo_desde_ms(tipo_ms: str, titulo: str, info: dict) -> str:
    if tipo_ms in _TIPO_MS_A_CODIGO_SIMPLE:
        return _TIPO_MS_A_CODIGO_SIMPLE[tipo_ms]

    if tipo_ms != "Question.TextField":
        return "texto"

    if info.get("IsNumber"):
        return "telefono" if _PALABRAS_TELEFONO.search(titulo) else "numero"

    validacion = info.get("Validation") or {}
    if validacion.get("rule") == 11:
        return "email"

    return "texto"


def _construir_configuracion(tipo_codigo: str, info: dict) -> Optional[dict]:
    # IMPORTANTE: "choices" es una lista de strings (no de objetos
    # {value,label}) y "branching" es un dict {valor: codigo_destino} (no
    # una lista de {if_value,goto_codigo}) -- así los consume de verdad
    # FormularioBuilder.jsx y FormularioPublico.jsx en el frontend, aunque
    # el docstring de app/models/formularios/formulario_pregunta.py
    # describe la otra forma (desactualizado, ver DEUDA). Usar la forma
    # del docstring deja la página del builder en blanco (PreguntaCard
    # llama c.trim() sobre cada choice asumiendo que es un string).
    configuracion: dict = {}

    if tipo_codigo == "opcion":
        choices = [c.get("Description", "") for c in info.get("Choices", []) if c.get("Description")]
        if choices:
            configuracion["choices"] = choices
        if info.get("ChoiceType") == 2:
            # Selección múltiple: el dato queda guardado para cuando el
            # frontend la soporte -- hoy FormularioBuilder/FormularioPublico
            # solo renderizan selección única (radio), ver DEUDA.
            configuracion["multiple"] = True
        if info.get("AllowOtherAnswer"):
            configuracion["allow_other"] = True

    validacion: dict = {}
    if info.get("IsNumber") and tipo_codigo in ("numero", "telefono"):
        validacion["es_numero"] = True
    rule = (info.get("Validation") or {}).get("rule")
    if rule == 11:
        validacion["es_email"] = True
    if validacion:
        configuracion["validacion"] = validacion

    return configuracion or None


def parsear_formulario_ms(data: dict) -> dict:
    """
    Toma el JSON completo tal como lo exporta Microsoft Forms (la forma
    {"data": {"form": {...}}}) y devuelve la estructura intermedia:

    {
      "titulo": str,
      "descripcion": Optional[str],
      "grupos": [{"codigo", "titulo_template", "minimo_repeticiones",
                  "maximo_repeticiones", "preguntas": [pregunta, ...]}],
      "preguntas_sueltas": [pregunta, ...],
      "duplicados_omitidos": [{"ms_forms_id", "titulo", "entidad", "numero"}],
      "sin_mapear": [{"ms_forms_id", "titulo", "tracking_id", "codigo_generado"}],
      "branching_sin_resolver": [{"pregunta_codigo", "opcion", "target_ms_forms_id"}],
      "posibles_controles_repeticion": [{"ms_forms_id", "titulo", "codigo"}],
    }

    pregunta = {"codigo", "tipo_codigo", "titulo", "subtitulo", "requerida",
                "orden", "configuracion", "mapea_a", "_ms_forms_id"}

    No escribe nada en la base de datos.
    """
    form = data["data"]["form"]
    secciones = form.get("descriptiveQuestions") or []
    preguntas_ms = form.get("questions") or []

    items = sorted(secciones + preguntas_ms, key=lambda it: it["order"])

    # Paso 1: qué entidades son repetibles (aparecen con #2 o más en algún lado)
    entidades_repetibles: dict[str, int] = {}
    for item in items:
        if item["type"] != "Question.ColumnGroup":
            continue
        detectado = _detectar_entidad_numerada(item["title"])
        if detectado:
            entidad, numero = detectado
            entidades_repetibles[entidad] = max(entidades_repetibles.get(entidad, 0), numero)

    # Paso 2: clasificar cada item (sección o pregunta) con su contexto
    nodos = []
    entidad_actual: Optional[str] = None
    numero_actual: Optional[int] = None
    rol_actual = "general"

    for item in items:
        info = _parsear_question_info(item.get("questionInfo"))
        es_seccion = item["type"] == "Question.ColumnGroup"
        titulo = item["title"].strip()

        if es_seccion:
            detectado = _detectar_entidad_numerada(titulo)
            if detectado:
                entidad, numero = detectado
            else:
                entidad = next(
                    (e for e in _ENTIDADES_CONOCIDAS
                     if e in sin_tildes(titulo).lower() and e in entidades_repetibles),
                    None
                )
                numero = 1 if entidad else None
            entidad_actual, numero_actual = entidad, numero
            rol_actual = _detectar_rol(titulo)
            rol_nodo = rol_actual
        else:
            # El rol de una pregunta sale primero de su propio título (más
            # confiable); solo cae al rol de la sección si el título de la
            # pregunta no menciona ningún rol (ej. "Dirección completa").
            rol_propio = _detectar_rol(titulo)
            rol_nodo = rol_propio if rol_propio != "general" else rol_actual

        omitir = entidad_actual is not None and numero_actual is not None and numero_actual > 1

        nodos.append({
            "ms_forms_id": item["id"],
            "titulo": titulo,
            "subtitulo": item.get("subtitle"),
            "requerida": bool(item.get("required")),
            "orden": item["order"],
            "tracking_id": item.get("trackingId"),
            "tipo_codigo": _tipo_codigo_desde_ms(item["type"], titulo, info),
            "info": info,
            "entidad": entidad_actual,
            "numero": numero_actual if entidad_actual else None,
            "rol": rol_nodo,
            "omitir": omitir,
        })

    # Paso 3: asignar `codigo` a los nodos que SÍ se van a importar
    sin_mapear = []
    codigos_usados: set[str] = set()
    ms_id_a_codigo: dict[str, str] = {}

    for nodo in nodos:
        if nodo["omitir"]:
            continue

        base = CODIGOS_POR_TRACKING_ID.get(nodo["tracking_id"])
        if base is None:
            base = _derivar_codigo_base(nodo["titulo"])
            sin_mapear.append({
                "ms_forms_id": nodo["ms_forms_id"],
                "titulo": nodo["titulo"],
                "tracking_id": nodo["tracking_id"],
                "codigo_generado": base,
            })

        prefijo = nodo["entidad"] or (nodo["rol"] if nodo["rol"] != "general" else None)
        codigo = f"{prefijo}.{base}" if prefijo else base

        sufijo = 2
        codigo_final = codigo
        while codigo_final in codigos_usados:
            codigo_final = f"{codigo}_{sufijo}"
            sufijo += 1
        codigos_usados.add(codigo_final)

        nodo["codigo"] = codigo_final
        ms_id_a_codigo[nodo["ms_forms_id"]] = codigo_final

        # Vínculo automático a Cliente: solo preguntas sueltas (sin grupo)
        # del rol "tomador" -- el builder tampoco permite vincular
        # preguntas dentro de un grupo repetible (ver FormularioBuilder.jsx).
        vinculo = None
        if nodo["rol"] == "tomador" and nodo["entidad"] is None and nodo["tipo_codigo"] != "seccion":
            vinculo = CAMPOS_CLIENTE_CRITICOS.get(base) or CAMPOS_CLIENTE_CRITICOS.get(
                _detectar_campo_critico_por_contenido(nodo["titulo"])
            )
            if not vinculo and _es_campo_ubicacion_por_contenido(nodo["titulo"]):
                vinculo = CAMPOS_CLIENTE_CRITICOS.get("pais_departamento_ciudad")
        nodo["vinculo_cliente"] = vinculo
        if vinculo:
            # El tipo queda fijo al correcto para esa columna real de
            # Cliente, igual que si un admin la vinculara a mano (ej.
            # numero_documento se fuerza a 'texto' aunque MS Forms la haya
            # marcado IsNumber -> 'numero').
            nodo["tipo_codigo"] = vinculo["tipo_forzado"]

    # Paso 4: branching + configuracion, ahora que todos los codigo existen
    branching_sin_resolver = []
    posibles_controles_repeticion = []

    for nodo in nodos:
        if nodo["omitir"]:
            continue

        configuracion = _construir_configuracion(nodo["tipo_codigo"], nodo["info"])

        if nodo["tipo_codigo"] == "opcion":
            # branching real: dict {valor_de_la_opcion: codigo_destino} (no
            # una lista de {if_value,goto_codigo} -- ver nota en
            # _construir_configuracion).
            branching = {}
            for choice in nodo["info"].get("Choices", []):
                target = (choice.get("BranchInfo") or {}).get("TargetQuestionId")
                if not target:
                    continue
                valor = choice.get("Description", "")
                goto_codigo = ms_id_a_codigo.get(target)
                if goto_codigo is None:
                    branching_sin_resolver.append({
                        "pregunta_codigo": nodo["codigo"],
                        "opcion": valor,
                        "target_ms_forms_id": target,
                    })
                    continue
                branching[valor] = goto_codigo
            if branching:
                configuracion = configuracion or {}
                configuracion["branching"] = branching

        nodo["configuracion"] = configuracion

        if re.search(PATRON_CONTROL_REPETICION, nodo["titulo"]):
            posibles_controles_repeticion.append({
                "ms_forms_id": nodo["ms_forms_id"],
                "titulo": nodo["titulo"],
                "codigo": nodo["codigo"],
            })

    # Paso 5: armar la salida (grupos vs preguntas sueltas vs duplicados)
    def _a_pregunta(nodo: dict) -> dict:
        return {
            "codigo": nodo["codigo"],
            "tipo_codigo": nodo["tipo_codigo"],
            "titulo": nodo["titulo"],
            "subtitulo": nodo["subtitulo"],
            "requerida": nodo["requerida"],
            "orden": nodo["orden"],
            "configuracion": nodo["configuracion"],
            "mapea_a": {"entidad": "cliente", "campo": nodo["vinculo_cliente"]["campo"]} if nodo["vinculo_cliente"] else None,
            "_ms_forms_id": nodo["ms_forms_id"],
        }

    grupos_por_entidad: dict[str, dict] = {}
    preguntas_sueltas = []
    duplicados_omitidos = []

    for nodo in nodos:
        if nodo["omitir"]:
            duplicados_omitidos.append({
                "ms_forms_id": nodo["ms_forms_id"],
                "titulo": nodo["titulo"],
                "entidad": nodo["entidad"],
                "numero": nodo["numero"],
            })
            continue

        if nodo["entidad"] is None:
            preguntas_sueltas.append(_a_pregunta(nodo))
            continue

        grupo = grupos_por_entidad.setdefault(nodo["entidad"], {
            "codigo": nodo["entidad"],
            "titulo_template": nodo["titulo"] if nodo["tipo_codigo"] == "seccion" else f"{nodo['entidad'].capitalize()} #{{n}}",
            "minimo_repeticiones": 0,
            "maximo_repeticiones": entidades_repetibles.get(nodo["entidad"]),
            "preguntas": [],
        })
        grupo["preguntas"].append(_a_pregunta(nodo))

    # Paso 6: si el formulario original de MS Forms NO pregunta alguno de
    # los 4 campos NOT NULL de Cliente (ej. SURAPET no pide documento;
    # Plan Vive no pide celular del tomador), se agrega la pregunta que
    # falte directo en la sección del tomador, obligatoria. Sin esto el
    # formulario se publica igual, pero TODO envío público falla al
    # intentar crear el Cliente (columnas NOT NULL) -- encontrado al
    # revisar los 17 formularios reales, ver docs/ESTADO.md.
    vinculados = {p["mapea_a"]["campo"] for p in preguntas_sueltas if p["mapea_a"]}
    campos_criticos_agregados = [
        campo for campo in CAMPOS_CLIENTE_NOT_NULL if campo not in vinculados
    ]
    if campos_criticos_agregados:
        ordenes_tomador = [n["orden"] for n in nodos if n["rol"] == "tomador" and not n["omitir"]]
        orden_base = max(ordenes_tomador) if ordenes_tomador else 0
        for i, campo in enumerate(campos_criticos_agregados, start=1):
            info = CAMPOS_CLIENTE_CRITICOS[campo]
            preguntas_sueltas.append({
                "codigo": f"tomador.{campo}",
                "tipo_codigo": info["tipo_forzado"],
                "titulo": _TITULOS_CAMPO_CRITICO[campo],
                "subtitulo": None,
                "requerida": True,
                "orden": orden_base + i * 0.1,
                "configuracion": {"choices": ["CEDULA DE CIUDADANIA", "CEDULA DE EXTRANJERIA"]} if campo == "tipo_documento" else None,
                "mapea_a": {"entidad": "cliente", "campo": campo},
                "_ms_forms_id": None,
            })

    return {
        "titulo": form.get("title"),
        "descripcion": form.get("description"),
        "grupos": list(grupos_por_entidad.values()),
        "preguntas_sueltas": preguntas_sueltas,
        "duplicados_omitidos": duplicados_omitidos,
        "sin_mapear": sin_mapear,
        "branching_sin_resolver": branching_sin_resolver,
        "posibles_controles_repeticion": posibles_controles_repeticion,
        "campos_criticos_agregados": campos_criticos_agregados,
    }
