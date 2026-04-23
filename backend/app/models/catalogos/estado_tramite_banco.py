from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String
from app.db.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.operaciones.endoso_banco import EndosoBanco

class EstadoTramiteBanco(Base):
    __tablename__ = "estado_tramite_banco"

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

    estado_endosos: Mapped[list["EndosoBanco"]] = relationship(
        "EndosoBanco",
        back_populates="estado_tramite"
    )