"""Endpoint público: regla de negocio (toda respuesta crea/reusa un Cliente), dedupe, rate limit y validación básica."""
import uuid


def _publicar_formulario_con_tomador(client, admin_headers):
    r_formulario = client.post(
        "/api/v1/formularios",
        json={"titulo": f"Publico pytest {uuid.uuid4()}"},
        headers=admin_headers
    )
    formulario = r_formulario.json()
    formulario_id = formulario["id"]

    preguntas = [
        ("tomador.tipo_documento", "texto", "tipo_documento"),
        ("tomador.numero_documento", "texto", "numero_documento"),
        ("tomador.nombre_completo", "texto", "nombre_completo"),
        ("tomador.celular", "texto", "celular"),
    ]
    for codigo, tipo, campo in preguntas:
        client.post(
            f"/api/v1/formularios/{formulario_id}/preguntas",
            json={
                "codigo": codigo, "tipo_codigo": tipo, "titulo": codigo, "requerida": True,
                "mapea_a": {"entidad": "cliente", "campo": campo}
            },
            headers=admin_headers
        )

    client.post(
        f"/api/v1/formularios/{formulario_id}/preguntas",
        json={"codigo": "tomador.edad", "tipo_codigo": "numero", "titulo": "Edad", "requerida": False},
        headers=admin_headers
    )

    client.post(f"/api/v1/formularios/{formulario_id}/publicar", headers=admin_headers)

    r_formulario = client.get(f"/api/v1/formularios/{formulario_id}", headers=admin_headers)
    return formulario_id, r_formulario.json()["token_publico"]


def _respuestas_validas(numero_documento):
    return {
        "tomador.tipo_documento": "CC",
        "tomador.numero_documento": numero_documento,
        "tomador.nombre_completo": "Cliente de Prueba Pytest",
        "tomador.celular": "3000000000",
    }


def test_formulario_publico_404_si_no_existe(client):
    respuesta = client.get(f"/api/v1/public/formularios/{uuid.uuid4()}")
    assert respuesta.status_code == 404


def test_validacion_requerida_y_tipo(client, admin_headers):
    _, token = _publicar_formulario_con_tomador(client, admin_headers)

    r_falta_celular = client.post(
        f"/api/v1/public/formularios/{token}/respuestas",
        json={"respuestas": {
            "tomador.tipo_documento": "CC",
            "tomador.numero_documento": "111PYTEST",
            "tomador.nombre_completo": "X",
        }}
    )
    assert r_falta_celular.status_code == 400
    assert "tomador.celular" in r_falta_celular.json()["detail"]["preguntas"]

    r_edad_invalida = client.post(
        f"/api/v1/public/formularios/{token}/respuestas",
        json={"respuestas": {**_respuestas_validas("111PYTEST"), "tomador.edad": "no-es-numero"}}
    )
    assert r_edad_invalida.status_code == 400
    assert "tomador.edad" in r_edad_invalida.json()["detail"]["preguntas"]


def test_envio_valido_crea_cliente_sin_responsable(client, admin_headers):
    _, token = _publicar_formulario_con_tomador(client, admin_headers)

    respuesta = client.post(
        f"/api/v1/public/formularios/{token}/respuestas",
        json={"respuestas": _respuestas_validas("222PYTEST")}
    )
    assert respuesta.status_code == 201
    assert respuesta.json()["cliente_id"] is not None


def test_mismo_documento_otra_vez_rechaza(client, admin_headers):
    _, token = _publicar_formulario_con_tomador(client, admin_headers)

    client.post(f"/api/v1/public/formularios/{token}/respuestas", json={"respuestas": _respuestas_validas("333PYTEST")})
    r_repetido = client.post(f"/api/v1/public/formularios/{token}/respuestas", json={"respuestas": _respuestas_validas("333PYTEST")})

    assert r_repetido.status_code == 409


def test_rate_limit_por_ip(client, admin_headers, monkeypatch):
    from app.services import formulario_respuesta as modulo_respuesta
    monkeypatch.setattr(modulo_respuesta, "ENVIOS_MAX_POR_IP", 2)

    _, token = _publicar_formulario_con_tomador(client, admin_headers)

    r1 = client.post(f"/api/v1/public/formularios/{token}/respuestas", json={"respuestas": _respuestas_validas("444PYTEST")})
    r2 = client.post(f"/api/v1/public/formularios/{token}/respuestas", json={"respuestas": _respuestas_validas("555PYTEST")})
    r3 = client.post(f"/api/v1/public/formularios/{token}/respuestas", json={"respuestas": _respuestas_validas("666PYTEST")})

    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r3.status_code == 429
