from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.historial.historial_responsable import HistorialResponsable
from typing import Optional

class HistorialResponsableService:

    @staticmethod
    def get_historial_id(id_historial: int, db: Session) -> Optional[list[HistorialResponsable]]:
        stmt = select(HistorialResponsable).where(HistorialResponsable.id == id_historial)
        return db.execute(stmt).scalars().all()