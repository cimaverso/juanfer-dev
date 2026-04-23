from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String, Text, DateTime, ForeignKey, CheckConstraint, func, Index
from datetime import datetime
from app.db.base import Base
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.models.modulos_negocio.poliza import Poliza
    from app.models.usuarios_clientes.usuario import Usuario
    
class HistorialResponsable(Base):
    __tablename__ = "historial_responsable"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    poliza_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("poliza.id", ondelete="CASCADE"),
        nullable=False
    )

    usuario_anterior_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("usuario.id", ondelete="RESTRICT"),
        nullable=True
    )

    usuario_nuevo_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("usuario.id", ondelete="RESTRICT"),
        nullable=False
    )

    realizado_por_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("usuario.id", ondelete="RESTRICT"),
        nullable=False
    )

    tipo: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default='TRASPASO'
    )

    motivo: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    fecha: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now()
    )


    # Validaciones e índices

    __table_args__ = (
        # Validar tipo de movimiento (TRASPASO, REASIGNACION)
        CheckConstraint(
            "tipo IN ('TRASPASO', 'REASIGNACION')",
            name="check_tipo_movimiento"
        ),

        # Índices
        Index(
            "idx_historial_responsable_poliza",
            poliza_id,
            fecha.desc()
        ),
        Index(
            "idx_historial_responsable_nuevo",
            usuario_nuevo_id,
            fecha.desc()
        ),
    )

    # Relaciones

    poliza: Mapped["Poliza"] = relationship(
        "Poliza",
        back_populates="historial_responsables"
    )

    usuario_anterior: Mapped["Usuario"] = relationship(
        "Usuario",
        foreign_keys=[usuario_anterior_id]
    )

    usuario_nuevo: Mapped["Usuario"] = relationship(
        "Usuario",
        foreign_keys=[usuario_nuevo_id]
    )

    realizado_por: Mapped["Usuario"] = relationship(
        "Usuario",
        foreign_keys=[realizado_por_id]
    )