from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String
from app.db.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.plantillas_conocimiento.plantilla_mensaje import PlantillaMensaje

class CategoriaMensaje(Base):
    __tablename__ = "categoria_mensaje"

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

    plantilla_mensaje: Mapped[list["PlantillaMensaje"]] = relationship(
        "PlantillaMensaje",
        back_populates="categoria"
    )