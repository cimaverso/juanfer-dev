from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.usuarios_clientes.cliente import Cliente
from typing import Optional

class ClienteService:

    @staticmethod
    def buscar_por_documento(db: Session, documento: str) -> Optional[Cliente]:
        stmt = select(Cliente).where(Cliente.numero_documento == documento)
        return db.execute(stmt).scalar_one_or_none()