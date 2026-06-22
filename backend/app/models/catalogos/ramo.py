from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String
from app.db.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.modulos_negocio.poliza import Poliza
    from app.models.modulos_negocio.prospecto import Prospecto

class Ramo(Base):
    __tablename__ = "ramo"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    codigo: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        unique=True
    )

    nombre: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True
    )

    # Relaciones

    polizas: Mapped[list["Poliza"]] = relationship(
        "Poliza",
        back_populates="ramo"
    )

    prospectos: Mapped[list["Prospecto"]] = relationship(
        "Prospecto",
        back_populates="ramo_interes"
    )