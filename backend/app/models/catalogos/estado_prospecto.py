from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String
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

    # Relaciones

    prospectos: Mapped[list["Prospecto"]] = relationship(
        "Prospecto",
        back_populates="estado"
    )