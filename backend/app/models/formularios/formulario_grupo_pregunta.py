from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String, Integer, ForeignKey, Numeric, UniqueConstraint
from app.db.base import Base
from typing import TYPE_CHECKING, Optional
from decimal import Decimal

if TYPE_CHECKING:
    from app.models.formularios.formulario import Formulario
    from app.models.formularios.formulario_pregunta import FormularioPregunta


class FormularioGrupoPregunta(Base):
    """
    Define un bloque de preguntas repetible dentro de un formulario, ej.
    "Asegurado" (equivalente a "INFORMACIÓN BÁSICA DEL ASEGURADO #1..#4" en
    Microsoft Forms, pero definido UNA sola vez en vez de duplicado por
    cada número). El admin controla cuántas repeticiones se permiten desde
    la UI (max_repeticiones) sin tocar el esquema.

    Cada repetición que llena el cliente se guarda como un elemento de un
    array dentro del JSONB de FormularioRespuesta.respuestas, bajo la clave
    `codigo` de este grupo.
    """
    __tablename__ = "formulario_grupo_pregunta"
    __table_args__ = (
        UniqueConstraint("formulario_id", "codigo", name="uq_grupo_pregunta_codigo"),
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

    # Clave estable dentro del formulario, ej "asegurado". Se usa como
    # nombre de la clave del array en el JSONB de respuestas y no debería
    # cambiar aunque se edite el título visible.
    codigo: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    # Plantilla de título mostrada por repetición, ej
    # "INFORMACIÓN BÁSICA DEL ASEGURADO #{n}"
    titulo_template: Mapped[str] = mapped_column(
        String(200),
        nullable=False
    )

    minimo_repeticiones: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default="0"
    )

    # null = sin límite de repeticiones
    maximo_repeticiones: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )

    # A qué tabla/entidad de negocio se mapea cada repetición, si aplica
    # (ej. "asegurado_poliza"). Lo interpreta la capa de servicio al
    # sincronizar una respuesta completada.
    entidad_destino: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )

    # Numeric en vez de Integer para poder reordenar por drag&drop desde la
    # UI insertando valores intermedios, sin tener que renumerar todo.
    orden: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        nullable=False
    )

    # Relaciones

    formulario: Mapped["Formulario"] = relationship(
        "Formulario",
        back_populates="grupos_pregunta"
    )

    preguntas: Mapped[list["FormularioPregunta"]] = relationship(
        "FormularioPregunta",
        back_populates="grupo",
        cascade="all, delete-orphan"
    )