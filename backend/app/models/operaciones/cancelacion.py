from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, Date, Text, text, Boolean, DateTime, func, ForeignKey, Numeric, CheckConstraint
from decimal import Decimal
from app.db.base import Base
from datetime import datetime, date
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.models.modulos_negocio.poliza import Poliza
    from app.models.usuarios_clientes.usuario import Usuario

class Cancelacion(Base):
    __tablename__ = "cancelacion"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    poliza_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("poliza.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True # Relación 1:1
    )

    responsable_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("usuario.id", ondelete="RESTRICT"),
        nullable=False
    )

    fecha_cancelacion: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    motivo: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )

    valor_negativo: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False
    )

    es_definitiva: Mapped[bool] = mapped_column (
        Boolean,
        server_default=text("true")
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False,
        server_default=func.now()
    )

    # Validaciones

    __table_args__ = (
        CheckConstraint(
            "valor_negativo <= 0",
            name="check_valor_negativo"
        ),
    )

    # Relaciones

    # Relación 1:1, evitar duplicidad
    poliza: Mapped["Poliza"] = relationship(
        "Poliza",
        back_populates="cancelacion"
    )

    responsable: Mapped["Usuario"] = relationship(
        "Usuario",
        back_populates="cancelaciones"
    )