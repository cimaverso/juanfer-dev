from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.models.usuarios_clientes.cliente import Cliente
from app.schemas.cliente import ClienteCreate, ClienteUpdate
from typing import Optional, List, Dict
from fastapi import HTTPException
from app.enums import BulkUpsertMode

class ClienteService:

    # Utils

    @staticmethod
    def _clean_str(val) -> str:
        if val is None:
            return ""
        val = str(val).strip()
        if val.lower() in ("none", "nan", "null", ""):
            return ""
        return val

    @staticmethod
    def _validar_documento(documento: str):
        if not documento:
            raise ValueError("Documento vacío")


    # Queries
    @staticmethod
    def buscar_por_documento(db: Session, documento: str) -> Optional[Cliente]:
        stmt = select(Cliente).where(Cliente.numero_documento == documento)
        return db.execute(stmt).scalar_one_or_none()

    # Single insert
    @staticmethod
    def registrar_cliente(db: Session, data: ClienteCreate):
        documento = ClienteService._clean_str(data.numero_documento)
        ClienteService._validar_documento(documento)

        data.numero_documento = documento

        cliente_found = ClienteService.buscar_por_documento(db, documento)
        if cliente_found:
            return cliente_found 

        nuevo_cliente = Cliente(**data.model_dump())

        try:
            db.add(nuevo_cliente)
            db.commit()
            db.refresh(nuevo_cliente)
            return nuevo_cliente

        except IntegrityError:
            db.rollback()
            return ClienteService.buscar_por_documento(db, documento)

    # Bulk upsert
    @staticmethod
    def bulk_upsert_clientes(
        db: Session,
        clientes_data: List[ClienteCreate],
        mode: BulkUpsertMode = BulkUpsertMode.COMMIT
    ) -> Dict[str, Cliente]:

        if not clientes_data:
            return {}

        # ---------------------------------------
        # 1. Validar + limpiar + deduplicar input
        # ---------------------------------------
        unique_clientes: Dict[str, ClienteCreate] = {}
        errores = []

        for c in clientes_data:
            doc = ClienteService._clean_str(c.numero_documento)

            if not doc:
                errores.append({
                    "documento": None,
                    "motivo": "Documento vacío"
                })
                continue

            c.numero_documento = doc
            unique_clientes[doc] = c  # dedupe automático

        if not unique_clientes:
            return {}

        documentos = list(unique_clientes.keys())

        # ---------------------------------------
        # 2. Consultar existentes
        # ---------------------------------------
        stmt = select(Cliente).where(
            Cliente.numero_documento.in_(documentos)
        )
        existentes = db.execute(stmt).scalars().all()

        existentes_map = {
            c.numero_documento: c for c in existentes
        }

        # ---------------------------------------
        # 3. Preparar nuevos
        # ---------------------------------------
        nuevos = []

        for doc, data in unique_clientes.items():
            if doc not in existentes_map:
                nuevos.append(
                    Cliente(**data.model_dump())
                )

        # ---------------------------------------
        # 4. Insertar en bulk (con protección)
        # ---------------------------------------
        if nuevos:
            try:
                db.bulk_save_objects(nuevos)
                if mode == BulkUpsertMode.COMMIT:
                    db.commit()
                else:
                    db.flush()

            except IntegrityError:
                db.rollback()

                for cliente in nuevos:
                    try:
                        db.add(cliente)

                        if mode == BulkUpsertMode.COMMIT:
                            db.commit()
                        else:
                            db.flush()

                    except IntegrityError:
                        db.rollback()
                        # ya existe → ignorar

        # ---------------------------------------
        # 5. Reconsultar TODOS (fuente de verdad)
        # ---------------------------------------
        stmt = select(Cliente).where(
            Cliente.numero_documento.in_(documentos)
        )
        todos = db.execute(stmt).scalars().all()

        return {
            c.numero_documento: c for c in todos
        }


    @staticmethod
    def buscar_cliente_id(id_cliente: int, db: Session):
        stmt = select(Cliente).where(Cliente.id == id_cliente)
        return db.execute(stmt).scalar_one_or_none()

    # Solo actualiza y devuelve el objeto, se llama desde ProspectoService
    @staticmethod
    def actualizar_cliente(db: Session, data: ClienteUpdate, id_cliente: int):
        cliente = ClienteService.buscar_cliente_id(id_cliente, db)

        if not cliente:
            raise HTTPException(
                status_code=400,
                detail="Cliente no encontrado"
            )
        
        updates = data.model_dump(exclude_unset=True)

        for field, value in updates.items():
            setattr(cliente, field, value)

        return cliente
    
    @staticmethod
    def listar_todos(db: Session):
        stmt = select(Cliente)
        return db.execute(stmt).scalars().all()
    
    # @staticmethod
    # def listar_clientes(db: Session, user):
    #     if user.rol == "ADMIN":
    #         stmt = select(Cliente)