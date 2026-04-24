from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, Text, ForeignKey, DateTime, func
from app.db.base import Base
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.models.modulos_negocio.prospecto import Prospecto
    from app.models.usuarios_clientes.usuario import Usuario

class NotaProspecto(Base):
    __tablename__ = "nota_prospecto"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    prospecto_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("prospecto.id", ondelete="CASCADE"),
        nullable=False
    )

    usuario_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("usuario.id", ondelete="RESTRICT"), # Validar
        nullable=False
    )

    contenido: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    fecha: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=True
    )

    # Relaciones

    prospecto: Mapped["Prospecto"] = relationship(
        "Prospecto",
        back_populates="notas"
    )

    usuario: Mapped["Usuario"] = relationship(
        "Usuario",
        back_populates="notas_prospecto"
    )