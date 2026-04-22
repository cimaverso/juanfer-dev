from sqlalchemy import Column, Integer, String, Text
from app.db.base import Base

class Banco(Base):
    __tablename__ = "banco"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False, unique=True)
    correo = Column(String(100), nullable=True)
    requisitos = Column(Text, nullable=True)
