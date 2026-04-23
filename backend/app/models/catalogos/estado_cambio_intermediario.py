from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String
from app.db.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING: 
    from app.models.operaciones.cambio_intermediario import CambioIntermediario

class EstadoCambioIntermediario(Base):
    __tablename__ = "estado_cambio_intermediario"

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

    # Relaciones

    estado_cambio_intermediario: Mapped[list["CambioIntermediario"]] = relationship(
        "CambioIntermediario",
        back_populates="estado"
    )