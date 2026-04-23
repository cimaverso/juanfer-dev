from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String, ForeignKey, Boolean, DateTime, text
from app.db.base import Base
from datetime import datetime, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.roles_permisos.rol import Rol
    from app.models.usuarios_clientes.cliente import Cliente
    from app.models.modulos_negocio.prospecto import Prospecto
    from app.models.modulos_negocio.nota_prospecto import NotaProspecto
    from app.models.modulos_negocio.cotizacion import Cotizacion
    from app.models.modulos_negocio.poliza import Poliza
    from app.models.historial_responsable import HistorialResponsable
    from app.models.historial_responsable_cliente import HistorialResponsableCliente
    from app.models.operaciones.cancelacion import Cancelacion
    from app.models.operaciones.endoso_banco import EndosoBanco
    from app.models.auditoria.auditoria import Auditoria

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

    prospectos: Mapped[list["Prospecto"]] = relationship(
        "Prospecto",
        back_populates="responsable"
    )

    notas_prospecto: Mapped[list["NotaProspecto"]] = relationship(
        "NotasProspecto",
        back_populates="usuario"
    )

    cotizaciones: Mapped[list["Cotizacion"]] = relationship(
        "Cotizacion",
        back_populates="responsable"
    )

    polizas: Mapped[list["Poliza"]] = relationship(
        "Poliza",
        back_populates="responsable"
    )

    # Relaciones con HistorialResponsable
    traspasos_entregados: Mapped[list["HistorialResponsable"]] = relationship(
        "HistorialResponsable",
        foreign_keys="[HistorialResponsable.usuario_anterior_id]",
        back_populates="usuario_anterior"
    )

    traspasos_recibidos: Mapped[list["HistorialResponsable"]] = relationship(
        "HistorialResponsable",
        foreign_keys="[HistorialResponsable.usuario_nuevo_id]",
        back_populates="usuario_nuevo"
    )

    traspasos_ejecutados: Mapped[list["HistorialResponsable"]] = relationship(
        "HistorialResponsable",
        foreign_keys="[HistorialResponsable.realizado_por_id]",
        back_populates="realizado_por"
    )

    # Relaciones con HistorialResponsableCliente
    traspasos_clientes_entregados: Mapped[list["HistorialResponsableCliente"]] = relationship(
        "HistorialResponsableCliente",
        foreign_keys="[HistorialResponsableCliente.usuario_anterior_id]",
        back_populates="usuario_anterior"
    )
        
    traspasos_clientes_recibidos: Mapped[list["HistorialResponsableCliente"]] = relationship(
        "HistorialResponsableCliente",
        foreign_keys="[HistorialResponsableCliente.usuario_nuevo_id]",
        back_populates="usuario_nuevo"
    )

    traspasos_clientes_ejecutados: Mapped[list["HistorialResponsableCliente"]] = relationship(
        "HistorialResponsableCliente",
        foreign_keys="[HistorialResponsableCliente.realizado_por_id]",
        back_populates="realizado_por"
    )

    cancelaciones: Mapped[list["Cancelacion"]] = relationship(
        "Cancelacion",
        back_populates="responsable"
    )

    endosos: Mapped[list["EndosoBanco"]] = relationship(
        "EndosoBanco",
        back_populates="responsable"
    )

    auditorias: Mapped[list["Auditoria"]] = relationship(
        "Auditoria",
        back_populates="usuario"
    )