import json
from pathlib import Path

from app.services.formulario import FormularioGrupoPreguntaService, FormularioPreguntaService
from app.services.formulario_importador_ms_persistencia import (
    importar_formulario_ms,
    importar_formularios_ms,
)

FIXTURES = Path(__file__).parent / "fixtures" / "ms_forms"


def _cargar(nombre: str) -> dict:
    with open(FIXTURES / nombre, encoding="utf-8") as f:
        return json.load(f)


def test_importa_formulario_simple_sin_grupos(db_session):
    resultado = importar_formulario_ms(db_session, _cargar("autos.json"))

    assert resultado["ok"] is True
    assert resultado["sin_mapear"]  # "Modelo y línea" no tiene trackingId mapeado, es esperado

    preguntas = FormularioPreguntaService.listar(db_session, resultado["formulario_id"])
    assert all(p.grupo_id is None for p in preguntas)

    tipo_doc = next(p for p in preguntas if p.codigo == "tomador.tipo_documento")
    assert tipo_doc.mapea_a == {"entidad": "cliente", "campo": "tipo_documento"}
    # las choices de MS Forms ("CEDULA DE CIUDADANIA"...) quedaron
    # reemplazadas por las reales de la tabla tipo_documento (CC/CE/NIT/TI
    # sembradas por seed_data.py) -- si no, todo envío público de este
    # formulario fallaría con "tipo_documento_invalido".
    assert set(tipo_doc.configuracion["choices"]) >= {"CC", "CE"}
    assert "CEDULA DE CIUDADANIA" not in tipo_doc.configuracion["choices"]

    numero_doc = next(p for p in preguntas if p.codigo == "tomador.numero_documento")
    assert numero_doc.mapea_a == {"entidad": "cliente", "campo": "numero_documento"}
    assert numero_doc.tipo.codigo == "texto"

    grupos = FormularioGrupoPreguntaService.listar(db_session, resultado["formulario_id"])
    assert grupos == []


def test_importa_formulario_con_grupo_asegurado(db_session):
    resultado = importar_formulario_ms(db_session, _cargar("salud_cotizacion.json"))

    assert resultado["ok"] is True
    assert len(resultado["duplicados_omitidos"]) > 0
    assert len(resultado["branching_sin_resolver"]) == 1

    grupos = FormularioGrupoPreguntaService.listar(db_session, resultado["formulario_id"])
    assert len(grupos) == 1
    assert grupos[0].codigo == "asegurado"
    assert grupos[0].maximo_repeticiones == 4

    preguntas_grupo = [
        p for p in FormularioPreguntaService.listar(db_session, resultado["formulario_id"])
        if p.grupo_id == grupos[0].id
    ]
    assert any(p.codigo == "asegurado.numero_documento" for p in preguntas_grupo)
    # solo la copia #1 de cada campo del asegurado quedó en la DB
    assert sum(1 for p in preguntas_grupo if "numero_documento" in p.codigo) == 1


def test_categoria_no_detectable_no_crea_nada(db_session):
    data_sin_titulo_reconocible = {
        "data": {"form": {"title": "Encuesta de satisfacción", "descriptiveQuestions": [], "questions": []}}
    }

    resultado = importar_formulario_ms(db_session, data_sin_titulo_reconocible)

    assert resultado["ok"] is False
    assert "categoria" in resultado["motivo"]


def test_lote_un_formulario_invalido_no_afecta_a_los_demas(db_session):
    data_invalida = {"data": {"form": {"title": "Otra cosa sin categoria clara", "descriptiveQuestions": [], "questions": []}}}

    resultado = importar_formularios_ms(
        db_session,
        [_cargar("autos.json"), data_invalida, _cargar("salud_cotizacion.json")],
    )

    assert len(resultado["creados"]) == 2
    assert len(resultado["fallidos"]) == 1
    assert resultado["fallidos"][0]["titulo"] == "Otra cosa sin categoria clara"


def test_endpoint_acepta_un_solo_json_y_una_lista(client, admin_headers):
    respuesta_uno = client.post(
        "/api/v1/formularios/importar-ms",
        json=_cargar("autos.json"),
        headers=admin_headers,
    )
    assert respuesta_uno.status_code == 200, respuesta_uno.text
    assert len(respuesta_uno.json()["creados"]) == 1

    respuesta_lote = client.post(
        "/api/v1/formularios/importar-ms",
        json=[_cargar("autos.json"), _cargar("salud_cotizacion.json")],
        headers=admin_headers,
    )
    assert respuesta_lote.status_code == 200, respuesta_lote.text
    assert len(respuesta_lote.json()["creados"]) == 2
