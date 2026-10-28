from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String, Time, Boolean, DateTime, ForeignKey, UniqueConstraint, text, func
from app.db.base import Base
from datetime import datetime, time
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.usuarios_clientes.usuario import Usuario

DIAS_SEMANA = ("lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo")


class HorarioUsuario(Base):
    __tablename__ = "horario_usuario"
    __table_args__ = (
        UniqueConstraint("usuario_id", "dia_semana", name="uq_horario_usuario_dia"),
    )

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    usuario_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("usuario.id", ondelete="CASCADE"),
        nullable=False
    )

    dia_semana: Mapped[str] = mapped_column(
        String(10),
        nullable=False
    )

    activo: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true")
    )

    hora_desde: Mapped[time] = mapped_column(
        Time,
        nullable=False
    )

    hora_hasta: Mapped[time] = mapped_column(
        Time,
        nullable=False
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
        back_populates="horarios"
    )
