"""Horario de disponibilidad por usuario (DT-022)."""

from app.models.usuarios_clientes.horario_usuario import DIAS_SEMANA


def _dias_payload(activo_lunes=True):
    return [
        {
            "dia_semana": dia,
            "activo": activo_lunes if dia == "lunes" else dia not in ("sabado", "domingo"),
            "hora_desde": "08:00:00",
            "hora_hasta": "17:00:00",
        }
        for dia in DIAS_SEMANA
    ]


def test_obtener_horario_sin_filas_devuelve_default(client, admin_headers):
    respuesta = client.get("/api/v1/mi-horario", headers=admin_headers)
    assert respuesta.status_code == 200

    dias = respuesta.json()
    assert len(dias) == 7
    sabado = next(d for d in dias if d["dia_semana"] == "sabado")
    assert sabado["activo"] is False
    lunes = next(d for d in dias if d["dia_semana"] == "lunes")
    assert lunes["activo"] is True


def test_guardar_horario_y_releer(client, admin_headers):
    payload = _dias_payload(activo_lunes=False)

    respuesta = client.put("/api/v1/mi-horario", json=payload, headers=admin_headers)
    assert respuesta.status_code == 200
    lunes = next(d for d in respuesta.json() if d["dia_semana"] == "lunes")
    assert lunes["activo"] is False

    relectura = client.get("/api/v1/mi-horario", headers=admin_headers)
    lunes_releido = next(d for d in relectura.json() if d["dia_semana"] == "lunes")
    assert lunes_releido["activo"] is False


def test_guardar_horario_incompleto_422(client, admin_headers):
    payload = _dias_payload()[:6]  # faltan domingo

    respuesta = client.put("/api/v1/mi-horario", json=payload, headers=admin_headers)
    assert respuesta.status_code == 422


def test_horarios_equipo_solo_admin(client, admin_headers):
    respuesta = client.get("/api/v1/horarios", headers=admin_headers)
    assert respuesta.status_code == 200

    equipo = respuesta.json()
    assert len(equipo) >= 1
    assert len(equipo[0]["dias"]) == 7
