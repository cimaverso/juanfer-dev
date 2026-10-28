"""Bloqueo de login tras 3 intentos fallidos, 15 minutos (DT-023 / punto 3)."""

from sqlalchemy import select
from app.models.usuarios_clientes.usuario import Usuario

EMAIL_ASESOR = "diego@juanfer.com"


def _login(client, password):
    return client.post("/api/v1/auth/login", json={"email": EMAIL_ASESOR, "password": password})


def _limpiar_bloqueo(db_session):
    """La cuenta real puede quedar bloqueada por pruebas manuales en el
    navegador — se limpia dentro del propio SAVEPOINT del test, sin
    tocar el dato real."""
    usuario = db_session.execute(select(Usuario).where(Usuario.email == EMAIL_ASESOR)).scalar_one()
    usuario.intentos_fallidos = 0
    usuario.bloqueado_hasta = None
    db_session.commit()


def test_login_correcto_resetea_contador(client, db_session):
    _limpiar_bloqueo(db_session)
    _login(client, "mala1")
    respuesta = _login(client, "123456")
    assert respuesta.status_code == 200


def test_tercer_intento_fallido_bloquea(client, db_session):
    _limpiar_bloqueo(db_session)
    assert _login(client, "mala1").status_code == 401
    assert _login(client, "mala2").status_code == 401

    tercer = _login(client, "mala3")
    assert tercer.status_code == 423
    assert "minuto" in tercer.json()["detail"]


def test_bloqueado_no_entra_ni_con_clave_correcta(client, db_session):
    _limpiar_bloqueo(db_session)
    _login(client, "mala1")
    _login(client, "mala2")
    _login(client, "mala3")

    respuesta = _login(client, "123456")
    assert respuesta.status_code == 423
