from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, text, String, Text, Boolean, DateTime, func

from app.db.base import Base
from datetime import datetime
from typing import Optional


class LinkProceso(Base):
    __tablename__ = "link_proceso"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    nombre: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    url: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    descripcion: Mapped[Optional[str]] = mapped_column(
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