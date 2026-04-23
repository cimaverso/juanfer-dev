from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String
from app.db.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.modulos_negocio.prospecto import Prospecto
    from app.models.modulos_negocio.cotizacion import Cotizacion

class Producto(Base):
    __tablename__ = "producto"

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

    prospectos: Mapped[list["Prospecto"]] = relationship(
        "Prospecto",
        back_populates="producto"
    )

    cotizaciones: Mapped[list["Cotizacion"]] = relationship(
        "Cotizacion",
        back_populates="producto"
    )