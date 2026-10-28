"""Restablecer contraseña por código de un solo uso (DT-023b)."""

from sqlalchemy import select
from app.models.usuarios_clientes.usuario import Usuario

EMAIL_ASESOR = "gina@juanfer.com"


def _limpiar_bloqueo(db_session):
    """La cuenta real puede quedar bloqueada por pruebas manuales en el
    navegador (ver docs/DEUDA.md / bloqueo de login) — se limpia dentro
    del propio SAVEPOINT del test, sin tocar el dato real."""
    usuario = db_session.execute(select(Usuario).where(Usuario.email == EMAIL_ASESOR)).scalar_one()
    usuario.intentos_fallidos = 0
    usuario.bloqueado_hasta = None
    db_session.commit()


def _generar_codigo(client, admin_headers, usuario_id=3):
    respuesta = client.post(f"/api/v1/usuarios/{usuario_id}/generar-codigo-reset", headers=admin_headers)
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()["codigo"]


def test_generar_codigo_reset_requiere_admin(client, admin_headers):
    codigo = _generar_codigo(client, admin_headers)
    assert len(codigo) == 8


def test_generar_codigo_reset_usuario_inexistente_404(client, admin_headers):
    respuesta = client.post("/api/v1/usuarios/999999999/generar-codigo-reset", headers=admin_headers)
    assert respuesta.status_code == 404


def test_validar_codigo_correcto(client, admin_headers):
    codigo = _generar_codigo(client, admin_headers)

    respuesta = client.post(
        "/api/v1/auth/validar-codigo-reset",
        json={"email": EMAIL_ASESOR, "codigo": codigo},
    )
    assert respuesta.status_code == 200
    assert respuesta.json() == {"valido": True}


def test_validar_codigo_incorrecto_400(client, admin_headers):
    _generar_codigo(client, admin_headers)

    respuesta = client.post(
        "/api/v1/auth/validar-codigo-reset",
        json={"email": EMAIL_ASESOR, "codigo": "codigo-incorrecto"},
    )
    assert respuesta.status_code == 400


def test_reset_password_completo_y_login_con_clave_nueva(client, admin_headers, db_session):
    _limpiar_bloqueo(db_session)
    codigo = _generar_codigo(client, admin_headers)

    respuesta = client.post(
        "/api/v1/auth/reset-password",
        json={"email": EMAIL_ASESOR, "codigo": codigo, "nueva_password": "ClaveNueva123"},
    )
    assert respuesta.status_code == 200

    login = client.post(
        "/api/v1/auth/login",
        json={"email": EMAIL_ASESOR, "password": "ClaveNueva123"},
    )
    assert login.status_code == 200


def test_codigo_no_se_puede_reusar(client, admin_headers):
    codigo = _generar_codigo(client, admin_headers)

    primera = client.post(
        "/api/v1/auth/reset-password",
        json={"email": EMAIL_ASESOR, "codigo": codigo, "nueva_password": "ClaveNueva123"},
    )
    assert primera.status_code == 200

    segunda = client.post(
        "/api/v1/auth/reset-password",
        json={"email": EMAIL_ASESOR, "codigo": codigo, "nueva_password": "OtraClave456"},
    )
    assert segunda.status_code == 400
