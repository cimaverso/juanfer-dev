from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String, text
from app.db.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.modulos_negocio.poliza import Poliza

class EstadoPoliza(Base):
    __tablename__ = "estado_poliza"

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
        String(20),
        server_default=text("'gris'")
    )

    # Relaciones

    polizas: Mapped[list["Poliza"]] = relationship(
        "Poliza",
        back_populates="estado"
    )