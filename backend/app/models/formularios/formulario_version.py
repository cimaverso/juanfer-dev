from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, ForeignKey, DateTime, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base import Base
from datetime import datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.formularios.formulario import Formulario
    from app.models.formularios.formulario_respuesta import FormularioRespuesta


class FormularioVersion(Base):
    """
    Snapshot inmutable de la estructura completa del formulario (preguntas,
    grupos, orden y configuración) en el momento en que se publica.

    Se genera cada vez que el admin publica cambios desde el builder. Las
    respuestas ya guardadas quedan ancladas a la versión con la que el
    cliente efectivamente interactuó (form_version_id en FormularioRespuesta),
    así que editar o eliminar preguntas después nunca rompe respuestas
    históricas.
    """
    __tablename__ = "formulario_version"
    __table_args__ = (
        UniqueConstraint("formulario_id", "numero_version", name="uq_formulario_version"),
    )

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    formulario_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("formulario.id", ondelete="CASCADE"),
        nullable=False
    )

    numero_version: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False
    )

    # Copia congelada de preguntas + grupos + configuración, tal como
    # estaban al publicar. Se usa para renderizar el form al cliente y para
    # interpretar respuestas antiguas sin depender del estado actual de las
    # tablas normalizadas.
    estructura: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False
    )

    publicado_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    # Relaciones

    formulario: Mapped["Formulario"] = relationship(
        "Formulario",
        back_populates="versiones",
        foreign_keys=[formulario_id]
    )

    respuestas: Mapped[list["FormularioRespuesta"]] = relationship(
        "FormularioRespuesta",
        back_populates="formulario_version"
    )