from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, ForeignKey, String, Text, Integer, text, Boolean
from app.db.base import Base
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.models.catalogos.nivel_alerta import NivelAlerta

class ConfigAlerta(Base):
    __tablename__ = "config_alerta"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    tipo: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    descripcion: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )

    umbral_dias: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    nivel_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("nivel_alerta.id"),
        nullable=False
    )

    activo: Mapped[bool] = mapped_column(
        Boolean,
        server_default=text("true")
    )

    # Relaciones

    nivel: Mapped["NivelAlerta"] = relationship(
        "NivelAlerta",
        back_populates="config_nivel_alerta"
    )