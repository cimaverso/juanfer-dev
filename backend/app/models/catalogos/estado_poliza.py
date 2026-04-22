from sqlalchemy import Column, Integer, String, text
from app.db.base import Base

class EstadoPoliza(Base):
    __tablename__ = "estado_poliza"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), nullable=False, unique=True)
    color = Column(String(20), server_default=text("'gris'"))
