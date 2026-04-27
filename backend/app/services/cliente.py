from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.usuarios_clientes.cliente import Cliente
from app.schemas.cliente import ClienteCreate
from typing import Optional

class ClienteService:

    @staticmethod
    def buscar_por_documento(db: Session, documento: str) -> Optional[Cliente]:
        stmt = select(Cliente).where(Cliente.numero_documento == documento)
        return db.execute(stmt).scalar_one_or_none()
    
    @staticmethod
    def registrar_cliente(db: Session, data: ClienteCreate):
        cliente_found = ClienteService.buscar_por_documento(db, data.numero_documento)
        if cliente_found:
            return None
        
        nuevo_cliente = Cliente(**data.model_dump())

        db.add(nuevo_cliente)
        db.commit()
        db.refresh(nuevo_cliente)

        return nuevo_cliente