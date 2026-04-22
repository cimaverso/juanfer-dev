from sqlalchemy import Column, Integer, String
from app.db.base import Base

class EstadoCotizacion(Base):
    __tablename__ = "estado_cotizacion"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), nullable=False, unique=True)
