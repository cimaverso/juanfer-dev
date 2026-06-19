from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, DateTime, ForeignKey, Date, func, Text, Boolean, text
from app.db.base import Base
from datetime import datetime, date
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.models.usuarios_clientes.usuario import Usuario
    from app.models.modulos_negocio.prospecto import Prospecto

class Tarea(Base):
    __tablename__ = "tarea"

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
        ForeignKey("usuario.id", ondelete="RESTRICT"),
        nullable=False
    )

    descripcion: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    fecha_programada: Mapped[Optional[Date]] = mapped_column(
        Date,
        nullable=True
    )

    completada: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        server_default=text("false")
    )

    completada_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        server_default=func.now()
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

    usuario: Mapped["Usuario"] = relationship(
        "Usuario",
        back_populates="tareas"
    )

    prospecto: Mapped["Prospecto"] = relationship(
        "Prospecto",
        back_populates="tareas"
    )