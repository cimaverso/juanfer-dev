from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String, DateTime, ForeignKey, func, Index
from app.db.base import Base
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.models.catalogos.tipo_documento import TipoDocumento
    from app.models.usuarios_clientes.usuario import Usuario
    from app.models.modulos_negocio.prospecto import Prospecto
    from app.models.modulos_negocio.cotizacion import Cotizacion
    from app.models.modulos_negocio.poliza import Poliza
    from app.models.historial.historial_responsable_cliente import HistorialResponsableCliente
    from app.models.operaciones.endoso_banco import EndosoBanco
    from app.models.operaciones.cambio_intermediario import CambioIntermediario

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

    responsable_id: Mapped[Optional[int | None]] = mapped_column(
        BigInteger,
        ForeignKey("usuario.id", ondelete="SET NULL"),
        nullable=True
    )

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

    # Índices

    __table_args__ = (
        Index("idx_cliente_documento", "numero_documento"),
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

    cotizaciones: Mapped[list["Cotizacion"]] = relationship(
        "Cotizacion",
        back_populates="cliente"
    )

    polizas: Mapped[list["Poliza"]] = relationship(
        "Poliza",
        back_populates="cliente"
    )

    historial_responsables: Mapped[list["HistorialResponsableCliente"]] = relationship(
        "HistorialResponsableCliente",
        back_populates="cliente"
    )

    endosos_tomados: Mapped[list["EndosoBanco"]] = relationship(
        "EndosoBanco",
        back_populates="tomador"
    )

    cambio_intermediario_cliente: Mapped[list["CambioIntermediario"]] = relationship(
        "CambioIntermediario",
        back_populates="cliente"
    )