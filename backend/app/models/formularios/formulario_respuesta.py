from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base import Base
from datetime import datetime
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.models.formularios.formulario import Formulario
    from app.models.formularios.formulario_version import FormularioVersion
    from app.models.usuarios_clientes.cliente import Cliente
    from app.models.modulos_negocio.poliza import Poliza
    from app.models.modulos_negocio.cotizacion import Cotizacion
    from app.models.modulos_negocio.prospecto import Prospecto
    from app.models.catalogos.catalogo_valor import CatalogoValor


class FormularioRespuesta(Base):
    """
    Una fila por cada cliente que llena un formulario. Todo lo capturado
    vive en `respuestas` (JSONB), incluyendo arrays para los grupos
    repetibles (ej. "asegurados": [ {...}, {...} ]), sin fragmentar en
    filas por pregunta (se evita EAV puro).

    Solo los campos que la pregunta marcó con `mapea_a` se sincronizan
    además hacia `cliente` / `poliza` / `cotizacion`; el resto se persiste
    únicamente aquí.
    """
    __tablename__ = "formulario_respuesta"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    formulario_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("formulario.id", ondelete="RESTRICT"),
        nullable=False
    )

    # Snapshot exacto de la estructura que vio el cliente al responder.
    # Puede ser null si la respuesta se creó antes de existir versionado
    # o si el formulario nunca fue publicado formalmente.
    formulario_version_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("formulario_version.id", ondelete="RESTRICT"),
        nullable=True
    )

    cliente_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("cliente.id", ondelete="SET NULL"),
        nullable=True
    )

    # Hoy sin uso: el flujo público siempre resuelve a Cliente (ver regla de
    # negocio en docs/modulos/formularios.md), nunca deja la respuesta
    # asociada solo a un Prospecto. Columna lista por si se requiere a
    # futuro; sin disparador concreto todavía (ver DEUDA).
    prospecto_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("prospecto.id", ondelete="SET NULL"),
        nullable=True
    )

    poliza_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("poliza.id", ondelete="SET NULL"),
        nullable=True
    )

    cotizacion_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("cotizacion.id", ondelete="SET NULL"),
        nullable=True
    )

    # TODO lo capturado por el cliente, sin fragmentar. Ejemplo:
    # {
    #   "tomador": {"tipo_documento": "CC", "numero_documento": "123", ...},
    #   "asegurado_principal_es_tomador": "NO",
    #   "asegurados": [
    #       {"tipo_documento": "CC", "nombres": "Ana Perez", "parentesco": "Hija"}
    #   ],
    #   "nps_recomendacion": 9
    # }
    respuestas: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        server_default="{}"
    )

    # FK a catalogo_valor (catalogo_tipo.codigo = 'formulario_respuesta_estado',
    # ej. 'en_progreso'/'completada'). El servicio que crea la respuesta
    # asigna el id de 'en_progreso' por defecto.
    estado_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("catalogo_valor.id", ondelete="RESTRICT"),
        nullable=False
    )

    # ip, user agent, utm, etc. - trazabilidad de origen de la respuesta
    metadatos: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True
    )

    iniciado_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    completado_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True
    )

    # Relaciones

    formulario: Mapped["Formulario"] = relationship(
        "Formulario",
        back_populates="respuestas"
    )

    formulario_version: Mapped[Optional["FormularioVersion"]] = relationship(
        "FormularioVersion",
        back_populates="respuestas"
    )

    cliente: Mapped[Optional["Cliente"]] = relationship(
        "Cliente",
        back_populates="formulario_respuestas"
    )

    prospecto: Mapped[Optional["Prospecto"]] = relationship(
        "Prospecto",
        back_populates="formulario_respuestas"
    )

    poliza: Mapped[Optional["Poliza"]] = relationship(
        "Poliza",
        back_populates="formulario_respuestas"
    )

    cotizacion: Mapped[Optional["Cotizacion"]] = relationship(
        "Cotizacion",
        back_populates="formulario_respuestas"
    )

    estado: Mapped["CatalogoValor"] = relationship(
        "CatalogoValor",
        foreign_keys=[estado_id]
    )