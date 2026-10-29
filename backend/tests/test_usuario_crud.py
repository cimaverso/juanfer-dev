"""Actualizar y eliminar (borrado lógico) usuarios -- CRUD de Configuración → Empresa → Usuarios."""

from sqlalchemy import select
from app.models.usuarios_clientes.usuario import Usuario

EMAIL_ADMIN_SEED = "dani@juanfer.com"  # el que usa admin_headers en conftest.py


def _crear_usuario(client, admin_headers, email="editable.test@juanfer.com"):
    respuesta = client.post(
        "/api/v1/usuarios/",
        json={"nombre": "Usuario Editable", "email": email, "password": "123456", "rol": "ASESOR"},
        headers=admin_headers,
    )
    assert respuesta.status_code == 201, respuesta.text
    return respuesta.json()


def test_actualizar_usuario_nombre_y_rol(client, admin_headers):
    creado = _crear_usuario(client, admin_headers)

    respuesta = client.put(
        f"/api/v1/usuarios/{creado['id']}",
        json={"nombre": "Nombre Actualizado", "rol": "ADMIN"},
        headers=admin_headers,
    )
    assert respuesta.status_code == 200, respuesta.text

    data = respuesta.json()
    assert data["nombre"] == "Nombre Actualizado"
    assert data["rol"] == "ADMIN"
    assert data["email"] == "editable.test@juanfer.com"  # no se tocó


def test_actualizar_usuario_inexistente_404(client, admin_headers):
    respuesta = client.put(
        "/api/v1/usuarios/999999999",
        json={"nombre": "X"},
        headers=admin_headers,
    )
    assert respuesta.status_code == 404


def test_actualizar_usuario_rol_invalido(client, admin_headers):
    creado = _crear_usuario(client, admin_headers, email="rolinvalido.update.test@juanfer.com")

    respuesta = client.put(
        f"/api/v1/usuarios/{creado['id']}",
        json={"rol": "SUPERADMIN"},
        headers=admin_headers,
    )
    assert respuesta.status_code == 400


def test_actualizar_usuario_email_duplicado(client, admin_headers):
    _crear_usuario(client, admin_headers, email="ocupado.test@juanfer.com")
    otro = _crear_usuario(client, admin_headers, email="libre.test@juanfer.com")

    respuesta = client.put(
        f"/api/v1/usuarios/{otro['id']}",
        json={"email": "ocupado.test@juanfer.com"},
        headers=admin_headers,
    )
    assert respuesta.status_code == 409


def test_eliminar_usuario_borrado_logico(client, admin_headers):
    creado = _crear_usuario(client, admin_headers, email="aeliminar.test@juanfer.com")

    respuesta = client.delete(f"/api/v1/usuarios/{creado['id']}", headers=admin_headers)
    assert respuesta.status_code == 204

    # el borrado es lógico (activo=False) -> ya no aparece en el listado
    lista = client.get("/api/v1/usuarios/", headers=admin_headers)
    assert all(u["id"] != creado["id"] for u in lista.json())


def test_eliminar_usuario_inexistente_404(client, admin_headers):
    respuesta = client.delete("/api/v1/usuarios/999999999", headers=admin_headers)
    assert respuesta.status_code == 404


def test_admin_no_puede_eliminarse_a_si_mismo(client, admin_headers, db_session):
    admin_id = db_session.execute(select(Usuario.id).where(Usuario.email == EMAIL_ADMIN_SEED)).scalar_one()

    respuesta = client.delete(f"/api/v1/usuarios/{admin_id}", headers=admin_headers)
    assert respuesta.status_code == 400
