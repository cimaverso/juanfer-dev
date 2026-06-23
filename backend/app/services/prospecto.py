from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError
from math import ceil
from sqlalchemy import select, or_, func, desc, asc, case, extract
from app.models.modulos_negocio.prospecto import Prospecto
from app.services.cliente import ClienteService
from app.services.catalogo import CatalogoService
from app.schemas.prospecto import ProspectoCreate, CambiarEstado
from app.schemas.cliente import ClienteCreate
from app.models.catalogos.estado_prospecto import EstadoProspecto
from datetime import timedelta, date
from fastapi import HTTPException

class ProspectoService:

    @staticmethod
    def obtener_prospectos(db: Session, page, limit, user):
        
        if user.rol == 'ADMIN':
            stmt = select(Prospecto)
        else:
            stmt = select(Prospecto).where(Prospecto.responsable_id == user.id)

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
    def obtener_prospecto_id(id: int, db: Session):
        stmt = select(Prospecto).where(Prospecto.id == id)
        prospecto = db.execute(stmt).scalar_one_or_none()

        if not prospecto:
            return None
        
        return prospecto
    
    @staticmethod
    def avanzar_contacto(id: int, db: Session):
        # Índices del array:   0, 1, 4, 6, 8, 10, 12
        # Intentos reales:     1, 2, 3, 4, 5,  6,  7
        CADENCIA_DIAS = [0, 1, 4, 6, 8, 10, 12]

        prospecto = ProspectoService.obtener_prospecto_id(id, db)
        
        # 1. Validación inicial (Paso 6.2)
        if prospecto.intentos_contacto >= 7:
            raise HTTPException(status_code=422, detail="Máximo de intentos alcanzado")
        
        # 2. Incrementar interacciones y guardar histórico de hoy
        prospecto.intentos_contacto += 1
        prospecto.estado_id += 1
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
    def cambiar_estado_prospecto(id_prospecto: int, nuevo_estado: CambiarEstado, db: Session):
        prospecto = ProspectoService.obtener_prospecto_id(id_prospecto, db)

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
        prospecto = ProspectoService.obtener_prospecto_id(id_prospecto, db)

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
    def actualizar_prospecto_poliza(prospecto_id: int, poliza_id: int, db: Session):
        prospecto = ProspectoService.obtener_prospecto_id(prospecto_id, db)

        if not prospecto:
            raise HTTPException(
                status_code=404,
                detail="Prospecto no encontrado"
            )
        
        prospecto.estado_id = 11 # Convertido
        prospecto.poliza_id = poliza_id

        return prospecto
