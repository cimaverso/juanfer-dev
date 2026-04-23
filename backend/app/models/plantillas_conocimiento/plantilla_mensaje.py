from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, ForeignKey, String, Text, text, DateTime, Boolean, func
from app.db.base import Base
from datetime import datetime
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.models.catalogos.categoria_mensaje import CategoriaMensaje
    
class PlantillaMensaje(Base):
    __tablename__ = "plantilla_mensaje"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    categoria_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("categoria_mensaje.id", ondelete="RESTRICT"),
        nullable=False
    )

    titulo: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    contenido: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )

    activo: Mapped[bool] = mapped_column(
        Boolean,
        server_default=text("true")
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False,
        server_default=func.now()
    )

    # Relaciones

    categoria: Mapped["CategoriaMensaje"] = relationship(
        "CategoriaMensaje",
        back_populates="plantilla_mensaje"
    )