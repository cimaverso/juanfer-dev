"""Dashboard: endpoint agregado de métricas de Formularios (solo ADMIN) y
filtro por responsable en alertas/producción-mensual/distribución-estados
para que un ASESOR solo vea su propia cartera (ver docs/ESTADO.md)."""

from datetime import date, timedelta
from sqlalchemy import select

from app.models.usuarios_clientes.usuario import Usuario
from app.models.usuarios_clientes.cliente import Cliente
from app.models.catalogos.tipo_documento import TipoDocumento
from app.models.catalogos.ramo import Ramo
from app.models.catalogos.aseguradora import Aseguradora
from app.models.catalogos.producto import Producto
from app.models.catalogos.estado_poliza import EstadoPoliza
from app.models.modulos_negocio.poliza import Poliza
from app.services.poliza import PolizaService


def test_metricas_agregadas_formularios_admin_ok(client, admin_headers):
    respuesta = client.get("/api/v1/formularios/metricas/agregadas", headers=admin_headers)
    assert respuesta.status_code == 200
    datos = respuesta.json()
    for campo in ("total_formularios_activos", "total_respuestas", "completadas", "en_progreso", "tasa_completitud"):
        assert campo in datos


def test_metricas_agregadas_formularios_asesor_403(client, asesor_headers):
    respuesta = client.get("/api/v1/formularios/metricas/agregadas", headers=asesor_headers)
    assert respuesta.status_code == 403


def _crear_poliza_para(db_session, responsable_id, dias_sin_exp=10):
    tipo_doc = db_session.execute(select(TipoDocumento)).scalars().first()
    ramo = db_session.execute(select(Ramo)).scalars().first()
    aseguradora = db_session.execute(select(Aseguradora)).scalars().first()
    estado = db_session.execute(select(EstadoPoliza)).scalars().first()

    producto = db_session.execute(select(Producto)).scalars().first()
    if not producto:
        producto = Producto(nombre="Producto pytest dashboard")
        db_session.add(producto)
        db_session.flush()

    cliente = Cliente(
        tipo_documento_id=tipo_doc.id,
        numero_documento=f"dash-{responsable_id}-{dias_sin_exp}",
        nombre_completo="Cliente pytest dashboard",
        celular="3000000000",
    )
    db_session.add(cliente)
    db_session.flush()

    poliza = Poliza(
        cliente_id=cliente.id,
        ramo_id=ramo.id,
        aseguradora_id=aseguradora.id,
        producto_id=producto.id,
        estado_id=estado.id,
        responsable_id=responsable_id,
        fecha_solicitud=date.today() - timedelta(days=dias_sin_exp),
    )
    db_session.add(poliza)
    db_session.flush()
    return poliza


def test_alertas_produccion_distribucion_filtran_por_responsable(db_session):
    admin = db_session.execute(select(Usuario).where(Usuario.email == "dani@juanfer.com")).scalar_one()
    asesor = db_session.execute(select(Usuario).where(Usuario.email == "gina@juanfer.com")).scalar_one()

    poliza_admin = _crear_poliza_para(db_session, admin.id)
    poliza_asesor = _crear_poliza_para(db_session, asesor.id)

    alertas_todas = PolizaService.obtener_alertas(db_session)
    alertas_asesor = PolizaService.obtener_alertas(db_session, asesor.id)

    ids_todas = {a["poliza_id"] for a in alertas_todas}
    ids_asesor = {a["poliza_id"] for a in alertas_asesor}

    assert poliza_admin.id in ids_todas and poliza_asesor.id in ids_todas
    assert poliza_asesor.id in ids_asesor
    assert poliza_admin.id not in ids_asesor

    distribucion_todas = PolizaService.obtener_distribucion_estados(db_session)
    distribucion_asesor = PolizaService.obtener_distribucion_estados(db_session, asesor.id)

    total_todas = sum(d["cantidad"] for d in distribucion_todas)
    total_asesor = sum(d["cantidad"] for d in distribucion_asesor)
    assert total_asesor < total_todas
