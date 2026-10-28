"""Bloqueo de login tras 3 intentos fallidos, 15 minutos (DT-023 / punto 3)."""

EMAIL_ASESOR = "diego@juanfer.com"


def _login(client, password):
    return client.post("/api/v1/auth/login", json={"email": EMAIL_ASESOR, "password": password})


def test_login_correcto_resetea_contador(client):
    _login(client, "mala1")
    respuesta = _login(client, "123456")
    assert respuesta.status_code == 200


def test_tercer_intento_fallido_bloquea(client):
    assert _login(client, "mala1").status_code == 401
    assert _login(client, "mala2").status_code == 401

    tercer = _login(client, "mala3")
    assert tercer.status_code == 423
    assert "minuto" in tercer.json()["detail"]


def test_bloqueado_no_entra_ni_con_clave_correcta(client):
    _login(client, "mala1")
    _login(client, "mala2")
    _login(client, "mala3")

    respuesta = _login(client, "123456")
    assert respuesta.status_code == 423
