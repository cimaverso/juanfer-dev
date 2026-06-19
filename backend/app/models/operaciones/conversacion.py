from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, DateTime, ForeignKey, func, String, CheckConstraint
from app.db.base import Base
from datetime import datetime
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.models.usuarios_clientes.cliente import Cliente
    from app.models.modulos_negocio.prospecto import Prospecto

class Conversacion(Base):
    __tablename__ = "conversacion"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    prospecto_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("prospecto.id", ondelete="SET NULL"),
        nullable=True
    )

    cliente_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("cliente.id", ondelete="SET NULL"),
        nullable=True
    )

    canal: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="whatsapp"
    )

    # Estado de la conversación
    estado: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="abierta"
    )

    waba_conversation_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False,
        server_default=func.now()
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )

    # Relaciones

    prospecto: Mapped[Optional["Prospecto"]] = relationship(
        "Prospecto",
        back_populates="conversaciones"
    )

    cliente: Mapped[Optional["Cliente"]] = relationship(
        "Cliente",
        back_populates="conversaciones"
    )

    # Validaciones

    __table_args__ = (
        CheckConstraint(
            "canal IN ('whatsapp', 'email', 'telefono', 'presencial')",
            name="ck_conversacion_canal"
        ),
        CheckConstraint(
            "estado IN ('abierta', 'cerrada', 'esperando')",
            name="ck_conversacion_estado"
        ),
    )