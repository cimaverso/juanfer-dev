from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String
from app.db.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.usuarios_clientes.cliente import Cliente

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

    # Relaciones

    clientes: Mapped[list["Cliente"]] = relationship(
        "Cliente",
        back_populates="tipo_documento"
    )