"""Datos de la empresa, fila única (DT-023a).

Nota: estos tests borran la fila de `empresa` dentro de su propio
SAVEPOINT (ver conftest.db_session) antes de cada caso, porque la DB
de desarrollo real puede tener una fila guardada desde pruebas manuales
en el navegador (no es dato ficticio del test, es real) — sin este borrado
previo, "sin fila" dejaría de ser un estado alcanzable y el test sería
falso. El borrado se revierte al terminar el test, no toca el dato real.
"""
from app.models.usuarios_clientes.empresa import Empresa


def _vaciar_empresa(db_session):
    db_session.query(Empresa).delete()
    db_session.commit()


def test_obtener_empresa_sin_fila_devuelve_vacia(client, admin_headers, db_session):
    _vaciar_empresa(db_session)

    respuesta = client.get("/api/v1/empresa", headers=admin_headers)
    assert respuesta.status_code == 200
    assert respuesta.json() == {
        "nombre": None, "nit": None, "direccion": None, "telefono": None, "correo": None,
    }


def test_guardar_empresa_y_releer(client, admin_headers):
    payload = {"nombre": "JuanFer Seguros", "nit": "900123456-1", "correo": "contacto@juanfer.com"}

    respuesta = client.put("/api/v1/empresa", json=payload, headers=admin_headers)
    assert respuesta.status_code == 200
    assert respuesta.json()["nombre"] == "JuanFer Seguros"

    relectura = client.get("/api/v1/empresa", headers=admin_headers)
    assert relectura.json()["nit"] == "900123456-1"


def test_guardar_empresa_dos_veces_no_crea_segunda_fila(client, admin_headers, db_session):
    client.put("/api/v1/empresa", json={"nombre": "A"}, headers=admin_headers)
    client.put("/api/v1/empresa", json={"nombre": "B"}, headers=admin_headers)

    respuesta = client.get("/api/v1/empresa", headers=admin_headers)
    assert respuesta.json()["nombre"] == "B"
    assert db_session.query(Empresa).count() == 1
