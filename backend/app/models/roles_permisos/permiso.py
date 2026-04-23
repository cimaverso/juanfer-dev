from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String
from app.db.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.roles_permisos.rol import Rol

class Permiso(Base):
    __tablename__ = "permiso"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    modulo: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    accion: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    # Relaciones

    roles: Mapped[list["Rol"]] = relationship(
        "Rol",
        secondary="rol_permiso",
        back_populates="permisos"
    )