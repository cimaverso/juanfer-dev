from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String
from app.db.base import Base
from app.models.roles_permisos.rol_permiso import RolPermiso
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.roles_permisos.permiso import Permiso
    from app.models.usuarios_clientes.usuario import Usuario

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

    # Relaciones

    permisos: Mapped[list["Permiso"]] = relationship(
        "Permiso",
        secondary=RolPermiso.__table__,
        back_populates="roles"
    )

    usuarios: Mapped[list["Usuario"]] = relationship(
        "Usuario",
        back_populates="rol"
    )