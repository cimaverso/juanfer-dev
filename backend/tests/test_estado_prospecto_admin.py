"""CRUD admin de estado_prospecto (sin borrado duro, solo activo=false, igual que DT-017)."""


def test_crear_duplicado_rechaza(client, admin_headers):
    r1 = client.post(
        "/api/v1/catalogos/estados-prospecto",
        json={"nombre": "Test pytest estado", "color": "#FFFFFF"},
        headers=admin_headers
    )
    assert r1.status_code == 201

    r2 = client.post(
        "/api/v1/catalogos/estados-prospecto",
        json={"nombre": "Test pytest estado", "color": "#000000"},
        headers=admin_headers
    )
    assert r2.status_code == 409


def test_crear_actualizar_y_listar_admin_incluye_inactivos(client, admin_headers):
    r_crear = client.post(
        "/api/v1/catalogos/estados-prospecto",
        json={"nombre": "Test pytest estado 2", "color": "#111111"},
        headers=admin_headers
    )
    assert r_crear.status_code == 201
    estado = r_crear.json()
    assert estado["activo"] is True

    r_actualizar = client.put(
        f"/api/v1/catalogos/estados-prospecto/{estado['id']}",
        json={"activo": False},
        headers=admin_headers
    )
    assert r_actualizar.status_code == 200
    assert r_actualizar.json()["activo"] is False

    r_listar_publico = client.get("/api/v1/catalogos/estados-prospecto", headers=admin_headers)
    assert all(e["id"] != estado["id"] for e in r_listar_publico.json())

    r_listar_admin = client.get("/api/v1/catalogos/estados-prospecto/admin", headers=admin_headers)
    assert any(e["id"] == estado["id"] and e["activo"] is False for e in r_listar_admin.json())


def test_no_existe_endpoint_de_borrado_duro(client, admin_headers):
    respuesta = client.delete("/api/v1/catalogos/estados-prospecto/1", headers=admin_headers)
    assert respuesta.status_code in (404, 405)
