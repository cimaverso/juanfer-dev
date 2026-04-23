from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, Date, Text, DateTime, func, ForeignKey
from app.db.base import Base
from datetime import datetime, date
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.models.modulos_negocio.poliza import Poliza
    from app.models.usuarios_clientes.cliente import Cliente
    from app.models.catalogos.estado_cambio_intermediario import EstadoCambioIntermediario

class CambioIntermediario(Base):
    __tablename__ = "cambio_intermediario"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    cliente_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("cliente.id", ondelete="RESTRICT"),
        nullable=False
    )

    poliza_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("poliza.id", ondelete="RESTRICT"),
        nullable=False
    )

    estado_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("estado_cambio_intermediario.id", ondelete="RESTRICT"),
        nullable=False
    )

    fecha_cambio: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True
    )

    fecha_limite_reclamacion: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True
    )

    observacion: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False,
        server_default=func.now()
    )

    # Relaciones

    cliente: Mapped["Cliente"] = relationship(
        "Cliente",
        back_populates="cambio_intermediario_cliente"
    )

    poliza: Mapped["Poliza"] = relationship(
        "Poliza",
        back_populates="cambio_intermediario"
    )

    estado: Mapped["EstadoCambioIntermediario"] = relationship(
        "EstadoCambioIntermediario",
        back_populates="estado_cambio_intermediario"
    )