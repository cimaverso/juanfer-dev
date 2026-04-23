from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String
from app.db.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.dashboard_alertas.config_alerta import ConfigAlerta

class NivelAlerta(Base):
    __tablename__ = "nivel_alerta"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    nombre: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True
    )

    # Relaciones

    config_nivel_alerta: Mapped[list["ConfigAlerta"]] = relationship(
        "ConfigAlerta",
        back_populates="nivel"
    )