from sqlalchemy import Column, Integer, String
from app.db.base import Base

class NivelAlerta(Base):
    __tablename__ = "nivel_alerta"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), nullable=False, unique=True)