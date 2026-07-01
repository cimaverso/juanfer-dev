from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError
from math import ceil
from sqlalchemy import select, or_, func, desc, asc, case, extract
from app.models.modulos_negocio.prospecto import Prospecto
from app.models.usuarios_clientes.cliente import Cliente
from app.services.cliente import ClienteService
from app.services.catalogo import CatalogoService
from app.schemas.prospecto import ProspectoCreate, CambiarEstado, ProspectoUpdate, ProspectoFiltro, ProspectoCreateImport
from app.schemas.cliente import ClienteCreate, ClienteUpdate
from app.models.catalogos.estado_prospecto import EstadoProspecto
from datetime import timedelta, date
from fastapi import HTTPException
from io import BytesIO
from openpyxl import Workbook
from app.enums import BulkUpsertMode

class ProspectoService:

    @staticmethod
    def obtener_prospectos(db: Session, page, limit, user, filtros: ProspectoFiltro):
        
        if user.rol == 'ADMIN':
            stmt = select(Prospecto)
        else:
            stmt = select(Prospecto).where(Prospecto.responsable_id == user.id)

        if filtros.busqueda:
            stmt = stmt.join(Cliente).where(
                or_(
                    Cliente.nombre_completo.ilike(f"%{filtros.busqueda}%"),
                    Cliente.numero_documento.ilike(f"%{filtros.busqueda}%")
                )
            )

        if filtros.estado_id:
            stmt = stmt.where(
                Prospecto.estado_id == filtros.estado_id
            )

        if filtros.canal_origen:
            stmt = stmt.where(
                Prospecto.canal_origen == filtros.canal_origen
            )

        if user.rol == "ADMIN" and filtros.responsable_id:
            stmt = stmt.where(
                Prospecto.responsable_id == filtros.responsable_id
            )

        hoy = date.today()

        if filtros.proximo_contacto == "hoy":
            stmt = stmt.where(
                Prospecto.proximo_contacto == hoy
            )

        if filtros.proximo_contacto == "vencido":
            stmt = stmt.where(
                Prospecto.proximo_contacto < hoy
            )

        if filtros.proximo_contacto == "semana":
            stmt = stmt.where(
                Prospecto.proximo_contacto.between(
                    hoy,
                    hoy + timedelta(days=7)
                )
            )

        total = db.scalar(
            select(func.count()).select_from(stmt.subquery())
        )

        prospectos = (
            db.execute(
                stmt
                .offset((page - 1) * limit)
                .limit(limit)
            )
            .scalars()
            .all()
        )

        return {
            "items": prospectos,
            "total": total,
            "page": page,
            "pages": ceil(total / limit)
        }
        
    @staticmethod
    def crear_prospecto(db: Session, data: ProspectoCreate):
        data_cliente = ClienteCreate(
            nombre_completo= data.nombre,
            numero_documento= data.numero_documento,
            tipo_documento_id= data.tipo_documento_id,
            celular= data.telefono,
            correo= data.correo,
            ocupacion= data.ocupacion,
            ciudad= data.ciudad,
            responsable_id= data.responsable_id
        )
        # Se busca cliente, si no existe se registra. El método del ClienteService ya se encarga de manejar la lógica de registro.
        cliente = ClienteService.registrar_cliente(db, data_cliente)

        nuevo_prospecto = Prospecto(
            cliente_id = cliente.id,
            estado_id = 1,
            canal_origen = data.canal_origen,
            aseguradora_interes_id = data.aseguradora_interes_id,
            ramo_interes_id = data.ramo_interes_id,
            responsable_id = data.responsable_id,
            observaciones = data.observaciones,
            fecha_primer_contacto = func.current_date()
        )

        db.add(nuevo_prospecto)
        db.commit()
        db.refresh(nuevo_prospecto)
        return nuevo_prospecto
    
    @staticmethod
    def resumen_pipeline(db: Session, user):


        stmt = (
            select(
                EstadoProspecto.id.label("estado_id"),
                EstadoProspecto.nombre.label("estado_nombre"),
                EstadoProspecto.color.label("estado_color"),
                func.count(Prospecto.id).label("cantidad")
            )
            .join(Prospecto, Prospecto.estado_id == EstadoProspecto.id)
        )

        if user.rol != 'ADMIN':
            stmt = stmt.where(Prospecto.responsable_id == user.id)

        stmt = stmt.group_by(
            EstadoProspecto.id,
            EstadoProspecto.nombre,
            EstadoProspecto.color
        )

        result = db.execute(stmt).mappings().all()
        return result
    
    @staticmethod
    def obtener_prospecto_id(id: int, db: Session, user):
        if user.rol == "ASESOR":
            stmt = select(Prospecto).where(Prospecto.id == id and Prospecto.responsable_id == user.id)
        else:
            stmt = select(Prospecto).where(Prospecto.id == id)

        prospecto = db.execute(stmt).scalar_one_or_none()

        if not prospecto:
            raise HTTPException(
                status_code=400,
                detail="Prospecto no encontrado"
            )
        
        if prospecto.responsable_id != user.id and user.rol != "ADMIN":
            raise HTTPException(
                status_code=403,
                detail="El prospecto pertenece a otro asesor."
            )
        
        return prospecto
    
    @staticmethod
    def avanzar_contacto(id: int, db: Session, user):
        # Índices del array:   0, 1, 4, 6, 8, 10, 12
        # Intentos reales:     1, 2, 3, 4, 5,  6,  7
        CADENCIA_DIAS = [0, 1, 4, 6, 8, 10, 12]

        prospecto = ProspectoService.obtener_prospecto_id(id, db, user)
        
        # 1. Validación inicial (Paso 6.2)
        if prospecto.intentos_contacto >= 7:
            raise HTTPException(status_code=422, detail="Máximo de intentos alcanzado")
        
        # 2. Incrementar interacciones y guardar histórico de hoy
        prospecto.intentos_contacto += 1
        prospecto.estado_id += 1 # Validar para refactor, bug al cambiar de estado manualmente
        prospecto.fecha_ultimo_contacto = date.today()
        
        # Si por alguna razón es su primer contacto y no tiene fecha base, la inicializamos hoy
        if not prospecto.fecha_primer_contacto:
            prospecto.fecha_primer_contacto = date.today()

        # 3. CORRECCIÓN DEL ÍNDICE: Restamos 1 para alinearlo con la tabla 6.1
        # Intento 1 -> índice 0 -> 0 días. Intento 7 -> índice 6 -> 12 días.
        indice = prospecto.intentos_contacto - 1
        dias = CADENCIA_DIAS[indice]
        
        # Lógica exacta solicitada: Base estática (fecha_primer_contacto) + días de la tabla
        prospecto.proximo_contacto = prospecto.fecha_primer_contacto + timedelta(days=dias)
        
        # 4. Actualización de estado automático al llegar al límite
        if prospecto.intentos_contacto == 7:
            prospecto.estado_id = 12  # Descartado

        
        try:
            db.commit()
            return prospecto
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=422, detail=f"Error al procesar la transacción: {str(e)}")
        
    @staticmethod
    def cambiar_estado_prospecto(id_prospecto: int, nuevo_estado: CambiarEstado, db: Session, user):
        prospecto = ProspectoService.obtener_prospecto_id(id_prospecto, db, user)

        if not prospecto:
            raise HTTPException(status_code=400, detail="Prospecto no encontrado")
        
        nuevo_estado_id = nuevo_estado.estado_id
        estados = CatalogoService.listar_estados_prospecto(db)
        lista_id_estados = [estado.id for estado in estados]
        print(lista_id_estados)

        if nuevo_estado_id not in lista_id_estados:
            raise HTTPException(
                status_code=422,
                detail=f"El estado ID {nuevo_estado_id} no es válido."
            )
        
        prospecto.estado_id = nuevo_estado_id

        try:
            db.commit()
            db.refresh(prospecto)
            return prospecto
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=422, detail=f"Error al cambiar el estado: {str(e)}")


    @staticmethod
    def convertir_prospecto_poliza(id_prospecto: int, db: Session, user):
        prospecto = ProspectoService.obtener_prospecto_id(id_prospecto, db, user)

        if not prospecto:
            raise HTTPException(
                status_code=404,
                detail="Prospecto no encontrado"
            )
        
        if prospecto.responsable_id != user.id and user.rol != "ADMIN":
            raise HTTPException(
                status_code=403,
                detail="El prospecto no te pertenece"
            )

        if prospecto.estado_id == 11:
            raise HTTPException(
                status_code=403,
                detail="El prospecto ya fue convertido"
            )
        
        return prospecto
    

    @staticmethod
    def actualizar_prospecto_poliza(prospecto_id: int, poliza_id: int, db: Session, user):
        prospecto = ProspectoService.obtener_prospecto_id(prospecto_id, db, user)

        if not prospecto:
            raise HTTPException(
                status_code=404,
                detail="Prospecto no encontrado"
            )
        
        prospecto.estado_id = 11 # Convertido
        prospecto.poliza_id = poliza_id

        return prospecto


    @staticmethod
    def editar_prospecto(db: Session, id_prospecto: int, data: ProspectoUpdate, user):
        prospecto = ProspectoService.obtener_prospecto_id(id_prospecto, db, user)
        id_cliente = prospecto.cliente_id

        if prospecto.responsable_id != user.id and user.rol != "ADMIN":
            raise HTTPException(
                status_code=403,
                detail="El prospecto está asignado a otro asesor"
            )

        prospecto_data = data.model_dump(exclude_unset=True)

        campos_cliente = {
            "nombre",
            "tipo_documento_id",
            "numero_documento",
            "telefono",
            "correo",
            "ocupacion",
            "ciudad"
        }

        cliente_payload = {
            k: v
            for k, v in prospecto_data.items()
            if k in campos_cliente
        }

        prospecto_payload = {
            k: v
            for k, v in prospecto_data.items()
            if k not in campos_cliente
        }

        if cliente_payload:
            cliente_data = ClienteUpdate(
                nombre_completo=cliente_payload.get("nombre"),
                tipo_documento_id=cliente_payload.get("tipo_documento_id"),
                numero_documento=cliente_payload.get("numero_documento"),
                celular=cliente_payload.get("telefono"),
                correo=cliente_payload.get("correo"),
                ocupacion=cliente_payload.get("ocupacion"),
                ciudad=cliente_payload.get("ciudad"),
            )

            ClienteService.actualizar_cliente(
                db,
                cliente_data,
                id_cliente
            )

        for field, value in prospecto_payload.items():
            setattr(prospecto, field, value)

        db.commit()
        db.refresh(prospecto)

        return prospecto
    

    @staticmethod
    def obtener_plantilla(db: Session):

        wb = Workbook()
        ws = wb.active
        ws.title = "Prospectos"

        headers = [
            "NOMBRE",
            "TIPO_DOCUMENTO",
            "NUMERO_DOCUMENTO",
            "TELEFONO",
            "CORREO",
            "OCUPACION",
            "CIUDAD",
            "RAMO_INTERES",
            "ASEGURADORA",
            "OBSERVACIONES"
        ]

        ws.append(headers)

        archivo = BytesIO()
        wb.save(archivo)
        archivo.seek(0)

        return archivo

    @staticmethod
    def _prospecto_key(cliente_id, ramo_id, aseguradora_id):
        return (cliente_id, ramo_id, aseguradora_id)

    @staticmethod
    def importar_prospectos_csv(data: ProspectoCreateImport, db: Session, user):

        # ---------------------------------------
        # 1. Precarga de catálogos
        # ---------------------------------------
        tipos_documentos = {
            t.nombre.upper(): t
            for t in CatalogoService.get_tipos_documento(db)
        }

        ramos = {
            r.nombre.upper(): r
            for r in CatalogoService.get_ramos(db)
        }

        aseguradoras = {
            a.nombre.upper(): a
            for a in CatalogoService.get_aseguradoras(db)
        }

        errores = []
        clientes_create = []
        filas_validas = []

        # ---------------------------------------
        # 2. Validación de filas
        # ---------------------------------------
        for idx, fila in enumerate(data.filas, start=2):

            tipo = tipos_documentos.get(fila.tipo_documento.upper())
            if not tipo:
                errores.append({
                    "fila": idx,
                    "motivo": f"Tipo de documento '{fila.tipo_documento}' no existe."
                })
                continue

            ramo = None
            if fila.ramo_interes:
                ramo = ramos.get(fila.ramo_interes.upper())
                if not ramo:
                    errores.append({
                        "fila": idx,
                        "motivo": f"Ramo '{fila.ramo_interes}' no existe."
                    })
                    continue

            aseguradora = None
            if fila.aseguradora:
                aseguradora = aseguradoras.get(fila.aseguradora.upper())
                if not aseguradora:
                    errores.append({
                        "fila": idx,
                        "motivo": f"Aseguradora '{fila.aseguradora}' no existe."
                    })
                    continue

            clientes_create.append(
                ClienteCreate(
                    nombre_completo=fila.nombre,
                    tipo_documento_id=tipo.id,
                    numero_documento=fila.numero_documento,
                    celular=fila.telefono,
                    correo=fila.correo,
                    ocupacion=fila.ocupacion,
                    ciudad=fila.ciudad,
                    responsable_id=user.id
                )
            )

            filas_validas.append({
                "fila": fila,
                "tipo": tipo,
                "ramo": ramo,
                "aseguradora": aseguradora,
                "idx": idx
            })

        # ---------------------------------------
        # 3. Upsert clientes (una sola vez)
        # ---------------------------------------
        clientes = ClienteService.bulk_upsert_clientes(
            db,
            clientes_create,
            BulkUpsertMode.FLUSH
        )

        cliente_ids = [c.id for c in clientes.values()]

        # ---------------------------------------
        # 4. Obtener prospectos existentes activos
        # ---------------------------------------
        stmt = (
            select(Prospecto)
            .where(
                Prospecto.cliente_id.in_(cliente_ids),
                Prospecto.estado_id.notin_([11, 12])
            )
        )

        existentes = {
            ProspectoService._prospecto_key(
                p.cliente_id,
                p.ramo_interes_id,
                p.aseguradora_interes_id
            ): p
            for p in db.execute(stmt).scalars()
        }

        # ---------------------------------------
        # 5. Construcción de prospectos
        # ---------------------------------------
        prospectos = []
        vistos_en_batch = set()  # <- nuevo: detecta duplicados dentro del mismo CSV

        for item in filas_validas:

            fila = item["fila"]
            cliente = clientes[fila.numero_documento]

            key = ProspectoService._prospecto_key(
                cliente.id,
                item["ramo"].id if item["ramo"] else None,
                item["aseguradora"].id if item["aseguradora"] else None
            )

            # duplicado activo en BD → error
            if key in existentes:
                errores.append({
                    "fila": item["idx"],
                    "motivo": "Ya existe un prospecto activo para este cliente, ramo y aseguradora."
                })
                continue

            # duplicado dentro del mismo archivo → error
            if key in vistos_en_batch:
                errores.append({
                    "fila": item["idx"],
                    "motivo": "Fila duplicada dentro del mismo archivo (mismo cliente, ramo y aseguradora)."
                })
                continue

            vistos_en_batch.add(key)

            prospectos.append(
                Prospecto(
                    cliente_id=cliente.id,
                    canal_origen="csv",
                    estado_id=1,
                    responsable_id=user.id,
                    aseguradora_interes_id=item["aseguradora"].id if item["aseguradora"] else None,
                    ramo_interes_id=item["ramo"].id if item["ramo"] else None,
                    observaciones=fila.observaciones
                )
            )

        # ---------------------------------------
        # 6. Persistencia en bulk
        # ---------------------------------------
        if prospectos:
            db.bulk_save_objects(prospectos)
            db.commit()

        # ---------------------------------------
        # 7. Resultado
        # ---------------------------------------
        return {
            "importados": len(prospectos),
            "omitidos": len(errores),
            "errores": errores
        }