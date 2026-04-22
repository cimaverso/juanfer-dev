from sqlalchemy import Column, Integer, String
from app.db.base import Base

class CategoriaMensaje(Base):
    __tablename__ = "categoria_mensaje"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), nullable=False, unique=True)