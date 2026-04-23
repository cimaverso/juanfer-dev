from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, Text, ForeignKey, DateTime, Date, Index
from app.db.base import Base
from datetime import datetime, timezone, date
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.usuarios_clientes.cliente import Cliente
    from app.models.modulos_negocio.prospecto import Prospecto
    from app.models.catalogos.aseguradora import Aseguradora
    from app.models.catalogos.producto import Producto
    from app.models.catalogos.estado_cotizacion import EstadoCotizacion
    from app.models.usuarios_clientes.usuario import Usuario
    from app.models.modulos_negocio.poliza import Poliza

class Cotizacion(Base):
    __tablename__ = "cotizacion"

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

    prospecto_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("prospecto.id", ondelete="SET NULL"),
        nullable=True
    )

    aseguradora_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("aseguradora.id", ondelete="RESTRICT") # Validar
    )

    producto_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("producto.id", ondelete="RESTRICT")
    )

    estado_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("estado_cotizacion.id"),
        nullable=False
    )

    responsable_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("usuario.id", ondelete="SET NULL") # Validar
    )

    fecha_cotizacion: Mapped[date] = mapped_column(
        Date,
        server_default=lambda: datetime.now(timezone.utc).date()
    )

    observacion: Mapped[str] = mapped_column(
        Text,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    # Índices
    __table_args__ = (
        Index("idx_cotizacion_estado_responsable", "estado_id", "responsable_id"),
    )

    # Relaciones

    cliente: Mapped["Cliente"] = relationship(
        "Cliente",
        back_populates="cotizaciones"
    )

    prospecto: Mapped["Prospecto"] = relationship(
        "Prospecto",
        back_populates="cotizaciones"
    )

    aseguradora: Mapped["Aseguradora"] = relationship(
        "Aseguradora",
        back_populates="cotizaciones"
    )

    producto: Mapped["Producto"] = relationship(
        "Producto",
        back_populates="cotizaciones"
    )

    estado: Mapped["EstadoCotizacion"] = relationship(
        "EstadoCotizacion",
        back_populates="cotizaciones"
    )

    responsable: Mapped["Usuario"] = relationship(
        "Usuario",
        back_populates="cotizaciones"
    )

    # Relación 1:1
    poliza: Mapped["Poliza"] = relationship(
        "Poliza",
        back_populates="cotizacion",
        uselist=False
    )