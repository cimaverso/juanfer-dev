import pytest
from sqlalchemy import event
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.main import app
from app.core.db import engine, get_db


@pytest.fixture
def db_session():
    """
    Sesión envuelta en un SAVEPOINT que se revierte al terminar el test,
    aunque el código bajo prueba haga sus propios db.commit() (los
    servicios de formularios/catálogo comitean internamente, no delegan
    el commit al caller). Sin esto, los tests escribirían datos reales en
    la DB de desarrollo (ver docs/DEUDA.md "Pagadas" DT-017: ya se rompió
    un valor real de catalogo_valor con una prueba manual sin este
    aislamiento).
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    nested = connection.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def _reiniciar_savepoint(sess, trans):
        nonlocal nested
        if not nested.is_active:
            nested = connection.begin_nested()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    def _db_de_prueba():
        yield db_session

    app.dependency_overrides[get_db] = _db_de_prueba
    yield TestClient(app)
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def admin_headers(client):
    """
    Usuario admin real del seed (`scripts/seed_data.py`), no un mock de
    auth: ejercita el login y el JWT de verdad, no solo la lógica de
    negocio.
    """
    respuesta = client.post(
        "/api/v1/auth/login",
        json={"email": "dani@juanfer.com", "password": "123456"}
    )
    assert respuesta.status_code == 200, respuesta.text

    token = respuesta.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def asesor_headers(client):
    """Usuario ASESOR real del seed (ver admin_headers): Gina López."""
    respuesta = client.post(
        "/api/v1/auth/login",
        json={"email": "gina@juanfer.com", "password": "123456"}
    )
    assert respuesta.status_code == 200, respuesta.text

    token = respuesta.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
