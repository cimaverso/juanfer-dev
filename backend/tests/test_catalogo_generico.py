"""CRUD admin de catalogo_tipo / catalogo_valor (ver docs/DEUDA.md DT-017)."""


def test_crear_tipo_duplicado_rechaza(client, admin_headers):
    respuesta = client.post(
        "/api/v1/catalogos/tipos",
        json={"codigo": "formulario_estado", "nombre": "x"},
        headers=admin_headers
    )
    assert respuesta.status_code == 409


def test_crear_tipo_y_valores(client, admin_headers):
    r_tipo = client.post(
        "/api/v1/catalogos/tipos",
        json={"codigo": "test_tipo_pytest", "nombre": "Tipo de prueba"},
        headers=admin_headers
    )
    assert r_tipo.status_code == 201

    r_valor_tipo_inexistente = client.post(
        "/api/v1/catalogos/tipos/no_existe/valores",
        json={"codigo": "x", "nombre": "x"},
        headers=admin_headers
    )
    assert r_valor_tipo_inexistente.status_code == 404

    r_valor1 = client.post(
        "/api/v1/catalogos/tipos/test_tipo_pytest/valores",
        json={"codigo": "valor_a", "nombre": "Valor A"},
        headers=admin_headers
    )
    assert r_valor1.status_code == 201
    valor1 = r_valor1.json()
    assert valor1["orden"] == 0

    r_valor2 = client.post(
        "/api/v1/catalogos/tipos/test_tipo_pytest/valores",
        json={"codigo": "valor_b", "nombre": "Valor B"},
        headers=admin_headers
    )
    assert r_valor2.json()["orden"] == 1

    r_dup = client.post(
        "/api/v1/catalogos/tipos/test_tipo_pytest/valores",
        json={"codigo": "valor_a", "nombre": "Otra A"},
        headers=admin_headers
    )
    assert r_dup.status_code == 409

    r_listar = client.get("/api/v1/catalogos/tipos/test_tipo_pytest/valores", headers=admin_headers)
    assert r_listar.status_code == 200
    assert len(r_listar.json()) == 2

    r_actualizar = client.put(
        f"/api/v1/catalogos/valores/{valor1['id']}",
        json={"activo": False},
        headers=admin_headers
    )
    assert r_actualizar.status_code == 200
    assert r_actualizar.json()["activo"] is False


def test_no_existe_endpoint_de_borrado_duro(client, admin_headers):
    """
    A propósito (ver DT-017): el admin solo desactiva con activo=false,
    nunca borra un catalogo_valor. Si esto empieza a dar 405/200 en vez de
    404, alguien reintrodujo el DELETE.
    """
    respuesta = client.delete("/api/v1/catalogos/valores/1", headers=admin_headers)
    assert respuesta.status_code in (404, 405)
