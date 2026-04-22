from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, String
from app.db.base import Base

class TipoDocumento(Base):
    __tablename__ = "tipo_documento"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    nombre: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        unique=True
    )