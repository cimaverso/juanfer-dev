from sqlalchemy import Column, Integer, String
from app.db.base import Base

class TipoDocumento(Base):
    __tablename__ = "tipo_documento"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(20), nullable=False, unique=True)
