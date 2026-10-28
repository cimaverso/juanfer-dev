from app.core.security import verify_password, create_access_token
from app.services.usuario import UsuarioService
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.models.catalogos.estado_poliza import EstadoPoliza
from app.models.catalogos.aseguradora import Aseguradora
from app.models.catalogos.producto import Producto
from app.models.catalogos.ramo import Ramo
from app.models.catalogos.tipo_documento import TipoDocumento
from app.models.catalogos.estado_prospecto import EstadoProspecto
from app.models.catalogos.catalogo_valor import CatalogoValor
from app.models.catalogos.catalogo_tipo import CatalogoTipo
from sqlalchemy.exc import IntegrityError
from app.schemas.catalogo import ActualizarEstadoPoliza, CrearEstadoPoliza, ActualizarAseguradora, CrearAseguradora, ActualizarProducto, CrearProducto, ActualizarRamo, CrearRamo, ActualizarTipoDocumento, CrearTipoDocumento, CatalogoTipoCreate, CatalogoValorCreate, CatalogoValorUpdate, CrearEstadoProspecto, ActualizarEstadoProspecto
from typing import Optional

class CatalogoService:

    # Catálogo genérico (CatalogoTipo / CatalogoValor) ----------------------------------
    @staticmethod
    def get_valor_id(db: Session, tipo_codigo: str, valor_codigo: str) -> Optional[int]:
        """
        Resuelve el id de un CatalogoValor a partir del codigo de su
        CatalogoTipo y su propio codigo, ej. ('formulario_estado', 'borrador').
        Lo usan los servicios de negocio (formularios, etc.) para asignar un
        estado/tipo por defecto sin depender de ids fijos.
        """
        stmt = (
            select(CatalogoValor.id)
            .join(CatalogoTipo, CatalogoValor.catalogo_tipo_id == CatalogoTipo.id)
            .where(CatalogoTipo.codigo == tipo_codigo, CatalogoValor.codigo == valor_codigo)
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def listar_tipos(db: Session):
        stmt = select(CatalogoTipo).order_by(CatalogoTipo.nombre)
        return db.execute(stmt).scalars().all()

    @staticmethod
    def crear_tipo(db: Session, data: CatalogoTipoCreate) -> Optional[CatalogoTipo]:
        nuevo_tipo = CatalogoTipo(
            codigo=data.codigo.strip(),
            nombre=data.nombre.strip(),
            descripcion=data.descripcion
        )

        db.add(nuevo_tipo)

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            return None

        db.refresh(nuevo_tipo)
        return nuevo_tipo

    @staticmethod
    def listar_valores(db: Session, tipo_codigo: str):
        stmt = (
            select(CatalogoValor)
            .join(CatalogoTipo, CatalogoValor.catalogo_tipo_id == CatalogoTipo.id)
            .where(CatalogoTipo.codigo == tipo_codigo)
            .order_by(CatalogoValor.orden)
        )
        return db.execute(stmt).scalars().all()

    @staticmethod
    def find_valor_by_id(db: Session, id: int) -> Optional[CatalogoValor]:
        stmt = select(CatalogoValor).where(CatalogoValor.id == id)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def crear_valor(db: Session, tipo_codigo: str, data: CatalogoValorCreate):
        stmt = select(CatalogoTipo).where(CatalogoTipo.codigo == tipo_codigo)
        tipo = db.execute(stmt).scalar_one_or_none()

        if not tipo:
            return "tipo_no_existe"

        if data.orden is not None:
            orden = data.orden
        else:
            stmt_max = select(func.max(CatalogoValor.orden)).where(CatalogoValor.catalogo_tipo_id == tipo.id)
            maximo = db.execute(stmt_max).scalar_one_or_none()
            orden = (maximo + 1) if maximo is not None else 0

        nuevo_valor = CatalogoValor(
            catalogo_tipo_id=tipo.id,
            codigo=data.codigo.strip(),
            nombre=data.nombre.strip(),
            descripcion=data.descripcion,
            orden=orden,
            metadatos=data.metadatos
        )

        db.add(nuevo_valor)

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            return "codigo_duplicado"

        db.refresh(nuevo_valor)
        return nuevo_valor

    @staticmethod
    def actualizar_valor(db: Session, id: int, data: CatalogoValorUpdate) -> Optional[CatalogoValor]:
        valor = CatalogoService.find_valor_by_id(db, id)

        if not valor:
            return None

        if data.nombre is not None:
            valor.nombre = data.nombre.strip()

        if data.descripcion is not None:
            valor.descripcion = data.descripcion

        if data.orden is not None:
            valor.orden = data.orden

        if data.activo is not None:
            valor.activo = data.activo

        if data.metadatos is not None:
            valor.metadatos = data.metadatos

        db.commit()
        db.refresh(valor)

        return valor

    # No existe eliminar_valor a propósito: el ON DELETE RESTRICT de las FKs
    # que apuntan a catalogo_valor (formulario.estado_id, etc.) solo protege
    # un valor que YA tiene alguna fila referenciándolo en este momento. Un
    # valor como 'borrador' puede no tener ninguna fila todavía y seguir
    # siendo indispensable porque el código lo asume por `codigo` (ver
    # app/models/formularios/constantes.py), no por FK — borrarlo rompe la
    # próxima creación aunque hoy "no esté en uso". El admin desactiva
    # (actualizar_valor con activo=False), nunca borra.

    # Estados Póliza--------------------------------------------------------------------
    @staticmethod
    def get_estados_poliza(db: Session):
        stmt = select(EstadoPoliza).order_by(EstadoPoliza.id)
        return db.execute(stmt).scalars().all()
    
    @staticmethod
    def find_estado_by_id(db: Session, id_estado: int) -> Optional[EstadoPoliza]:
        stmt = select(EstadoPoliza).where(EstadoPoliza.id == id_estado)
        return db.execute(stmt).scalar_one_or_none()
    
    @staticmethod
    def find_estado_by_name(db: Session, nombre: str) -> Optional[EstadoPoliza]:
        stmt = select(EstadoPoliza).where(EstadoPoliza.nombre == nombre.strip())
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def update_estado_poliza(db: Session, id_estado: int, data: ActualizarEstadoPoliza) -> Optional[EstadoPoliza]:
        estado_poliza = CatalogoService.find_estado_by_id(db, id_estado)

        if not estado_poliza:
            return None
        
        if data.nombre is not None:
            estado_poliza.nombre = data.nombre

        if data.color is not None:
            estado_poliza.color = data.color

        db.commit()
        db.refresh(estado_poliza)

        return estado_poliza
    
    @staticmethod
    def crear_estado(db: Session, data: CrearEstadoPoliza) -> Optional[EstadoPoliza]:
        estado_found = CatalogoService.find_estado_by_name(db, data.nombre)

        if estado_found:
            return None
        
        nuevo_estado = EstadoPoliza(
            nombre = data.nombre.strip(),
            color = data.color.strip().lower()
        )

        db.add(nuevo_estado)
        db.commit()
        db.refresh(nuevo_estado)

        return nuevo_estado
    
    @staticmethod
    def eliminar_estado(id: int, db: Session):
        estado_found = CatalogoService.find_estado_by_id(db, id)

        if not estado_found:
            return None
        
        db.delete(estado_found)
        db.commit()
        
        return True
    
    # Aseguradoras--------------------------------------------------------------------
    @staticmethod
    def get_aseguradoras(db: Session):
        stmt = select(Aseguradora).order_by(Aseguradora.id)
        return db.execute(stmt).scalars().all()
    
    @staticmethod
    def find_aseguradora_by_id(id: int, db: Session) -> Optional[Aseguradora]:
        stmt = select(Aseguradora).where(Aseguradora.id == id)
        return db.execute(stmt).scalar_one_or_none()
    
    @staticmethod
    def update_aseguradora(id: int, db: Session, data: ActualizarAseguradora) -> Optional[Aseguradora]:
        aseguradora_found = CatalogoService.find_aseguradora_by_id(id, db)

        if not aseguradora_found:
            return None
        
        if data.nombre is not None:
            aseguradora_found.nombre = data.nombre

        db.commit()
        db.refresh(aseguradora_found)

        return aseguradora_found
    
    @staticmethod
    def crear_aseguradora(data: CrearAseguradora, db: Session) -> Optional[Aseguradora]:
        if data.nombre is None:
            return None
        
        nueva_aseguradora = Aseguradora(nombre = data.nombre)

        db.add(nueva_aseguradora)
        db.commit()
        db.refresh(nueva_aseguradora)

        return nueva_aseguradora
    
    @staticmethod
    def eliminar_aseguradora(id: int, db: Session):
        aseguradora_found = CatalogoService.find_aseguradora_by_id(id, db)

        if not aseguradora_found:
            return None
        
        db.delete(aseguradora_found)
        db.commit()

        return True
    

    # Productos--------------------------------------------------------------------
    @staticmethod
    def get_productos(db: Session):
        stmt = select(Producto).order_by(Producto.id)
        return db.execute(stmt).scalars().all()
    
    @staticmethod
    def find_producto_by_id(id: int, db: Session) -> Optional[Producto]:
        stmt = select(Producto).where(Producto.id == id)
        return db.execute(stmt).scalar_one_or_none()
    
    @staticmethod
    def update_producto(id: int, db: Session, data: ActualizarProducto) -> Optional[Producto]:
        producto_found = CatalogoService.find_producto_by_id(id, db)

        if not producto_found:
            return None
        
        if data.nombre is not None:
            producto_found.nombre = data.nombre

        db.commit()
        db.refresh(producto_found)

        return producto_found
    
    @staticmethod
    def crear_producto(data: CrearProducto, db: Session) -> Optional[Producto]:
        if data.nombre is None:
            return None
        
        nuevo_producto = Producto(nombre = data.nombre)

        db.add(nuevo_producto)
        db.commit()
        db.refresh(nuevo_producto)

        return nuevo_producto
    
    @staticmethod
    def eliminar_producto(id: int, db: Session):
        producto_found = CatalogoService.find_producto_by_id(id, db)

        if not producto_found:
            return None
        
        db.delete(producto_found)
        db.commit()

        return True


    # Ramos--------------------------------------------------------------------
    @staticmethod
    def get_ramos(db: Session):
        stmt = select(Ramo).order_by(Ramo.id)
        return db.execute(stmt).scalars().all()
    
    @staticmethod
    def find_ramo_by_id(id: int, db: Session) -> Optional[Ramo]:
        stmt = select(Ramo).where(Ramo.id == id)
        return db.execute(stmt).scalar_one_or_none()
    
    @staticmethod
    def update_ramo(id: int, db: Session, data: ActualizarRamo) -> Optional[Ramo]:
        ramo_found = CatalogoService.find_ramo_by_id(id, db)

        if not ramo_found:
            return None
        
        if data.nombre is not None:
            ramo_found.nombre = data.nombre

        if data.codigo is not None:
            ramo_found.codigo = data.codigo

        db.commit()
        db.refresh(ramo_found)

        return ramo_found
    
    @staticmethod
    def crear_ramo(data: CrearRamo, db: Session) -> Optional[Ramo]:
        if data.nombre is None or data.codigo is None:
            return None
        
        nuevo_ramo = Ramo(
            codigo = data.codigo,
            nombre = data.nombre
            )

        db.add(nuevo_ramo)
        db.commit()
        db.refresh(nuevo_ramo)

        return nuevo_ramo
    
    @staticmethod
    def eliminar_ramo(id: int, db: Session):
        ramo_found = CatalogoService.find_ramo_by_id(id, db)

        if not ramo_found:
            return None
        
        db.delete(ramo_found)
        db.commit()

        return True
    
    # Tipos de documento--------------------------------------------------------------------
    @staticmethod
    def validar_nombre_registrado(nombre: str, db: Session) -> bool:
        stmt = select(TipoDocumento).where(TipoDocumento.nombre == nombre.strip().upper())
        tipo = db.execute(stmt).scalar_one_or_none()
        
        return tipo is not None

    @staticmethod
    def get_tipos_documento(db: Session):
        stmt = select(TipoDocumento).order_by(TipoDocumento.id)
        return db.execute(stmt).scalars().all()
    
    @staticmethod
    def get_id_tipo_doc(tipo_doc: str, db: Session) -> int | None:
        stmt = select(TipoDocumento.id).where(TipoDocumento.nombre == tipo_doc)
        return db.execute(stmt).scalar_one_or_none()
    
    @staticmethod
    def find_tipo_doc_by_id(id: int, db: Session) -> Optional[TipoDocumento]:
        stmt = select(TipoDocumento).where(TipoDocumento.id == id)
        return db.execute(stmt).scalar_one_or_none()
    
    @staticmethod
    def update_tipo_doc(id: int, db: Session, data: ActualizarTipoDocumento) -> Optional[TipoDocumento]:
        tipo_doc_found = CatalogoService.find_tipo_doc_by_id(id, db)

        if not tipo_doc_found:
            return None
        
        if data.nombre is not None:
            tipo_doc_found.nombre = data.nombre

        db.commit()
        db.refresh(tipo_doc_found)

        return tipo_doc_found
    
    @staticmethod
    def crear_tipo_documento(data: CrearTipoDocumento, db: Session) -> Optional[TipoDocumento]:
        if not data.nombre or not data.nombre.strip():
            return "empty_name", None
        
        nombre = data.nombre.strip().upper()
        
        if CatalogoService.validar_nombre_registrado(nombre, db):
            return "duplicate", None

        nuevo_tipo_doc = TipoDocumento(nombre = nombre)

        db.add(nuevo_tipo_doc)
        db.commit()
        db.refresh(nuevo_tipo_doc)

        return "ok", nuevo_tipo_doc
    
    @staticmethod
    def eliminar_tipo_doc(id: int, db: Session):
        tipo_doc_found = CatalogoService.find_tipo_doc_by_id(id, db)

        if not tipo_doc_found:
            return None
        
        db.delete(tipo_doc_found)
        db.commit()

        return True
    

    # Estados Prospectos -----------------------------------------------------------------

    @staticmethod
    def listar_estados_prospecto(db: Session):
        stmt = select(EstadoProspecto).where(EstadoProspecto.activo.is_(True))
        return db.execute(stmt).scalars().all()

    @staticmethod
    def listar_todos_estados_prospecto(db: Session):
        """Vista admin: incluye inactivos (listar_estados_prospecto solo trae activos, para el selector de ProspectoForm)."""
        stmt = select(EstadoProspecto).order_by(EstadoProspecto.orden)
        return db.execute(stmt).scalars().all()

    @staticmethod
    def find_estado_prospecto_by_id(db: Session, id: int) -> Optional[EstadoProspecto]:
        stmt = select(EstadoProspecto).where(EstadoProspecto.id == id)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def crear_estado_prospecto(db: Session, data: "CrearEstadoProspecto") -> Optional[EstadoProspecto]:
        if data.orden is not None:
            orden = data.orden
        else:
            stmt_max = select(func.max(EstadoProspecto.orden))
            maximo = db.execute(stmt_max).scalar_one_or_none()
            orden = (maximo + 1) if maximo is not None else 0

        nuevo_estado = EstadoProspecto(
            nombre=data.nombre.strip(),
            color=data.color.strip().lower(),
            orden=orden
        )

        db.add(nuevo_estado)

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            return None

        db.refresh(nuevo_estado)
        return nuevo_estado

    @staticmethod
    def actualizar_estado_prospecto(db: Session, id: int, data: "ActualizarEstadoProspecto") -> Optional[EstadoProspecto]:
        estado = CatalogoService.find_estado_prospecto_by_id(db, id)

        if not estado:
            return None

        if data.nombre is not None:
            estado.nombre = data.nombre.strip()

        if data.color is not None:
            estado.color = data.color.strip().lower()

        if data.orden is not None:
            estado.orden = data.orden

        if data.activo is not None:
            estado.activo = data.activo

        db.commit()
        db.refresh(estado)

        return estado

    # No existe eliminar_estado_prospecto a propósito: mismo criterio que el
    # catálogo genérico (ver DT-017) — el modelo ya trae `activo` pensado
    # para desactivar, no borrar; un estado sin prospectos hoy puede seguir
    # siendo indispensable para código que lo referencia por nombre.