from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, Text, DateTime, ForeignKey, func, Integer, Index
from app.db.base import Base
from datetime import datetime
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING: 
    from app.models.usuarios_clientes.cliente import Cliente
    from app.models.usuarios_clientes.usuario import Usuario

class HistorialResponsableCliente(Base):
    __tablename__ = "historial_responsable_cliente"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    cliente_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("cliente.id", ondelete="CASCADE"),
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

    motivo: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    polizas_afectadas: Mapped[int] = mapped_column(
        Integer,
        server_default="0"
    )

    fecha: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False
    )

    # Índices

    __table_args__ = (
        Index(
            "idx_historial_resp_cliente",
            cliente_id,
            fecha.desc()
        ),
    )

    # Relaciones

    cliente: Mapped["Cliente"] = relationship(
        "Cliente",
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