from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select, or_, func, desc, asc, case, extract
from app.models.modulos_negocio.poliza import Poliza
from app.models.usuarios_clientes.cliente import Cliente
from app.models.catalogos.estado_poliza import EstadoPoliza
from app.models.usuarios_clientes.usuario import Usuario
from app.services.cliente import ClienteService
from app.services.catalogo import CatalogoService
from app.models.catalogos.ramo import Ramo
from app.models.historial.historial_responsable import HistorialResponsable
from datetime import date
from decimal import Decimal
from app.schemas.poliza import PolizaFiltro, PolizaCreate, PolizaRead, PolizaUpdate, PolizaTraspaso
from app.schemas.cliente import ClienteCreate
from app.services.usuario import UsuarioService
from typing import Optional

class PolizaService:

    @staticmethod
    def buscar_poliza_id(id: int, db: Session):
        stmt = select(Poliza).where(Poliza.id == id)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def buscar_numero_poliza(numero: str, db: Session):
        stmt = select(Poliza).where(Poliza.numero_poliza == numero)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def listar_polizas(filtros: PolizaFiltro, db: Session):
        query = db.query(Poliza).options(
            joinedload(Poliza.cliente),
            joinedload(Poliza.estado),
            joinedload(Poliza.aseguradora),
            joinedload(Poliza.ramo),
            joinedload(Poliza.responsable)
        )

        if filtros.estado:
            query = query.filter(
                Poliza.estado.has(nombre=filtros.estado)
            )

        if filtros.aseguradora:
            query = query.filter(
                Poliza.aseguradora.has(nombre=filtros.aseguradora)
            )

        if filtros.ramo:
            query = query.filter(
                Poliza.ramo.has(nombre=filtros.ramo)
            )

        if filtros.mes:
            anio, mes = map(int, filtros.mes.split("-"))

            inicio = date(anio, mes, 1)
            fin = date(anio + 1, 1, 1) if mes == 12 else date(anio, mes + 1, 1)

            query = query.filter(
                Poliza.fecha_solicitud >= inicio,
                Poliza.fecha_solicitud < fin
            )

        if filtros.responsable_id:
            query = query.filter(
                Poliza.responsable_id == filtros.responsable_id
            )

        if filtros.search:
            search = f"%{filtros.search}%"

            query = query.join(Poliza.cliente).filter(
                or_(
                    Cliente.nombre_completo.ilike(search),
                    Cliente.numero_documento.ilike(search),
                    Poliza.numero_poliza.ilike(search),
                )
            ).distinct()

        total = query.count()
        items = [PolizaRead.model_validate(p) for p in query.all()]

        return {
            "data": items,
            "total": total
        }
    
    @staticmethod
    def crear_poliza(poliza_data: PolizaCreate, db: Session):
        tipo_doc = CatalogoService.get_id_tipo_doc(poliza_data.tipo_documento, db)

        if not tipo_doc:
            return None

        cliente = ClienteService.buscar_por_documento(db, poliza_data.numero_documento)
        
        if not cliente:
            cliente_in = ClienteCreate(
                nombre_completo=poliza_data.nombre_completo,
                numero_documento=poliza_data.numero_documento,
                tipo_documento_id=tipo_doc, 
                celular=poliza_data.celular or "0",
                responsable_id=poliza_data.responsable_id
            )
            cliente = ClienteService.registrar_cliente(db, cliente_in)

        if not cliente:
            return None

        datos_dict = poliza_data.model_dump()
        
        campos_cliente = ["tipo_documento", "numero_documento", "nombre_completo", "celular"]
        for campo in campos_cliente:
            datos_dict.pop(campo, None)

        nueva_poliza = Poliza(
            **datos_dict,
            cliente_id=cliente.id
        )

        try:
            db.add(nueva_poliza)
            db.commit()
            db.refresh(nueva_poliza)
            return nueva_poliza
        except Exception as e:
            db.rollback()
            
            print(f"Error en PolizaService.crear_poliza: {str(e)}")
            raise e
    
    @staticmethod
    def obtener_meses(db: Session):
        mes_formateado = func.to_char(Poliza.fecha_solicitud, 'YYYY-MM')

        query = db.query(mes_formateado).distinct().filter(
            Poliza.fecha_solicitud.isnot(None)
        ).order_by(desc(mes_formateado))

        resultados = query.all()

        return [r[0] for r in resultados]
    
    @staticmethod
    def obtener_ramos_usados(db: Session):
        query = db.query(Ramo.nombre)\
        .join(Poliza, Poliza.ramo_id == Ramo.id)\
        .distinct()\
        .order_by(asc(Ramo.nombre))

        resultados = query.all()
        
        return [r.nombre for r in resultados]
    
    @staticmethod
    def actualizar_poliza(db: Session, poliza_id: int, poliza_in: PolizaUpdate, current_user):
        poliza = PolizaService.buscar_poliza_id(poliza_id, db)
        if not poliza:
            return "NOT_FOUND"

        u_id= getattr(current_user, "id", None) or current_user.get("id")
        u_rol= getattr(current_user, "rol", None) or current_user.get("rol")

        if u_rol == "ASESOR" and poliza.responsable_id != u_id:
            return "FORBIDDEN"

        if poliza.version != poliza_in.version:
            return "CONFLICT"

        update_data = poliza_in.model_dump(exclude_unset=True, exclude={"version"})
        
        for field, value in update_data.items():
            setattr(poliza, field, value)

        poliza.version += 1

        try:
            db.commit()
            db.refresh(poliza)
            return poliza
        except Exception as e:
            db.rollback()
            raise e
        

    @staticmethod
    def traspasar_poliza(id_poliza: int, traspaso_info: PolizaTraspaso, db: Session):
        poliza = PolizaService.buscar_poliza_id(id_poliza, db)
        
        if not poliza:
            return None

        # Para Update en Poliza
        nuevo_usuario = UsuarioService.buscar_uduario_id(traspaso_info.usuario_nuevo_id, db)

        if not nuevo_usuario:
            return "USUARIO_INVALIDO"
        
        usuario_anterior_id = poliza.responsable_id

        try:
            poliza.responsable_id = traspaso_info.usuario_nuevo_id

            historial = HistorialResponsable(
                poliza_id=id_poliza,
                usuario_anterior_id=usuario_anterior_id,
                usuario_nuevo_id=traspaso_info.usuario_nuevo_id,
                realizado_por_id=traspaso_info.realizado_por_id,
                tipo=traspaso_info.tipo or "TRASPASO",
                motivo=traspaso_info.motivo
            )
            db.add(historial)
            db.commit()
            db.refresh(poliza)
            db.refresh(historial)

            return {
                    "poliza": poliza,
                    "traspaso": {
                        "id": historial.id,
                        "poliza_id": historial.poliza_id,
                        "usuario_anterior_id": historial.usuario_anterior_id,
                        "nombre_usuario_anterior": historial.usuario_anterior.nombre, 
                        "usuario_nuevo_id": historial.usuario_nuevo_id,
                        "nombre_usuario_nuevo": historial.usuario_nuevo.nombre,
                        "realizado_por_id": historial.realizado_por_id,
                        "nombre_admin": historial.realizado_por.nombre,
                        "tipo": historial.tipo,
                        "motivo": historial.motivo,
                        "fecha": historial.fecha
                    }
                }
        
        except SQLAlchemyError:
            db.rollback()
            raise

    @staticmethod
    def borrar_poliza(id_poliza: int, db:Session):
        poliza = PolizaService.buscar_poliza_id(id_poliza, db)

        if not poliza:
            return "NOT FOUND"
        
        db.delete(poliza)
        db.commit()

        return{
            "ok": True,
            "message": "Póliza eliminada correctamente"
        }
    
    # METRICAS PARA DASHBOARD

    @staticmethod
    def get_metricas_dashboard(responsable_id: int, db: Session, current_user):
        u_rol= getattr(current_user, "rol", None) or current_user.get("rol")
        today = date.today()
        year = today.year
        month = today.month

        if u_rol == "ASESOR":
            return PolizaService.get_metricas_dashboard_asesor(responsable_id, db)

        stmt = select(
            # Totales
            func.count(Poliza.id).label("total_polizas"),

            # Por estado
            func.count(case((Poliza.estado.has(nombre="Expedido"), 1))).label("expedidas"),
            func.count(case((Poliza.estado.has(nombre="En proceso"), 1))).label("en_proceso"),
            func.count(case((Poliza.estado.has(nombre="Pospuesta"), 1))).label("pospuestas"),
            func.count(case((Poliza.estado.has(nombre="Declinada"), 1))).label("declinadas"),
            func.count(case((Poliza.estado.has(nombre="Cancelada"), 1))).label("canceladas"),

            # Primas
            func.coalesce(func.sum(Poliza.prima), 0).label("prima_total"),

            func.coalesce(
                func.sum(
                    case(
                        (
                            (extract("year", Poliza.fecha_solicitud) == year) &
                            (extract("month", Poliza.fecha_solicitud) == month),
                            Poliza.prima
                        ),
                        else_=0
                    )
                ),
                0
            ).label("prima_mes"),

            # Conteo mes
            func.count(
                case((Poliza.fecha_expedicion.is_(None), 1))
            ).label("sin_expedicion"),

            # Alertas críticas
            func.count(
                case(
                    (
                        (Poliza.fecha_expedicion.is_(None)) & 
                        (func.current_date() - Poliza.fecha_solicitud > 5),
                        1
                    )
                )
            ).label("alertas_criticas"),
        )

        result = db.execute(stmt).mappings().one()

        expedidas = result["expedidas"]
        total = result["total_polizas"]

        tasa_exito = (expedidas / total * 100) if total > 0 else 0

        return {
            "total_polizas": result.get("total_polizas", 0),
            "expedidas": result.get("expedidas", 0),
            "en_proceso": result.get("en_proceso", 0),
            "pospuestas": result.get("pospuestas", 0),
            "declinadas": result.get("declinadas", 0),
            "canceladas": result.get("canceladas", 0),
            "prima_total": result.get("prima_total", 0),
            "prima_mes": result.get("prima_mes", 0),
            "polizas_mes": result.get("polizas_mes", 0),  # 👈 clave
            "sin_expedicion": result.get("sin_expedicion", 0),
            "alertas_criticas": result.get("alertas_criticas", 0),
            "tasa_exito": round(tasa_exito, 2),
            "meta_prima_mes": Decimal("5000000"),
            "meta_polizas_mes": 20
        }
    
    @staticmethod
    def obtener_alertas(db: Session):
        dias_sin_exp = func.current_date() - Poliza.fecha_solicitud

        nivel_case = case(
            (dias_sin_exp > 30, "critico"),
            (dias_sin_exp > 15, "atencion"),
            (dias_sin_exp >= 7, "info"),
            else_=None
        )

        stmt = (
            select(
                Poliza.id.label("poliza_id"),
                Cliente.nombre_completo.label("cliente_nombre"),
                EstadoPoliza.nombre.label("estado"),
                func.coalesce(Usuario.nombre, "Sin asignar").label("responsable"),
                dias_sin_exp.label("dias_sin_exp"),
                nivel_case.label("nivel"),
            )
            .join(Cliente, Poliza.cliente_id == Cliente.id)
            .join(EstadoPoliza, Poliza.estado_id == EstadoPoliza.id)
            .outerjoin(Usuario, Poliza.responsable_id == Usuario.id)
            .where(
                Poliza.fecha_expedicion.is_(None),
                dias_sin_exp >= 7
            )
            .order_by(desc(dias_sin_exp))
        )

        result = db.execute(stmt).mappings().all()

        return result
    

    @staticmethod
    def obtener_produccion_mensual(db: Session):

        mes_expr = func.to_char(Poliza.fecha_expedicion, "YYYY-MM")

        stmt = (
            select(
                mes_expr.label("mes"),
                func.count(Poliza.id).label("total_polizas"),
                func.coalesce(func.sum(Poliza.prima), 0).label("prima_total"),
            )
            .where(
                Poliza.fecha_expedicion.is_not(None)
            )
            .group_by(mes_expr)
            .order_by(mes_expr.asc())
        )

        result = db.execute(stmt).mappings().all()

        return result
    
    @staticmethod
    def obtener_distribucion_estados(db: Session):

        # Mapeo de colores (alineado con el front)
        COLOR_MAP = {
            "Expedido": "expedido",
            "En proceso de firma": "proceso",
            "Evaluación médica": "evaluacion",
            "Declinado": "declinado",
            "Pospuesto": "pospuesto",
            "Cancelado": "cancelado",
            "Pendiente de complemento": "pendiente",
        }

        stmt = (
            select(
                EstadoPoliza.id,
                EstadoPoliza.nombre,
                func.count(Poliza.id).label("total")
            )
            .join(Poliza, Poliza.estado_id == EstadoPoliza.id)
            .group_by(EstadoPoliza.id, EstadoPoliza.nombre)
            .order_by(EstadoPoliza.id.asc())
        )

        result = db.execute(stmt).mappings().all()

        # 🔥 Enriquecemos con color
        return [
            {
                "id": row["id"],
                "nombre": row["nombre"],
                "color": COLOR_MAP.get(row["nombre"], "default"),
                "total": row["total"]
            }
            for row in result
        ]
    

    @staticmethod
    def get_metricas_dashboard_asesor(responsable_id: int, db: Session):
        today = date.today()
        year = today.year
        month = today.month

        stmt = select(
            # Totales
            func.count(Poliza.id).label("total_polizas"),

            # Por estado
            func.count(case((Poliza.estado.has(nombre="Expedido"), 1))).label("expedidas"),
            func.count(case((Poliza.estado.has(nombre="En proceso"), 1))).label("en_proceso"),
            func.count(case((Poliza.estado.has(nombre="Pospuesta"), 1))).label("pospuestas"),
            func.count(case((Poliza.estado.has(nombre="Declinada"), 1))).label("declinadas"),
            func.count(case((Poliza.estado.has(nombre="Cancelada"), 1))).label("canceladas"),

            # Primas
            func.coalesce(func.sum(Poliza.prima), 0).label("prima_total"),

            func.coalesce(
                func.sum(
                    case(
                        (
                            (extract("year", Poliza.fecha_solicitud) == year) &
                            (extract("month", Poliza.fecha_solicitud) == month),
                            Poliza.prima
                        ),
                        else_=0
                    )
                ),
                0
            ).label("prima_mes"),

            # 🔥 polizas del mes (te faltaba esto en el otro también)
            func.count(
                case(
                    (
                        (extract("year", Poliza.fecha_solicitud) == year) &
                        (extract("month", Poliza.fecha_solicitud) == month),
                        1
                    )
                )
            ).label("polizas_mes"),

            # Sin expedición
            func.count(
                case((Poliza.fecha_expedicion.is_(None), 1))
            ).label("sin_expedicion"),

            # Alertas críticas
            func.count(
                case(
                    (
                        (Poliza.fecha_expedicion.is_(None)) &
                        (func.current_date() - Poliza.fecha_solicitud > 5),
                        1
                    )
                )
            ).label("alertas_criticas"),
        ).where(
            Poliza.responsable_id == responsable_id  # 🔥 clave
        )

        result = db.execute(stmt).mappings().one()

        expedidas = result["expedidas"]
        total = result["total_polizas"]

        tasa_exito = (expedidas / total * 100) if total > 0 else 0

        return {
            "total_polizas": result.get("total_polizas", 0),
            "expedidas": result.get("expedidas", 0),
            "en_proceso": result.get("en_proceso", 0),
            "pospuestas": result.get("pospuestas", 0),
            "declinadas": result.get("declinadas", 0),
            "canceladas": result.get("canceladas", 0),
            "prima_total": result.get("prima_total", 0),
            "prima_mes": result.get("prima_mes", 0),
            "polizas_mes": result.get("polizas_mes", 0),
            "sin_expedicion": result.get("sin_expedicion", 0),
            "alertas_criticas": result.get("alertas_criticas", 0),
            "tasa_exito": round(tasa_exito, 2),
            "meta_prima_mes": Decimal("5000000"),
            "meta_polizas_mes": 20
        }