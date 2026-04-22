from sqlalchemy import Column, Integer, String
from app.db.base import Base

class EstadoTramiteBanco(Base):
    __tablename__ = "estado_tramite_banco"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), nullable=False, unique=True)