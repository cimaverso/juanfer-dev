from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String, DateTime, ForeignKey
from app.db.base import Base
from datetime import datetime, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.catalogos.tipo_documento import TipoDocumento
    from app.models.usuarios_clientes.usuario import Usuario
    from app.models.modulos_negocio.prospecto import Prospecto

class Cliente(Base):
    __tablename__ = "cliente"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    tipo_documento_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("tipo_documento.id"),
        nullable=False
    )

    numero_documento: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        unique=True
    )

    nombre_completo: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    celular: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    responsable_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("usuario.id", ondelete="SET NULL"),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relaciones

    tipo_documento: Mapped["TipoDocumento"] = relationship(
        "TipoDocumento",
        back_populates="clientes"
    )

    responsable: Mapped["Usuario"] = relationship(
        "Usuario",
        back_populates="clientes"
    )

    prospectos: Mapped[list["Prospecto"]] = relationship(
        "Prospecto",
        back_populates="cliente"
    )