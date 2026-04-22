from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String
from app.db.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.roles_permisos.permiso import Permiso

class Rol(Base):
    __tablename__ = "rol"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    nombre: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        unique=True
    )

    permisos: Mapped[list["Permiso"]] = relationship(
        "Permiso",
        secondary="rol_permiso",
        back_populates="roles"
    )