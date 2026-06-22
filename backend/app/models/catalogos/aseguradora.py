from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, BigInteger
from app.db.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.modulos_negocio.cotizacion import Cotizacion
    from app.models.modulos_negocio.poliza import Poliza
    from app.models.modulos_negocio.prospecto import Prospecto

class Aseguradora(Base):
    __tablename__ = "aseguradora"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    nombre: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True
    )

    # Relaciones

    cotizaciones: Mapped[list["Cotizacion"]] = relationship(
        "Cotizacion",
        back_populates="aseguradora"
    )

    polizas: Mapped[list["Poliza"]] = relationship(
        "Poliza",
        back_populates="aseguradora"
    )

    prospectos: Mapped[list["Prospecto"]] = relationship(
        "Prospecto",
        back_populates="aseguradora_interes"
    )