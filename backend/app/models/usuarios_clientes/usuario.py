from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String, ForeignKey, Boolean, DateTime, text
from app.db.base import Base
from datetime import datetime, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.roles_permisos.rol import Rol
    from app.models.usuarios_clientes.cliente import Cliente

class Usuario(Base):
    __tablename__ = "usuario"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    nombre: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    email: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    rol_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("rol.id", ondelete="RESTRICT"), 
        nullable=False
    )

    activo: Mapped[bool] = mapped_column(
        Boolean,
        server_default=text("true")
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    # Relaciones

    rol: Mapped["Rol"] = relationship(
        "Rol",
        back_populates="usuarios"
    )

    clientes: Mapped[list["Cliente"]] = relationship(
        "Cliente",
        back_populates="responsable"
    )