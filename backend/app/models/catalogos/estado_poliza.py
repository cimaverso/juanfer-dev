from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, String, text
from app.db.base import Base

class EstadoPoliza(Base):
    __tablename__ = "estado_poliza"

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

    color: Mapped[str] = mapped_column(
        String(20),
        server_default=text("'gris'")
    )