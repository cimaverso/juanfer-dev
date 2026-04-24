from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, ForeignKey, String, Text, Date, DateTime, Numeric, Integer, func, CheckConstraint, Index, text
from decimal import Decimal
from app.db.base import Base
from datetime import datetime, date
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.models.usuarios_clientes.cliente import Cliente
    from app.models.catalogos.ramo import Ramo
    from app.models.catalogos.aseguradora import Aseguradora
    from app.models.catalogos.producto import Producto
    from app.models.catalogos.estado_poliza import EstadoPoliza
    from app.models.usuarios_clientes.usuario import Usuario
    from app.models.modulos_negocio.cotizacion import Cotizacion
    from app.models.historial.historial_responsable import HistorialResponsable
    from app.models.operaciones.cancelacion import Cancelacion
    from app.models.operaciones.endoso_banco import EndosoBanco
    from app.models.operaciones.cambio_intermediario import CambioIntermediario

class Poliza(Base):
    __tablename__ = "poliza"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    cliente_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("cliente.id", ondelete="RESTRICT"),
        nullable=False
    )

    asegurado_nombre: Mapped[Optional[str]] = mapped_column(
        String(150),
        nullable=True
    )

    ramo_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("ramo.id", ondelete="RESTRICT"), # Definir
        nullable=False
    )

    aseguradora_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("aseguradora.id", ondelete="RESTRICT"),
        nullable=False
    )

    producto_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("producto.id", ondelete="RESTRICT"),
        nullable=False
    )

    estado_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("estado_poliza.id", ondelete="RESTRICT"),
        nullable=False
    )

    responsable_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("usuario.id", ondelete="RESTRICT"),
        nullable=True
    )

    cotizacion_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("cotizacion.id", ondelete="RESTRICT"),
        unique=True, # Garantizar trazabilidad
        nullable=True
    )

    fecha_solicitud: Mapped[date] = mapped_column(
        Date,
        server_default=func.current_date(),
        nullable=False
    )

    fecha_expedicion: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True 
    )

    numero_poliza: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        unique=True
    )

    prima: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 2),
        nullable=True
    )

    observacion: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )

    version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("1")
    )

    __mapper_args__ = {
        "version_id_col": version,
        "version_id_generator": True
    }

    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False,
        server_default=func.now()
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False, 
        server_default=func.now(),
        onupdate=func.now()
    )

    # Validaciones (CheckConstraint)

    __table_args__ = (
        # Validacion de fecha_expedicion
        CheckConstraint(
            'fecha_expedicion >= fecha_solicitud',
            name='check_fecha_expedicion_valida'
        ),
        # Validar que prima sea null o valor positivo
        CheckConstraint(
            'prima > 0', name='check_prima_positiva'
        ),

        # Índices
        Index("idx_poliza_estado", "estado_id"),
        Index("idx_poliza_responsable", "responsable_id"),
        Index("idx_poliza_created_at", "created_at"),
        Index("idx_poliza_fecha_solicitud", "fecha_solicitud"),
        # Índice PARCIAL para alertas (pólizas pendientes de expedición)
        Index(
            "idx_poliza_fechas", 
            "fecha_solicitud", "fecha_expedicion",
            postgresql_where=text("fecha_expedicion IS NULL")
        ),
    )

    # Relaciones

    cliente: Mapped["Cliente"] = relationship(
        "Cliente",
        back_populates="polizas"
    )

    ramo: Mapped["Ramo"] = relationship(
        "Ramo",
        back_populates="polizas"
    )

    aseguradora: Mapped["Aseguradora"] = relationship(
        "Aseguradora",
        back_populates="polizas"
    )

    producto: Mapped["Producto"] = relationship(
        "Producto",
        back_populates="polizas"
    )

    estado: Mapped["EstadoPoliza"] = relationship(
        "EstadoPoliza",
        back_populates="polizas"
    )

    responsable: Mapped["Usuario"] = relationship(
        "Usuario",
        back_populates="polizas"
    )

    cotizacion: Mapped["Cotizacion"] = relationship(
        "Cotizacion",
        back_populates="poliza"
    )

    historial_responsables: Mapped[list["HistorialResponsable"]] = relationship(
        "HistorialResponsable",
        back_populates="poliza"
    )

    cancelacion: Mapped[Optional["Cancelacion"]] = relationship(
        "Cancelacion",
        back_populates="poliza",
        uselist=False
    )

    endosos_poliza: Mapped[list["EndosoBanco"]] = relationship(
        "EndosoBanco",
        back_populates="poliza",
        order_by="desc(EndosoBanco.created_at)"
    )

    cambio_intermediario: Mapped[list["CambioIntermediario"]] = relationship(
        "CambioIntermediario",
        back_populates="poliza"
    )