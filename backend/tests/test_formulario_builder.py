"""CRUD de Formulario, builder de grupos/preguntas y publicación."""


def _crear_formulario(client, admin_headers, titulo="Formulario de prueba pytest"):
    respuesta = client.post(
        "/api/v1/formularios",
        json={"titulo": titulo, "categoria_codigo": "cotizacion"},
        headers=admin_headers
    )
    assert respuesta.status_code == 201
    return respuesta.json()


def test_crear_formulario_queda_en_borrador(client, admin_headers):
    formulario = _crear_formulario(client, admin_headers)
    assert formulario["estado"]["codigo"] == "borrador"
    assert formulario["categoria"]["codigo"] == "cotizacion"
    assert formulario["version_activa_id"] is None


def test_obtener_formulario_inexistente_404(client, admin_headers):
    respuesta = client.get("/api/v1/formularios/999999999", headers=admin_headers)
    assert respuesta.status_code == 404


def test_builder_grupos_y_preguntas(client, admin_headers):
    formulario = _crear_formulario(client, admin_headers)
    formulario_id = formulario["id"]

    r_grupo = client.post(
        f"/api/v1/formularios/{formulario_id}/grupos",
        json={"codigo": "asegurado", "titulo_template": "Asegurado #{n}"},
        headers=admin_headers
    )
    assert r_grupo.status_code == 201
    grupo = r_grupo.json()

    r_grupo_dup = client.post(
        f"/api/v1/formularios/{formulario_id}/grupos",
        json={"codigo": "asegurado", "titulo_template": "otro"},
        headers=admin_headers
    )
    assert r_grupo_dup.status_code == 409

    r_pregunta_tipo_invalido = client.post(
        f"/api/v1/formularios/{formulario_id}/preguntas",
        json={"codigo": "x", "tipo_codigo": "no_existe_este_tipo", "titulo": "X"},
        headers=admin_headers
    )
    assert r_pregunta_tipo_invalido.status_code == 400

    r_pregunta_grupo_ajeno = client.post(
        f"/api/v1/formularios/{formulario_id}/preguntas",
        json={"codigo": "x", "tipo_codigo": "texto", "titulo": "X", "grupo_id": 999999999},
        headers=admin_headers
    )
    assert r_pregunta_grupo_ajeno.status_code == 400

    r_pregunta = client.post(
        f"/api/v1/formularios/{formulario_id}/preguntas",
        json={
            "codigo": "asegurado.nombres", "tipo_codigo": "texto", "titulo": "Nombres",
            "grupo_id": grupo["id"]
        },
        headers=admin_headers
    )
    assert r_pregunta.status_code == 201
    assert r_pregunta.json()["tipo"]["codigo"] == "texto"

    r_listar_preguntas = client.get(f"/api/v1/formularios/{formulario_id}/preguntas", headers=admin_headers)
    assert len(r_listar_preguntas.json()) == 1


def test_publicar_genera_version_y_activa_formulario(client, admin_headers):
    formulario = _crear_formulario(client, admin_headers)
    formulario_id = formulario["id"]

    client.post(
        f"/api/v1/formularios/{formulario_id}/preguntas",
        json={
            "codigo": "tomador.numero_documento", "tipo_codigo": "texto",
            "titulo": "Numero de documento", "requerida": True,
            "mapea_a": {"entidad": "cliente", "campo": "numero_documento"}
        },
        headers=admin_headers
    )

    r_publicar = client.post(f"/api/v1/formularios/{formulario_id}/publicar", headers=admin_headers)
    assert r_publicar.status_code == 201
    version = r_publicar.json()
    assert version["numero_version"] == 1
    assert len(version["estructura"]["preguntas"]) == 1

    r_formulario = client.get(f"/api/v1/formularios/{formulario_id}", headers=admin_headers)
    assert r_formulario.json()["estado"]["codigo"] == "activo"
    assert r_formulario.json()["version_activa_id"] == version["id"]

    r_republicar = client.post(f"/api/v1/formularios/{formulario_id}/publicar", headers=admin_headers)
    assert r_republicar.json()["numero_version"] == 2

    r_versiones = client.get(f"/api/v1/formularios/{formulario_id}/versiones", headers=admin_headers)
    assert len(r_versiones.json()) == 2

    # Regresión del fix de post_update=True (ver docs/modulos/formularios.md):
    # borrar un formulario ya publicado (con version_activa_id seteado) no
    # debe tronar con "Circular dependency detected".
    r_eliminar = client.delete(f"/api/v1/formularios/{formulario_id}", headers=admin_headers)
    assert r_eliminar.status_code == 204


def test_crear_formulario_categoria_invalida_400(client, admin_headers):
    respuesta = client.post(
        "/api/v1/formularios",
        json={"titulo": "X", "categoria_codigo": "no_existe"},
        headers=admin_headers
    )
    assert respuesta.status_code == 400


def test_listar_formularios_con_filtros(client, admin_headers):
    cotizacion = _crear_formulario(client, admin_headers, titulo="Filtro cotizacion pytest")

    r_expedicion = client.post(
        "/api/v1/formularios",
        json={"titulo": "Filtro expedicion pytest", "categoria_codigo": "expedicion"},
        headers=admin_headers
    )
    expedicion = r_expedicion.json()

    r_por_categoria = client.get(
        "/api/v1/formularios", params={"categoria_codigo": "expedicion"}, headers=admin_headers
    )
    ids_por_categoria = {f["id"] for f in r_por_categoria.json()}
    assert expedicion["id"] in ids_por_categoria
    assert cotizacion["id"] not in ids_por_categoria

    r_por_estado = client.get(
        "/api/v1/formularios", params={"estado_codigo": "borrador"}, headers=admin_headers
    )
    assert expedicion["id"] in {f["id"] for f in r_por_estado.json()}

    r_por_titulo = client.get(
        "/api/v1/formularios", params={"titulo": "filtro expedicion"}, headers=admin_headers
    )
    ids_por_titulo = {f["id"] for f in r_por_titulo.json()}
    assert expedicion["id"] in ids_por_titulo
    assert cotizacion["id"] not in ids_por_titulo


def test_metricas_formulario_sin_respuestas(client, admin_headers):
    formulario = _crear_formulario(client, admin_headers)

    r_metricas = client.get(f"/api/v1/formularios/{formulario['id']}/metricas", headers=admin_headers)
    assert r_metricas.status_code == 200
    metricas = r_metricas.json()
    assert metricas["total_respuestas"] == 0
    assert metricas["completadas"] == 0
    assert metricas["en_progreso"] == 0
    assert metricas["tasa_completitud"] == 0.0
    assert metricas["serie_diaria"] == []


def test_metricas_formulario_inexistente_404(client, admin_headers):
    r_metricas = client.get("/api/v1/formularios/999999999/metricas", headers=admin_headers)
    assert r_metricas.status_code == 404
