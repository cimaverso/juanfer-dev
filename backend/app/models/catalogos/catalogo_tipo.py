from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String, DateTime, func
from app.db.base import Base
from datetime import datetime
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.models.catalogos.catalogo_valor import CatalogoValor


class CatalogoTipo(Base):
    """
    Representa una "familia" de catálogo, ej. 'formulario_estado',
    'formulario_pregunta_tipo', 'formulario_respuesta_estado'.

    Reemplaza a los enums de Python: en vez de que un valor nuevo requiera
    re-deploy (y en Postgres, un ALTER TYPE ... ADD VALUE para enums
    nativos), el admin crea/edita/desactiva valores desde la UI sobre
    CatalogoValor. Este mismo par de tablas se reutiliza para cualquier
    otro catálogo del sistema (no solo formularios), evitando crear una
    tabla nueva cada vez que se necesite una lista de valores editable.
    """
    __tablename__ = "catalogo_tipo"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    # Clave estable usada por el código de negocio para consultar este
    # catálogo, ej "formulario_estado". No se expone como editable en la UI
    # una vez creado (a diferencia de los codigo de CatalogoValor).
    codigo: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True
    )

    nombre: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    descripcion: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    # Relaciones

    valores: Mapped[list["CatalogoValor"]] = relationship(
        "CatalogoValor",
        back_populates="catalogo_tipo",
        cascade="all, delete-orphan",
        order_by="CatalogoValor.orden"
    )