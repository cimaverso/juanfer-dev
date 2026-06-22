from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, DateTime, ForeignKey, func, String, CheckConstraint, Text
from app.db.base import Base
from datetime import datetime
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.models.usuarios_clientes.usuario import Usuario
    from app.models.operaciones.conversacion import Conversacion

class Mensaje(Base):
    __tablename__ = "mensaje"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    conversacion_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("conversacion.id", ondelete="CASCADE"),
        nullable=False
    )

    # Null si inbound/cliente
    usuario_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("usuario.id", ondelete="SET NULL"),
        nullable=True
    )

    # Dirección del mensaje, entrada o salida del sistema
    direccion: Mapped[str] = mapped_column(
        String(10),
        nullable=False
    )

    tipo_canal: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        server_default="texto"
    )

    contenido: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    waba_message_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )

    estado_entrega: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="pendiente"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False,
        server_default=func.now()
    )

    # Relaciones

    conversacion: Mapped["Conversacion"] = relationship(
        "Conversacion",
        back_populates="mensajes"
    )

    usuario: Mapped[Optional["Usuario"]] = relationship(
        "Usuario",
        back_populates="mensajes"
    )

    # Validaciones

    __table_args__ = (
        CheckConstraint(
            "direccion IN ('inbound', 'outbound')",
            name="ck_direccion_mensaje"
        ),
        CheckConstraint(
            "tipo_canal IN ('texto', 'imagen', 'documento', 'audio', 'whatsapp_template', 'whatsapp_libre')",
            name="ck_tipo_canal_mensaje"
        ),
        CheckConstraint(
            "estado_entrega IN ('pendiente', 'enviado', 'entregado', 'leido', 'fallido')",
            name="ck_estado_entrega_mensaje"
        ),
    )