from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String, Boolean, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base import Base
from typing import TYPE_CHECKING, Optional
from decimal import Decimal

if TYPE_CHECKING:
    from app.models.formularios.formulario import Formulario
    from app.models.formularios.formulario_grupo_pregunta import FormularioGrupoPregunta
    from app.models.catalogos.catalogo_valor import CatalogoValor


class FormularioPregunta(Base):
    """
    Una fila por cada pregunta O sección del formulario (las secciones usan
    tipo='seccion' y también pueden ser destino de un salto de branching,
    tal como "¡Gracias por completar la información!" en el form original).

    `codigo` es la clave estable usada tanto para el mapeo a negocio
    (`mapea_a`) como para los targets de salto dentro de `configuracion`,
    de forma que reordenar o renombrar el título de una pregunta desde la
    UI nunca rompe el branching ni la sincronización.
    """
    __tablename__ = "formulario_pregunta"
    __table_args__ = (
        UniqueConstraint("formulario_id", "codigo", name="uq_pregunta_codigo"),
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

    # null si la pregunta no pertenece a un bloque repetible (ej. las
    # preguntas del Tomador, que se llenan una sola vez)
    grupo_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("formulario_grupo_pregunta.id", ondelete="CASCADE"),
        nullable=True
    )

    # Clave estable dentro del formulario, ej "tomador.numero_documento" o,
    # dentro de un grupo, "asegurado.tipo_documento"
    codigo: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    # FK a catalogo_valor (catalogo_tipo.codigo = 'formulario_pregunta_tipo',
    # ej. 'texto'/'numero'/'email'/'opcion'/'seccion'/'nps'). Agregar un
    # tipo de pregunta nuevo (ej. 'archivo') es solo un insert del admin,
    # aunque el renderer del frontend y el motor de validación deben saber
    # interpretarlo igual — ver nota de trade-off al final del archivo.
    tipo_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("catalogo_valor.id", ondelete="RESTRICT"),
        nullable=False
    )

    titulo: Mapped[str] = mapped_column(
        String(500),
        nullable=False
    )

    subtitulo: Mapped[Optional[str]] = mapped_column(
        String(1000),
        nullable=True
    )

    requerida: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false"
    )

    # Numeric para permitir reordenar por drag&drop insertando valores
    # intermedios sin renumerar el resto de preguntas.
    orden: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        nullable=False
    )

    # choices, validaciones (regex/tipo numérico/email), branching
    # (saltos condicionales por valor de respuesta), labels de NPS, etc.
    # Para tipo='opcion': "multiple" (bool, default false = selección única)
    # y "allow_other" (bool) para la opción "Otro" con texto libre.
    # goto_codigo admite BranchingCodigos.FIN ("__fin__") para saltar al
    # final del formulario sin apuntar a una pregunta real.
    # Ejemplo:
    # {
    #   "choices": [{"value": "SI", "label": "Sí"}, {"value": "NO", "label": "No"}],
    #   "multiple": false,
    #   "allow_other": false,
    #   "branching": [
    #       {"if_value": "SI", "goto_codigo": "asegurado.tipo_documento"},
    #       {"if_value": "NO", "goto_codigo": "__fin__"}
    #   ],
    #   "validacion": {"es_numero": true}
    # }
    configuracion: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True
    )

    # A qué tabla/campo de negocio sincroniza esta pregunta al completarse
    # la respuesta, ej {"entidad": "cliente", "campo": "correo"}. Si es
    # null, la respuesta se persiste únicamente dentro del JSONB de
    # FormularioRespuesta.respuestas y no se copia a ninguna tabla.
    mapea_a: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True
    )

    # Relaciones

    formulario: Mapped["Formulario"] = relationship(
        "Formulario",
        back_populates="preguntas"
    )

    grupo: Mapped[Optional["FormularioGrupoPregunta"]] = relationship(
        "FormularioGrupoPregunta",
        back_populates="preguntas"
    )

    tipo: Mapped["CatalogoValor"] = relationship(
        "CatalogoValor",
        foreign_keys=[tipo_id]
    )