from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from app.models.historial.historial_responsable import HistorialResponsable
from typing import Optional

class HistorialResponsableService:

    @staticmethod
    def get_historial_id(id_historial: int, db: Session) -> Optional[list[HistorialResponsable]]:
        stmt = select(HistorialResponsable).where(HistorialResponsable.poliza_id == id_historial).order_by(desc(HistorialResponsable.fecha))
        return db.execute(stmt).scalars().all()