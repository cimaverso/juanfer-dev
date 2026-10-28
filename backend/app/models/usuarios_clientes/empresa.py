from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, String, DateTime, func
from app.db.base import Base
from datetime import datetime
from typing import Optional


class Empresa(Base):
    """Singleton por convención de aplicación: siempre una sola fila (id=1)."""
    __tablename__ = "empresa"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    nombre: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    nit: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    direccion: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    telefono: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    correo: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )
