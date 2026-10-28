"""Endpoint público: regla de negocio (toda respuesta crea/reusa un Cliente), dedupe, rate limit y validación básica."""
import uuid


def _publicar_formulario_con_tomador(client, admin_headers):
    r_formulario = client.post(
        "/api/v1/formularios",
        json={"titulo": f"Publico pytest {uuid.uuid4()}", "categoria_codigo": "cotizacion"},
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


def test_metricas_reflejan_respuesta_completada(client, admin_headers):
    formulario_id, token = _publicar_formulario_con_tomador(client, admin_headers)

    client.post(
        f"/api/v1/public/formularios/{token}/respuestas",
        json={"respuestas": _respuestas_validas("444PYTEST")}
    )

    r_metricas = client.get(f"/api/v1/formularios/{formulario_id}/metricas", headers=admin_headers)
    metricas = r_metricas.json()
    assert metricas["total_respuestas"] == 1
    assert metricas["completadas"] == 1
    assert metricas["en_progreso"] == 0
    assert metricas["tasa_completitud"] == 1.0
    assert len(metricas["serie_diaria"]) == 1
    assert metricas["serie_diaria"][0]["total"] == 1


def test_cliente_formularios_respondidos(client, admin_headers):
    formulario_id, token = _publicar_formulario_con_tomador(client, admin_headers)

    r_respuesta = client.post(
        f"/api/v1/public/formularios/{token}/respuestas",
        json={"respuestas": _respuestas_validas("555PYTEST")}
    )
    cliente_id = r_respuesta.json()["cliente_id"]

    r_listado = client.get(f"/api/v1/clientes/{cliente_id}/formularios-respondidos", headers=admin_headers)
    assert r_listado.status_code == 200
    respondidos = r_listado.json()
    assert len(respondidos) == 1
    assert respondidos[0]["formulario_id"] == formulario_id

    r_cliente = client.get(
        "/api/v1/clientes/buscar", params={"documento": "555PYTEST"}, headers=admin_headers
    )
    assert r_cliente.json()["total_formularios_respondidos"] == 1

    # Regresión: un Cliente creado por el formulario público (sin correo/
    # ocupacion/ciudad, no mapeados en este formulario de prueba) no debe
    # tronar el listado admin con 500 (ver docs/DEUDA.md).
    r_listado_clientes = client.get("/api/v1/clientes/", headers=admin_headers)
    assert r_listado_clientes.status_code == 200


def test_cliente_formularios_respondidos_404_si_no_existe(client, admin_headers):
    r_listado = client.get("/api/v1/clientes/999999999/formularios-respondidos", headers=admin_headers)
    assert r_listado.status_code == 404


def test_mismo_documento_otra_vez_rechaza(client, admin_headers):
    _, token = _publicar_formulario_con_tomador(client, admin_headers)

    client.post(f"/api/v1/public/formularios/{token}/respuestas", json={"respuestas": _respuestas_validas("333PYTEST")})
    r_repetido = client.post(f"/api/v1/public/formularios/{token}/respuestas", json={"respuestas": _respuestas_validas("333PYTEST")})

    assert r_repetido.status_code == 409


def test_varias_preguntas_mapeadas_al_mismo_campo_no_se_pisan(client, admin_headers):
    """
    Caso real: una pregunta "Número de documento" por cada tipo de
    documento (CC, NIT, ...), mostradas condicionalmente en el front
    según la respuesta de "Tipo de documento" (branching) y todas
    mapeadas al mismo campo `numero_documento`. Solo una llega
    diligenciada en `respuestas`; las demás ni siquiera aparecen como
    clave (el front no envía preguntas ocultas). Una alternativa vacía
    no debe pisar el valor real de la que sí se respondió.
    """
    formulario_id, token = _publicar_formulario_con_tomador(client, admin_headers)

    client.post(
        f"/api/v1/formularios/{formulario_id}/preguntas",
        json={
            "codigo": "tomador.numero_documento_nit", "tipo_codigo": "texto",
            "titulo": "NIT", "requerida": False,
            "mapea_a": {"entidad": "cliente", "campo": "numero_documento"}
        },
        headers=admin_headers
    )
    client.post(f"/api/v1/formularios/{formulario_id}/publicar", headers=admin_headers)
    r_formulario = client.get(f"/api/v1/formularios/{formulario_id}", headers=admin_headers)
    token = r_formulario.json()["token_publico"]

    respuesta = client.post(
        f"/api/v1/public/formularios/{token}/respuestas",
        # Nota: "tomador.numero_documento_nit" ni siquiera se envía,
        # igual que haría el front con un campo oculto por branching.
        json={"respuestas": _respuestas_validas("777PYTEST")}
    )

    assert respuesta.status_code == 201
    assert respuesta.json()["cliente_id"] is not None


def test_seccion_y_alternativas_ocultas_por_branching_no_bloquean_envio(client, admin_headers):
    """
    Caso real reportado: una pregunta tipo "seccion" (encabezado de
    página, requerida=true por defecto en el builder, sin valor que
    diligenciar) y una pregunta "Tipo de documento" (opcion) con
    branching hacia dos preguntas alternativas de "Número de documento"
    (una por tipo), ambas requeridas pero solo una activa según la
    respuesta. Ninguna de las dos cosas debe bloquear el envío.
    """
    r_formulario = client.post(
        "/api/v1/formularios",
        json={"titulo": f"Branching pytest {uuid.uuid4()}", "categoria_codigo": "cotizacion"},
        headers=admin_headers
    )
    formulario_id = r_formulario.json()["id"]

    client.post(
        f"/api/v1/formularios/{formulario_id}/preguntas",
        json={"codigo": "seccion1", "tipo_codigo": "seccion", "titulo": "Información personal", "requerida": True},
        headers=admin_headers
    )
    client.post(
        f"/api/v1/formularios/{formulario_id}/preguntas",
        json={
            "codigo": "tipo_doc", "tipo_codigo": "opcion", "titulo": "Tipo de documento", "requerida": True,
            "configuracion": {"choices": ["CC", "NIT"], "branching": {"CC": "num_cc", "NIT": "num_nit"}},
            "mapea_a": {"entidad": "cliente", "campo": "tipo_documento"}
        },
        headers=admin_headers
    )
    client.post(
        f"/api/v1/formularios/{formulario_id}/preguntas",
        json={
            "codigo": "num_cc", "tipo_codigo": "texto", "titulo": "Número de documento", "requerida": True,
            "mapea_a": {"entidad": "cliente", "campo": "numero_documento"}
        },
        headers=admin_headers
    )
    client.post(
        f"/api/v1/formularios/{formulario_id}/preguntas",
        json={
            "codigo": "num_nit", "tipo_codigo": "texto", "titulo": "NIT", "requerida": True,
            "mapea_a": {"entidad": "cliente", "campo": "numero_documento"}
        },
        headers=admin_headers
    )
    for codigo, campo in [("nombre", "nombre_completo"), ("cel", "celular")]:
        client.post(
            f"/api/v1/formularios/{formulario_id}/preguntas",
            json={"codigo": codigo, "tipo_codigo": "texto", "titulo": codigo, "requerida": True,
                  "mapea_a": {"entidad": "cliente", "campo": campo}},
            headers=admin_headers
        )

    client.post(f"/api/v1/formularios/{formulario_id}/publicar", headers=admin_headers)
    token = client.get(f"/api/v1/formularios/{formulario_id}", headers=admin_headers).json()["token_publico"]

    respuesta = client.post(
        f"/api/v1/public/formularios/{token}/respuestas",
        json={"respuestas": {
            "tipo_doc": "CC",
            "num_cc": "888PYTEST",
            # "num_nit" ni siquiera se envía: el front lo oculta.
            "nombre": "Cliente Branching",
            "cel": "3000000000",
        }}
    )

    assert respuesta.status_code == 201
    assert respuesta.json()["cliente_id"] is not None


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
