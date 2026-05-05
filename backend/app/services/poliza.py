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
from datetime import date, datetime
from decimal import Decimal
from app.schemas.poliza import PolizaFiltro, PolizaCreate, PolizaRead, PolizaUpdate, PolizaTraspaso
from app.schemas.cliente import ClienteCreate
from app.services.usuario import UsuarioService
from app.services.catalogo import CatalogoService
from typing import Optional, List, Dict, Any
from io import BytesIO
from openpyxl import Workbook

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
        nuevo_usuario = UsuarioService.buscar_usuario_activo(traspaso_info.usuario_nuevo_id, db)

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
                EstadoPoliza.color,
                func.count(Poliza.id).label("total")
            )
            .outerjoin(Poliza, Poliza.estado_id == EstadoPoliza.id)
            .group_by(EstadoPoliza.id, EstadoPoliza.nombre, EstadoPoliza.color)
            .order_by(EstadoPoliza.id.asc())
        )

        result = db.execute(stmt).mappings().all()

        return [
            {
                "estado": row["nombre"],
                "cantidad": row["total"],
                "color": row["color"]
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
            Poliza.responsable_id == responsable_id  
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
    

    def normalize(val):
        return str(val or "").strip().upper()

    @staticmethod
    def importar_desde_rows(rows: List[Dict[str, Any]], current_user, db: Session):
        """
        Procesa filas ya parseadas (Excel/CSV) y realiza la importación masiva.
        """

        errores = []
        valid_rows = []
        # Consultas a la db
        catalogos = PolizaService.consultar_catalogos(db)
        usuarios = PolizaService.consultar_usuarios(db)

        # -----------------------------
        # 1. Validación y normalización
        # -----------------------------
        for i, row in enumerate(rows, start=2):
            try:
                raw_doc = row.get("CEDULA")

                if raw_doc is None:
                    raise ValueError("Cédula vacía")

                numero_documento = str(raw_doc).strip()

                if not numero_documento or numero_documento.upper() == "NONE":
                    raise ValueError("Cédula inválida")

                tipo_documento_name = PolizaService.normalize(row.get("TIPO DE DOCUMENTO"))
                responsable = row.get("RESPONSABLE")
                aseguradora_name = row.get("ASEGURADORA")
                estado_name = row.get("ESTADO")

                id_doc = catalogos["tipos_documento"].get(tipo_documento_name)
                if not id_doc:
                    raise ValueError(f"Tipo documento no encontrado: {tipo_documento_name}")

                id_responsable = usuarios["usuarios"].get(responsable)
                if not id_responsable:
                    raise ValueError(f"Responsable no encontrado: {responsable}")

                aseguradora_id = catalogos["aseguradoras"].get(aseguradora_name)
                if not aseguradora_id:
                    raise ValueError(f"Aseguradora no encontrada: {aseguradora_name}")

                estado_id = catalogos["estados_poliza"].get(estado_name)
                if not estado_id:
                    raise ValueError(f"Estado no encontrado: {estado_name}")

                # --- SOLUCIONES ---
                solucion = str(row.get("SOLUCIONES", ""))
                partes = [s.strip() for s in solucion.split("/")]

                if len(partes) < 2:
                    raise ValueError(f"Formato SOLUCIONES inválido: {solucion}")

                producto_row = partes[0]
                ramo_row = partes[1]

                producto_id = catalogos["productos"].get(producto_row)
                if not producto_id:
                    raise ValueError(f"Producto no encontrado: {producto_row}")

                ramo_id = catalogos["ramos"].get(ramo_row)
                if not ramo_id:
                    raise ValueError(f"Ramo no encontrado: {ramo_row}")

                # --- NOMBRES ---
                nombres = str(row.get("NOMBRE COMPLETO TOMADOR Y ASEGURADO", ""))
                partes_nombres = [p.strip() for p in nombres.split("/")]

                nombre_completo = partes_nombres[0] if partes_nombres else None
                nombre_asegurado = partes_nombres[1] if len(partes_nombres) > 1 else None

                if not nombre_completo:
                    raise ValueError("Nombre completo vacío")

                # --- POLIZA ---
                numero_poliza = str(row.get("# DE POLIZA", "")).strip()
                if not numero_poliza:
                    raise ValueError("Número de póliza vacío")

                # --- PRIMA ---
                prima_raw = row.get("PRIMA")

                prima = Decimal(prima_raw) if prima_raw not in (None, "", "0", 0) else None
                if prima is not None and prima < 0:
                    raise ValueError(f"Prima negativa: {prima}")

                # --- FECHA ---
                fecha_raw = row.get("FECHA EXPEDICIÓN")

                if isinstance(fecha_raw, str):
                    fecha_expedicion = datetime.strptime(fecha_raw, "%Y-%m-%d").date()
                else:
                    fecha_expedicion = fecha_raw

                valid_rows.append({
                    "fila": i,
                    "numero_documento": numero_documento,
                    "nombre_completo": nombre_completo,
                    "asegurado_nombre": nombre_asegurado,
                    "numero_poliza": numero_poliza,
                    "celular": str(row.get("CELULAR", "")).strip(),
                    "prima": prima,
                    "tipo_documento_id": id_doc,
                    "responsable_id": id_responsable,
                    "producto_id": producto_id,
                    "ramo_id": ramo_id,
                    "aseguradora_id": aseguradora_id,
                    "estado_id": estado_id,
                    "fecha_expedicion": fecha_expedicion,
                    "observacion": str(row.get("OBSERVACION", "")).strip(),
                    "fecha_solicitud": str(row.get("MES", "")).strip(),
                })

            except Exception as e:
                errores.append({
                    "fila": i,
                    "documento": row.get("CEDULA"),
                    "motivo": str(e)
                })

            if not valid_rows:
                return {
                    "importadas": 0,
                    "omitidas": len(errores),
                    "errores": errores
                }

        # -----------------------------
        # 2. Preparar clientes únicos
        # -----------------------------
        clientes_dict = {}

        for r in valid_rows:
            doc = r["numero_documento"]

            if doc not in clientes_dict:
                clientes_dict[doc] = ClienteCreate(
                    nombre_completo=r["nombre_completo"],
                    numero_documento=doc,
                    tipo_documento_id=r["tipo_documento_id"],
                    celular=r["celular"] or "0",
                    responsable_id=r["responsable_id"]
                )

        # -----------------------------
        # 3. Bulk clientes
        # -----------------------------
        clientes_map = ClienteService.bulk_upsert_clientes(
            db,
            list(clientes_dict.values())
        )

        # -----------------------------
        # 4. Preparar pólizas
        # -----------------------------
        polizas = []

        numeros_poliza = [r["numero_poliza"] for r in valid_rows if r["numero_poliza"]]

        stmt = select(Poliza.numero_poliza).where(
            Poliza.numero_poliza.in_(numeros_poliza)
        )

        existentes = db.execute(stmt).scalars().all()
        existentes_set = set(existentes)

        for r in valid_rows:
            # evitar duplicados en DB
            if r["numero_poliza"] in existentes_set:
                errores.append({
                    "fila": r["fila"],
                    "documento": r["numero_documento"],
                    "motivo": f"Póliza ya existe: {r['numero_poliza']}"
                })
                continue

            cliente = clientes_map.get(r["numero_documento"])

            if not cliente:
                errores.append({
                    "fila": r["fila"],
                    "documento": r["numero_documento"],
                    "motivo": "Cliente no encontrado"
                })
                continue

            polizas.append(
                Poliza(
                    numero_poliza=r["numero_poliza"],
                    aseguradora_id=r["aseguradora_id"],
                    cliente_id=cliente.id,
                    asegurado_nombre=r["asegurado_nombre"],
                    prima=r["prima"],
                    producto_id=r["producto_id"],
                    ramo_id=r["ramo_id"],
                    responsable_id=r["responsable_id"],
                    estado_id=r["estado_id"],
                    fecha_expedicion=r["fecha_expedicion"],
                    observacion=r["observacion"],
                    fecha_solicitud=r["fecha_solicitud"],
                )
            )

        # -----------------------------
        # 5. Bulk pólizas
        # -----------------------------
        insertadas = PolizaService.bulk_insert_polizas(db, polizas)

        return {
            "importadas": insertadas,
            "omitidas": len(errores),
            "errores": errores
        }
    
    @staticmethod
    def bulk_insert_polizas(
        db: Session,
        polizas: List[Poliza],
        batch_size: int = 500
    ) -> int:
        """
        Inserta pólizas en lotes (chunking) para evitar sobrecargar la DB.

        Retorna número de pólizas insertadas exitosamente.
        """

        if not polizas:
            return 0

        total_insertadas = 0

        # ---------------------------------------
        # 1. Insertar en batches
        # ---------------------------------------
        for i in range(0, len(polizas), batch_size):
            batch = polizas[i:i + batch_size]

            try:
                db.bulk_save_objects(batch)
                db.commit()
                total_insertadas += len(batch)

            except Exception:
                db.rollback()

                # ---------------------------------------
                # 2. Fallback: intentar fila por fila
                # (permite capturar errores sin perder todo el batch)
                # ---------------------------------------
                for poliza in batch:
                    try:
                        db.add(poliza)
                        db.commit()
                        total_insertadas += 1
                    except Exception as e:
                        db.rollback()
                        print("ERROR EN BATCH:", e)
                        # opcional: loggear error aquí

        return total_insertadas
    
    @staticmethod
    def consultar_catalogos(db: Session) -> dict:
        tipos_documento = CatalogoService.get_tipos_documento(db)
        aseguradoras = CatalogoService.get_aseguradoras(db)
        ramos = CatalogoService.get_ramos(db)
        productos = CatalogoService.get_productos(db)
        estados_poliza = CatalogoService.get_estados_poliza(db)

        return {
            "tipos_documento": {td.nombre: td.id for td in tipos_documento},
            "aseguradoras": {a.nombre: a.id for a in aseguradoras},
            "ramos": {r.nombre: r.id for r in ramos},
            "productos": {p.nombre: p.id for p in productos},
            "estados_poliza": {e.nombre: e.id for e in estados_poliza},
        }
    
    @staticmethod
    def consultar_usuarios(db: Session) -> dict:
        usuarios = UsuarioService.listar_usuarios_activos(db)

        return {
            "usuarios": {u.nombre: u.id for u in usuarios}
        }
    

    # Exportar EXCEL

    @staticmethod
    def exportar_polizas(db: Session, current_user, filtros: dict) -> BytesIO:

        # ---------------------------------------
        # 1. Catálogos (para filtros y nombres)
        # ---------------------------------------
        catalogos = PolizaService.consultar_catalogos(db)

        estado_id = None
        aseguradora_id = None
        ramo_id = None

        if filtros.get("estado"):
            estado_id = catalogos["estados_poliza"].get(filtros["estado"])

        if filtros.get("aseguradora"):
            aseguradora_id = catalogos["aseguradoras"].get(filtros["aseguradora"])

        if filtros.get("ramo"):
            ramo_id = catalogos["ramos"].get(filtros["ramo"])

        # ---------------------------------------
        # 2. Query base
        # ---------------------------------------
        stmt = select(Poliza).join(Cliente)

        # Control por rol
        if current_user.rol == "ASESOR":
            stmt = stmt.where(Poliza.responsable_id == current_user.id)

        # Aplicar filtros
        if estado_id:
            stmt = stmt.where(Poliza.estado_id == estado_id)

        if aseguradora_id:
            stmt = stmt.where(Poliza.aseguradora_id == aseguradora_id)

        if ramo_id:
            stmt = stmt.where(Poliza.ramo_id == ramo_id)

        if filtros.get("responsable_id"):
            stmt = stmt.where(Poliza.responsable_id == filtros["responsable_id"])

        polizas = db.execute(stmt).scalars().all()

        # ---------------------------------------
        # 3. Catálogos en memoria (para nombres)
        # ---------------------------------------
        usuarios = PolizaService.consultar_usuarios(db)

        # invertir diccionarios: id -> nombre
        tipos_doc_map = {v: k for k, v in catalogos["tipos_documento"].items()}
        productos_map = {v: k for k, v in catalogos["productos"].items()}
        ramos_map = {v: k for k, v in catalogos["ramos"].items()}
        estados_map = {v: k for k, v in catalogos["estados_poliza"].items()}
        usuarios_map = {v: k for k, v in usuarios["usuarios"].items()}

        # ---------------------------------------
        # 4. Crear Excel
        # ---------------------------------------
        wb = Workbook()
        ws = wb.active
        ws.title = "Polizas"

        headers = [
            "MES",
            "CEDULA",
            "TIPO DE DOCUMENTO",
            "NOMBRE COMPLETO TOMADOR Y ASEGURADO",
            "ASEGURADORA",
            "# DE POLIZA",
            "CELULAR",
            "FECHA EXPEDICIÓN",
            "SOLUCIONES",
            "ESTADO",
            "PRIMA",
            "RESPONSABLE",
            "OBSERVACION"
        ]

        ws.append(headers)

        # ---------------------------------------
        # 5. Llenar filas
        # ---------------------------------------
        for p in polizas:
            cliente = p.cliente

            fecha = p.fecha_expedicion
            mes = fecha.strftime("%Y-%m-%d") if fecha else ""
            aseguradora = p.aseguradora.nombre

            soluciones = f"{productos_map.get(p.producto_id, '')} / {ramos_map.get(p.ramo_id, '')}"

            nombre_completo = cliente.nombre_completo or ""
            if p.asegurado_nombre:
                nombre_completo = f"{nombre_completo} / {p.asegurado_nombre}"

            row = [
                mes,
                cliente.numero_documento,
                tipos_doc_map.get(cliente.tipo_documento_id, ""),
                nombre_completo,
                aseguradora,
                p.numero_poliza,
                cliente.celular,
                fecha.strftime("%Y-%m-%d") if fecha else "",
                soluciones,
                estados_map.get(p.estado_id, ""),
                float(p.prima) if p.prima is not None else "",
                usuarios_map.get(p.responsable_id, ""),
                p.observacion or ""
            ]

            ws.append(row)

        # ---------------------------------------
        # 6. Guardar en memoria
        # ---------------------------------------
        output = BytesIO()
        wb.save(output)
        output.seek(0)

        return output