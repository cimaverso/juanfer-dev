from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String, Integer, Boolean, ForeignKey, DateTime, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base import Base
from datetime import datetime
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.models.catalogos.catalogo_tipo import CatalogoTipo


class CatalogoValor(Base):
    """
    Un valor concreto dentro de un CatalogoTipo, ej. ('formulario_estado',
    'activo'). Esta es la tabla que el admin gestiona (crear, editar,
    reordenar, activar/desactivar) desde la UI sin necesitar un deploy.

    Es intencionalmente genérica (no tiene relación inversa de vuelta hacia
    Formulario/FormularioPregunta/etc.) para poder ser referenciada desde
    cualquier tabla del sistema que necesite un campo tipo "estado" o
    "tipo" administrable, no solo el módulo de formularios.
    """
    __tablename__ = "catalogo_valor"
    __table_args__ = (
        UniqueConstraint("catalogo_tipo_id", "codigo", name="uq_catalogo_valor_codigo"),
    )

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    catalogo_tipo_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("catalogo_tipo.id", ondelete="RESTRICT"),
        nullable=False
    )

    # Clave estable dentro de su catalogo_tipo, ej "activo", "texto",
    # "en_progreso". El código de negocio que necesite ramificar lógica
    # (no solo mostrar una etiqueta) compara contra este valor, por eso no
    # se debe editar libremente desde la UI una vez está en uso; lo que el
    # admin edita sin restricción es `nombre`/`descripcion`/`orden`/`activo`,
    # y puede AGREGAR códigos nuevos sin deploy.
    codigo: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    # Etiqueta mostrada en la UI; 100% editable por el admin
    nombre: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    descripcion: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )

    orden: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default="0"
    )

    activo: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="true"
    )

    # Color, ícono, comportamiento extra por valor (ej. si un estado
    # 'archivado' debe ocultar el formulario del listado público), sin
    # necesitar columnas nuevas por cada bandera que se les ocurra.
    metadatos: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    # Relaciones

    catalogo_tipo: Mapped["CatalogoTipo"] = relationship(
        "CatalogoTipo",
        back_populates="valores"
    )