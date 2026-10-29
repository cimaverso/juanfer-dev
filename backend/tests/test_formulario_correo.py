from app.services.formulario_correo_html import construir_html
from app.services.resend_service import ResendService

ESTRUCTURA = {
    "preguntas": [
        {"id": 1, "grupo_id": None, "codigo": "nombre", "tipo_codigo": "texto", "titulo": "Nombre", "orden": "1"},
        {"id": 2, "grupo_id": None, "codigo": "seccion_asegurados", "tipo_codigo": "seccion", "titulo": "Asegurados", "orden": "2"},
        {"id": 3, "grupo_id": 10, "codigo": "nombre_asegurado", "tipo_codigo": "texto", "titulo": "Nombre asegurado", "orden": "1"},
        {"id": 4, "grupo_id": 10, "codigo": "parentesco", "tipo_codigo": "texto", "titulo": "Parentesco", "orden": "2"},
    ],
    "grupos": [
        {"id": 10, "codigo": "asegurados", "titulo_template": "Asegurado {n}", "orden": "1"},
    ],
}


def test_construir_html_incluye_preguntas_sueltas_y_cliente():
    html = construir_html(
        "Formulario de prueba",
        ESTRUCTURA,
        {"nombre": "Ana Pérez"},
        cliente_nombre="Ana Pérez",
        cliente_documento="123456",
    )

    assert "Formulario de prueba" in html
    assert "1. Nombre" in html
    assert "Ana Pérez" in html
    assert "123456" in html
    # Hay 2 secciones reales (antes/después de la pregunta "seccion"):
    # su título SÍ debe indicarse como divisor, a diferencia de antes.
    assert "Sección 2" in html
    assert "Asegurados" in html


def test_construir_html_recorre_grupo_repetible():
    respuestas = {
        "nombre": "Ana Pérez",
        "asegurados": [
            {"nombre_asegurado": "Hijo Uno", "parentesco": "Hijo"},
            {"nombre_asegurado": "Hijo Dos", "parentesco": "Hija"},
        ],
    }

    html = construir_html("Formulario de prueba", ESTRUCTURA, respuestas, None, None)

    assert "Asegurado 1" in html
    assert "Asegurado 2" in html
    assert "Hijo Uno" in html
    assert "Hijo Dos" in html


def test_construir_html_sin_secciones_no_muestra_divisor():
    estructura_sin_secciones = {
        "preguntas": [
            {"id": 1, "grupo_id": None, "codigo": "nombre", "tipo_codigo": "texto", "titulo": "Nombre", "orden": "1"},
            {"id": 2, "grupo_id": None, "codigo": "correo", "tipo_codigo": "email", "titulo": "Correo", "orden": "2"},
        ],
        "grupos": [],
    }

    html = construir_html("Formulario de prueba", estructura_sin_secciones, {"nombre": "Ana", "correo": "a@a.com"}, None, None)

    assert "Sección" not in html
    assert "1. Nombre" in html
    assert "2. Correo" in html


def test_construir_html_valor_vacio_se_muestra_como_guion():
    html = construir_html("Formulario de prueba", ESTRUCTURA, {}, None, None)
    assert "-" in html


def test_resend_enviar_sin_destinatario_no_llama_la_api():
    """
    settings.RESEND_CORREO está vacío en este entorno (ver .env): debe
    fallar rápido con un mensaje claro, sin intentar ninguna llamada de
    red real a Resend.
    """
    exito, error = ResendService.enviar(None, "asunto", "<p>html</p>")
    assert exito is False
    assert "RESEND_CORREO" in error
