from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, String
from app.db.base import Base

class EstadoCotizacion(Base):
    __tablename__ = "estado_cotizacion"

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