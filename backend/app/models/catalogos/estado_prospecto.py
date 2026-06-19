from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String, SmallInteger, Boolean, text, DateTime, func
from datetime import datetime
from app.db.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.modulos_negocio.prospecto import Prospecto

class EstadoProspecto(Base):
    __tablename__ = "estado_prospecto"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    nombre: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True
    )

    color: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    orden: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False,
        default=0
    )

    activo: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        server_default=text("true")
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False,
        server_default=func.now()
    )

    # Relaciones

    prospectos: Mapped[list["Prospecto"]] = relationship(
        "Prospecto",
        back_populates="estado"
    )