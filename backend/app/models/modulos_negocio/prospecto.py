from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, DateTime, ForeignKey, Date, func, SmallInteger, CheckConstraint, Text, String, text
from app.db.base import Base
from datetime import datetime, date
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.models.usuarios_clientes.cliente import Cliente
    from app.models.catalogos.producto import Producto
    from app.models.catalogos.estado_prospecto import EstadoProspecto
    from app.models.usuarios_clientes.usuario import Usuario
    from app.models.modulos_negocio.nota_prospecto import NotaProspecto
    from app.models.modulos_negocio.cotizacion import Cotizacion
    from app.models.modulos_negocio.tarea import Tarea
    from app.models.operaciones.conversacion import Conversacion
    from app.models.catalogos.aseguradora import Aseguradora
    from app.models.catalogos.ramo import Ramo
    from app.models.modulos_negocio.poliza import Poliza

class Prospecto(Base):
    __tablename__ = "prospecto"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    canal_origen: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="manual"
    )

    cliente_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("cliente.id", ondelete="CASCADE"),
        nullable=False
    )

    aseguradora_interes_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("aseguradora.id", ondelete="SET NULL"),
        nullable=True
    )
    
    ramo_interes_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("ramo.id", ondelete="SET NULL"),
        nullable=True
    )

    producto_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("producto.id", ondelete="RESTRICT"),
        nullable=True
    )

    estado_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("estado_prospecto.id", ondelete="RESTRICT"), 
        nullable=False
    )

    poliza_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("poliza.id", ondelete="SET NULL"),
        nullable=True
    )

    responsable_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("usuario.id", ondelete="SET NULL"),
        nullable=True
    )
    
    fecha_primer_contacto: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True
    )

    fecha_ultimo_contacto: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True
    ) 
    
    proximo_contacto: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True
    ) 

    intentos_contacto: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False,
        server_default=text("0")
    )

    observaciones: Mapped[Optional[str]] = mapped_column(
        Text,
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

    notas: Mapped[list["NotaProspecto"]] = relationship(
        "NotaProspecto",
        back_populates="prospecto"
    )

    cotizaciones: Mapped[list["Cotizacion"]] = relationship(
        "Cotizacion",
        back_populates="prospecto"
    )

    tareas: Mapped[list["Tarea"]] = relationship(
        "Tarea",
        back_populates="prospecto"
    )

    conversaciones: Mapped[list["Conversacion"]] = relationship(
        "Conversacion",
        back_populates="prospecto"
    )

    aseguradora_interes: Mapped["Aseguradora"] = relationship(
        "Aseguradora",
        back_populates="prospectos"
    )

    ramo_interes: Mapped["Ramo"] = relationship(
        "Ramo",
        back_populates="prospectos"
    )

    poliza: Mapped[Optional["Poliza"]] = relationship(
        "Poliza",
        back_populates="prospecto"
    )

    # Validaciones

    __table_args__ = (
        CheckConstraint(
            "intentos_contacto >= 0 AND intentos_contacto <= 7",
            name="ck_intentos_contacto"
        ),
        CheckConstraint(
            "canal_origen IN ('manual', 'whatsapp', 'formulario', 'csv')",
            name="ck_canal_origen"
        ),
    )

    # Properties

    @property
    def nombre(self) -> str:
        return self.cliente.nombre_completo

    @property
    def tipo_documento_id(self) -> int:
        return self.cliente.tipo_documento_id
    
    @property
    def numero_documento(self) -> str:
        return self.cliente.numero_documento
    
    @property
    def telefono(self) -> str:
        return self.cliente.celular
    
    @property
    def correo(self) -> str:
        return self.cliente.correo
    
    @property
    def ocupacion(self) -> str:
        return self.cliente.ocupacion
    
    @property
    def ciudad(self) -> str:
        return self.cliente.ciudad

    @property
    def estado_nombre(self) -> str:
        return self.estado.nombre

    @property
    def estado_color(self) -> str:
        return self.estado.color
    
    @property
    def responsable_nombre(self) -> str:
        return self.responsable.nombre

    @property
    def aseguradora_nombre(self):
        return (
            self.aseguradora_interes.nombre
            if self.aseguradora_interes
            else None
        )
    
    @property
    def ramo_nombre(self):
        return (
            self.ramo_interes.nombre
            if self.ramo_interes
            else None
        )