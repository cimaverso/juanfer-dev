import json
from pathlib import Path

from app.services.formulario_importador_ms import parsear_formulario_ms

FIXTURES = Path(__file__).parent / "fixtures" / "ms_forms"


def _cargar(nombre: str) -> dict:
    with open(FIXTURES / nombre, encoding="utf-8") as f:
        return json.load(f)


def _buscar(preguntas, codigo):
    return next((p for p in preguntas if p["codigo"] == codigo), None)


def test_autos_sin_grupos_repetibles():
    resultado = parsear_formulario_ms(_cargar("autos.json"))

    assert resultado["titulo"] == "COTIZACIÓN PÓLIZA AUTOS Y MOTOS"
    assert resultado["grupos"] == []
    assert resultado["duplicados_omitidos"] == []

    sueltas = resultado["preguntas_sueltas"]
    assert len(sueltas) == len(_cargar("autos.json")["data"]["form"]["questions"]) \
        + len(_cargar("autos.json")["data"]["form"]["descriptiveQuestions"])

    # Los 4 campos NOT NULL de Cliente quedan vinculados automáticamente
    # (mapea_a) -- igual que si un admin los vinculara a mano en el
    # builder. Las choices de tipo_documento siguen siendo las de MS Forms
    # acá (el parser no toca la DB); la capa de persistencia es la que
    # las reemplaza por las reales (CC/CE/NIT/TI), ver
    # test_formulario_importador_ms_persistencia.py.
    tipo_doc = _buscar(sueltas, "tomador.tipo_documento")
    assert tipo_doc is not None
    assert tipo_doc["tipo_codigo"] == "opcion"
    assert tipo_doc["mapea_a"] == {"entidad": "cliente", "campo": "tipo_documento"}
    assert tipo_doc["configuracion"]["choices"] == ["CEDULA DE CIUDADANIA", "CEDULA DE EXTRANJERIA"]

    # numero_documento venía como IsNumber->'numero' desde MS Forms, pero
    # se fuerza a 'texto' porque así es la columna real de Cliente.
    numero_doc = _buscar(sueltas, "tomador.numero_documento")
    assert numero_doc["tipo_codigo"] == "texto"
    assert numero_doc["mapea_a"] == {"entidad": "cliente", "campo": "numero_documento"}

    celular = _buscar(sueltas, "tomador.celular")
    assert celular["tipo_codigo"] == "telefono"
    assert celular["mapea_a"] == {"entidad": "cliente", "campo": "celular"}

    nombre = _buscar(sueltas, "tomador.nombre_completo")
    assert nombre["mapea_a"] == {"entidad": "cliente", "campo": "nombre_completo"}

    # correo no es uno de los 4 campos críticos -> no se vincula solo
    correo = _buscar(sueltas, "tomador.correo")
    assert correo["tipo_codigo"] == "email"
    assert correo["mapea_a"] is None

    # branching simple: "Moto" salta a "Modelo y línea" (sin trackingId
    # conocido, su codigo se derivó por slug del título; el prefijo
    # "asegurado." sale de la única sección mixta "TOMADOR Y ASEGURADO")
    tipo_vehiculo = next(p for p in sueltas if p["titulo"] == "Tipo de vehículo")
    # "branching" es un dict {valor: codigo_destino}, no una lista de
    # {if_value,goto_codigo} -- mismo motivo que "choices" arriba.
    assert tipo_vehiculo["configuracion"]["branching"] == {"Moto": "asegurado.modelo_y_linea"}

    # nada debió quedar sin resolver en este formulario
    assert resultado["branching_sin_resolver"] == []


def test_salud_colapsa_asegurado_en_un_solo_grupo():
    resultado = parsear_formulario_ms(_cargar("salud_cotizacion.json"))

    assert len(resultado["grupos"]) == 1
    grupo = resultado["grupos"][0]
    assert grupo["codigo"] == "asegurado"
    assert grupo["maximo_repeticiones"] == 4
    assert grupo["minimo_repeticiones"] == 0

    # solo deben quedar las preguntas de la copia #1 (sección sin número) +
    # la propia sección como pregunta tipo 'seccion'
    titulos_grupo = {p["titulo"] for p in grupo["preguntas"]}
    assert "Nombres y apellidos completos del asegurado #1" in titulos_grupo
    assert "Nombres y apellidos completos del asegurado #2" not in titulos_grupo
    assert "Nombres y apellidos completos del asegurado #3" not in titulos_grupo
    assert "Nombres y apellidos completos del asegurado #4" not in titulos_grupo

    # los campos equivalentes de las copias #2/#3/#4 quedaron registrados
    # para que quien revise confirme que son duplicados y no datos perdidos
    titulos_omitidos = {d["titulo"] for d in resultado["duplicados_omitidos"]}
    assert "Nombres y apellidos completos del asegurado #2" in titulos_omitidos
    assert "Nombres y apellidos completos del asegurado #3" in titulos_omitidos
    assert "Nombres y apellidos completos del asegurado #4" in titulos_omitidos
    assert "INFORMACIÓN BÁSICA DEL ASEGURADO #2" in titulos_omitidos

    # el mismo trackingId en tomador y asegurado no debe colisionar: cada
    # uno obtiene su propio codigo con el prefijo de rol correspondiente
    numero_doc_tomador = _buscar(resultado["preguntas_sueltas"], "tomador.numero_documento")
    numero_doc_asegurado = _buscar(grupo["preguntas"], "asegurado.numero_documento")
    assert numero_doc_tomador is not None
    assert numero_doc_asegurado is not None

    # el vínculo a Cliente solo aplica al tomador (pregunta suelta); el
    # mismo campo dentro del grupo "asegurado" NO se vincula -- el
    # builder tampoco deja vincular preguntas con grupo_id.
    assert numero_doc_tomador["mapea_a"] == {"entidad": "cliente", "campo": "numero_documento"}
    assert numero_doc_asegurado["mapea_a"] is None

    # la pregunta "¿Cotizar otro asegurado?" (control de repetición de MS
    # Forms) se conserva pero queda marcada para que un humano decida si
    # se descarta
    codigos_control = {c["codigo"] for c in resultado["posibles_controles_repeticion"]}
    assert "asegurado.otro_asegurado" in codigos_control

    # branching hacia un id que no existe en el fixture (a propósito) debe
    # quedar reportado, no fallar el parseo
    assert any(
        b["target_ms_forms_id"] == "rNOEXISTE0000000000000000000000"
        for b in resultado["branching_sin_resolver"]
    )

    # ningún trackingId de este fixture debería faltar en el diccionario
    assert resultado["sin_mapear"] == []
