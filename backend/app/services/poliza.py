from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select, or_, func, desc, asc
from app.models.modulos_negocio.poliza import Poliza
from app.models.usuarios_clientes.cliente import Cliente
from app.services.cliente import ClienteService
from app.services.catalogo import CatalogoService
from app.models.catalogos.ramo import Ramo
from app.models.historial.historial_responsable import HistorialResponsable
from datetime import date
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
        print(u_id, u_rol)

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