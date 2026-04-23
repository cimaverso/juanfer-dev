from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, ForeignKey, String, Text, Date, DateTime, Numeric, Integer, func, CheckConstraint
from decimal import Decimal
from app.db.base import Base
from datetime import datetime, date
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.models.usuarios_clientes.usuario import Usuario

class Auditoria(Base):
    __tablename__ = "auditoria"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    entidad: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )    

    entidad_id: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )  

    campo: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )

    valor_anterior: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )

    valor_nuevo: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )

    usuario_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("usuario.id", ondelete="RESTRICT"),
        nullable=False
    )

    fecha: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False,
        server_default=func.now()
    )

    # Relaciones

    usuario: Mapped["Usuario"] = relationship(
        "Usuario",
        back_populates="auditorias"
    )