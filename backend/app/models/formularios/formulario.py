from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String, DateTime, ForeignKey, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from app.db.base import Base
from datetime import datetime
from typing import TYPE_CHECKING, Optional
import uuid

if TYPE_CHECKING:
    from app.models.formularios.formulario_version import FormularioVersion
    from app.models.formularios.formulario_grupo_pregunta import FormularioGrupoPregunta
    from app.models.formularios.formulario_pregunta import FormularioPregunta
    from app.models.formularios.formulario_respuesta import FormularioRespuesta
    from app.models.catalogos.catalogo_valor import CatalogoValor


class Formulario(Base):
    __tablename__ = "formulario"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    titulo: Mapped[str] = mapped_column(
        String(200),
        nullable=False
    )

    descripcion: Mapped[Optional[str]] = mapped_column(
        String(1000),
        nullable=True
    )

    # FK a catalogo_valor (catalogo_tipo.codigo = 'formulario_estado', ej.
    # 'borrador'/'activo'/'archivado'). El admin puede agregar estados
    # nuevos desde la UI sin deploy; el servicio que crea el Formulario
    # asigna el id correspondiente a 'borrador' por defecto.
    estado_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("catalogo_valor.id", ondelete="RESTRICT"),
        nullable=False
    )

    # FK a catalogo_valor (catalogo_tipo.codigo = 'formulario_categoria', ej.
    # 'cotizacion'/'expedicion'). Clasificación de negocio, independiente del
    # estado de publicación de arriba. Sin default: el admin debe elegirla
    # explícitamente al crear el formulario.
    categoria_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("catalogo_valor.id", ondelete="RESTRICT"),
        nullable=False
    )

    # FK a la FormularioVersion publicada actualmente (snapshot que se sirve
    # en la URL pública). Si es null, el formulario aún no tiene ninguna
    # versión publicada (solo borrador).
    version_activa_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("formulario_version.id", ondelete="SET NULL"),
        nullable=True
    )

    # Identificador no adivinable para la URL pública del formulario
    # (ej. /f/<token_publico>), independiente del id autoincremental.
    token_publico: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        unique=True,
        nullable=False,
        server_default=text("gen_random_uuid()")
    )

    # Tema, colores, mensaje final, settings generales del form (equivalente a
    # "settings"/"themeV2" en el export de Microsoft Forms).
    configuracion: Mapped[Optional[dict]] = mapped_column(
        JSONB,
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

    estado: Mapped["CatalogoValor"] = relationship(
        "CatalogoValor",
        foreign_keys=[estado_id]
    )

    categoria: Mapped["CatalogoValor"] = relationship(
        "CatalogoValor",
        foreign_keys=[categoria_id]
    )

    versiones: Mapped[list["FormularioVersion"]] = relationship(
        "FormularioVersion",
        back_populates="formulario",
        cascade="all, delete-orphan",
        foreign_keys="FormularioVersion.formulario_id"
    )

    # post_update=True rompe el ciclo de FKs con FormularioVersion.formulario_id
    # (Formulario -> version_activa_id -> formulario_version, y
    # formulario_version.formulario_id -> formulario): sin esto, borrar un
    # Formulario con version_activa_id seteado falla con "Circular dependency
    # detected", porque SQLAlchemy no sabe en qué orden emitir los DELETE.
    version_activa: Mapped[Optional["FormularioVersion"]] = relationship(
        "FormularioVersion",
        foreign_keys=[version_activa_id],
        uselist=False,
        post_update=True
    )

    grupos_pregunta: Mapped[list["FormularioGrupoPregunta"]] = relationship(
        "FormularioGrupoPregunta",
        back_populates="formulario",
        cascade="all, delete-orphan"
    )

    preguntas: Mapped[list["FormularioPregunta"]] = relationship(
        "FormularioPregunta",
        back_populates="formulario",
        cascade="all, delete-orphan"
    )

    respuestas: Mapped[list["FormularioRespuesta"]] = relationship(
        "FormularioRespuesta",
        back_populates="formulario"
    )