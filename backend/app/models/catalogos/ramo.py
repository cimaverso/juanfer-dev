from sqlalchemy import Column, Integer, String
from app.db.base import Base

class Ramo(Base):
    __tablename__ = "ramo"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), nullable=False, unique=True)
    nombre = Column(String(50), nullable=False, unique=True)