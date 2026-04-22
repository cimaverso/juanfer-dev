from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, DateTime, ForeignKey, Date
from app.db.base import Base
from datetime import datetime, timezone, date
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.usuarios_clientes.cliente import Cliente
    from app.models.catalogos.producto import Producto
    from app.models.catalogos.estado_prospecto import EstadoProspecto
    from app.models.usuarios_clientes.usuario import Usuario

class Prospecto(Base):
    __tablename__ = "prospecto"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    cliente_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("cliente.id", ondelete="CASCADE"),
        nullable=False
    )
    
    producto_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("producto.id", ondelete="RESTRICT"),
        nullable=False
    )

    estado_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("estado_prospecto.id", ondelete="RESTRICT"), 
        nullable=False
    )

    responsable_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("usuario.id", ondelete="SET NULL"),
        nullable=True
    )

    fecha_contacto: Mapped[date] = mapped_column(
        Date,
        default=lambda: datetime.now(timezone.utc).date()
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    # Relaciones

    cliente: Mapped["Cliente"] = relationship(
        "Cliente",
        back_populates="prospectos"
    )

    
    producto: Mapped["Producto"] = relationship(
        "Producto",
        back_populates="prospectos"
    )

    estado: Mapped["EstadoProspecto"] = relationship(
        "EstadoProspecto",
        back_populates="prospectos"
    )

    responsable: Mapped["Usuario"] = relationship(
        "Usuario",
        back_populates="prospectos"
    )