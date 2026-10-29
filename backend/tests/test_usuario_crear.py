"""Creación de usuarios (asesores/admin) desde Configuración → Empresa → Usuarios."""


def test_crear_usuario_asesor(client, admin_headers):
    respuesta = client.post(
        "/api/v1/usuarios/",
        json={
            "nombre": "Camila Nueva",
            "email": "camila.nueva.test@juanfer.com",
            "password": "claveSegura123",
            "rol": "ASESOR",
        },
        headers=admin_headers,
    )
    assert respuesta.status_code == 201, respuesta.text

    data = respuesta.json()
    assert data["nombre"] == "Camila Nueva"
    assert data["email"] == "camila.nueva.test@juanfer.com"
    assert data["rol"] == "ASESOR"
    assert "password" not in data
    assert "password_hash" not in data


def test_crear_usuario_requiere_admin(client, admin_headers):
    # login como un asesor real del seed (no admin) para probar el 403
    respuesta_login = client.post(
        "/api/v1/auth/login",
        json={"email": "gina@juanfer.com", "password": "123456"},
    )
    assert respuesta_login.status_code == 200, respuesta_login.text
    headers_asesor = {"Authorization": f"Bearer {respuesta_login.json()['access_token']}"}

    respuesta = client.post(
        "/api/v1/usuarios/",
        json={"nombre": "X", "email": "x@juanfer.com", "password": "123456", "rol": "ASESOR"},
        headers=headers_asesor,
    )
    assert respuesta.status_code == 403


def test_crear_usuario_rol_invalido(client, admin_headers):
    respuesta = client.post(
        "/api/v1/usuarios/",
        json={"nombre": "X", "email": "rol.invalido.test@juanfer.com", "password": "123456", "rol": "SUPERADMIN"},
        headers=admin_headers,
    )
    assert respuesta.status_code == 400


def test_crear_usuario_email_duplicado(client, admin_headers):
    payload = {"nombre": "Repetido", "email": "duplicado.test@juanfer.com", "password": "123456", "rol": "ASESOR"}

    primera = client.post("/api/v1/usuarios/", json=payload, headers=admin_headers)
    assert primera.status_code == 201, primera.text

    segunda = client.post("/api/v1/usuarios/", json=payload, headers=admin_headers)
    assert segunda.status_code == 409


def test_crear_usuario_password_corta_422(client, admin_headers):
    respuesta = client.post(
        "/api/v1/usuarios/",
        json={"nombre": "X", "email": "corta.test@juanfer.com", "password": "123", "rol": "ASESOR"},
        headers=admin_headers,
    )
    assert respuesta.status_code == 422
