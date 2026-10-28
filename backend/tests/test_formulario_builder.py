"""CRUD de Formulario, builder de grupos/preguntas y publicación."""


def _crear_formulario(client, admin_headers, titulo="Formulario de prueba pytest"):
    respuesta = client.post("/api/v1/formularios", json={"titulo": titulo}, headers=admin_headers)
    assert respuesta.status_code == 201
    return respuesta.json()


def test_crear_formulario_queda_en_borrador(client, admin_headers):
    formulario = _crear_formulario(client, admin_headers)
    assert formulario["estado"]["codigo"] == "borrador"
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
