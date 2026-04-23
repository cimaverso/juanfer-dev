from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, String, Text
from app.db.base import Base
from typing import Optional

class Banco(Base):
    __tablename__ = "banco"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    nombre: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True
    )

    correo: Mapped[Optional[str | None]] = mapped_column(
        String(100),
        nullable=True
    )

    requisitos: Mapped[Optional[str | None]] = mapped_column(
        Text,
        nullable=True
    )