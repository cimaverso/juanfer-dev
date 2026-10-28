"""V4 agregar categoria a formulario

Revision ID: 751a7703f081
Revises: 98500168c7d6
Create Date: 2026-10-28 12:39:58.683431

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '751a7703f081'
down_revision: Union[str, Sequence[str], None] = '98500168c7d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CATEGORIA_TIPO_CODIGO = "formulario_categoria"
COTIZACION = "cotizacion"
EXPEDICION = "expedicion"


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()

    # 1) catalogo_tipo + sus 2 valores (mismo patrón que formulario_estado).
    bind.execute(
        sa.text("""
            INSERT INTO catalogo_tipo (codigo, nombre, descripcion)
            VALUES (:codigo, :nombre, :descripcion)
            ON CONFLICT (codigo) DO NOTHING;
        """),
        {
            "codigo": CATEGORIA_TIPO_CODIGO,
            "nombre": "Categoría de formulario",
            "descripcion": "Clasificación de negocio del formulario (cotización/expedición)",
        },
    )

    tipo_id = bind.execute(
        sa.text("SELECT id FROM catalogo_tipo WHERE codigo = :codigo"),
        {"codigo": CATEGORIA_TIPO_CODIGO},
    ).scalar()

    bind.execute(
        sa.text("""
            INSERT INTO catalogo_valor (catalogo_tipo_id, codigo, nombre, orden)
            VALUES (:tipo_id, :codigo, :nombre, :orden)
            ON CONFLICT (catalogo_tipo_id, codigo) DO NOTHING;
        """),
        [
            {"tipo_id": tipo_id, "codigo": COTIZACION, "nombre": "Cotización", "orden": 1},
            {"tipo_id": tipo_id, "codigo": EXPEDICION, "nombre": "Expedición", "orden": 2},
        ],
    )

    cotizacion_id = bind.execute(
        sa.text(
            "SELECT id FROM catalogo_valor WHERE catalogo_tipo_id = :tipo_id AND codigo = :codigo"
        ),
        {"tipo_id": tipo_id, "codigo": COTIZACION},
    ).scalar()

    # 2) Columna nullable primero, backfill a 'cotizacion' en lo existente,
    #    luego se cierra con NOT NULL + FK.
    op.add_column("formulario", sa.Column("categoria_id", sa.BigInteger(), nullable=True))

    bind.execute(
        sa.text("UPDATE formulario SET categoria_id = :cotizacion_id WHERE categoria_id IS NULL"),
        {"cotizacion_id": cotizacion_id},
    )

    op.alter_column("formulario", "categoria_id", nullable=False)
    op.create_foreign_key(
        "fk_formulario_categoria", "formulario", "catalogo_valor",
        ["categoria_id"], ["id"], ondelete="RESTRICT"
    )


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()

    op.drop_constraint("fk_formulario_categoria", "formulario", type_="foreignkey")
    op.drop_column("formulario", "categoria_id")

    tipo_id = bind.execute(
        sa.text("SELECT id FROM catalogo_tipo WHERE codigo = :codigo"),
        {"codigo": CATEGORIA_TIPO_CODIGO},
    ).scalar()
    if tipo_id is not None:
        bind.execute(
            sa.text("DELETE FROM catalogo_valor WHERE catalogo_tipo_id = :tipo_id"),
            {"tipo_id": tipo_id},
        )
        bind.execute(
            sa.text("DELETE FROM catalogo_tipo WHERE id = :tipo_id"),
            {"tipo_id": tipo_id},
        )
