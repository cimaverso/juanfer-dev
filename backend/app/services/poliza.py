from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, or_, func, desc, asc
from app.models.modulos_negocio.poliza import Poliza
from app.models.usuarios_clientes.cliente import Cliente
from app.services.cliente import ClienteService
from app.services.catalogo import CatalogoService
from app.models.catalogos.ramo import Ramo
from datetime import date
from app.schemas.poliza import PolizaFiltro, PolizaCreate, PolizaRead, PolizaUpdate
from app.schemas.cliente import ClienteCreate
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
        # 1. Buscar la póliza
        poliza = db.query(Poliza).filter(Poliza.id == poliza_id).first()
        if not poliza:
            return "NOT_FOUND"

        u_id= getattr(current_user, "id", None) or current_user.get("id")
        u_rol= getattr(current_user, "rol", None) or current_user.get("rol")
        print(u_id, u_rol)
        # 2. Control de Acceso (RBAC)
        # Si es ASESOR y el responsable_id no coincide -> 403
        if u_rol == "ASESOR" and poliza.responsable_id != u_id:
            return "FORBIDDEN"

        # 3. Control de Concurrencia Optimista
        if poliza.version != poliza_in.version:
            return "CONFLICT"

        # 4. Actualización dinámica
        update_data = poliza_in.model_dump(exclude_unset=True, exclude={"version"})
        
        for field, value in update_data.items():
            setattr(poliza, field, value)

        # 5. Incrementar versión
        poliza.version += 1

        try:
            db.commit()
            db.refresh(poliza)
            return poliza
        except Exception as e:
            db.rollback()
            raise e
        
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