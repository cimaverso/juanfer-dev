from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, Date, Text, DateTime, func, ForeignKey, String
from app.db.base import Base
from datetime import datetime, date
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.models.modulos_negocio.poliza import Poliza
    from app.models.catalogos.banco import Banco
    from app.models.usuarios_clientes.usuario import Usuario
    from app.models.usuarios_clientes.cliente import Cliente
    from app.models.catalogos.estado_tramite_banco import EstadoTramiteBanco

class EndosoBanco(Base):
    __tablename__ = "endoso_banco"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )
    #Preguntar sobre la relación
    poliza_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("poliza.id", ondelete="RESTRICT"),
        nullable=False
    )

    banco_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("banco.id", ondelete="RESTRICT"),
        nullable=False
    )

    responsable_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("usuario.id", ondelete="RESTRICT"),
        nullable=False
    )

    tomador_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("cliente.id", ondelete="RESTRICT"),
        nullable=False
    )

    estado_tramite_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("estado_tramite_banco.id", ondelete="RESTRICT"),
        nullable=False
    )

    contacto_alternativo: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True
    )

    observacion: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )

    fecha_inicio: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True
    ) 

    fecha_fin: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False,
        server_default=func.now()
    )

    # Relaciones

    poliza: Mapped["Poliza"] = relationship(
        "Poliza",
        back_populates="endosos_poliza"
    )

    banco: Mapped["Banco"] = relationship(
        "Banco",
        back_populates="endosos_banco"
    )

    responsable: Mapped["Usuario"] = relationship(
        "Usuario",
        back_populates="endosos"
    )

    tomador: Mapped["Cliente"] = relationship(
        "Cliente",
        back_populates="endosos_tomados"
    )

    estado_tramite: Mapped["EstadoTramiteBanco"] = relationship(
        "EstadoTramiteBanco",
        back_populates="estado_endosos"
    )