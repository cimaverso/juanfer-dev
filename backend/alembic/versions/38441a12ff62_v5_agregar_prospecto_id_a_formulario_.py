"""V5 agregar prospecto_id a formulario_respuesta

Revision ID: 38441a12ff62
Revises: 751a7703f081
Create Date: 2026-10-28 12:54:43.513131

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '38441a12ff62'
down_revision: Union[str, Sequence[str], None] = '751a7703f081'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("formulario_respuesta", sa.Column("prospecto_id", sa.BigInteger(), nullable=True))
    op.create_foreign_key(
        "fk_formulario_respuesta_prospecto", "formulario_respuesta", "prospecto",
        ["prospecto_id"], ["id"], ondelete="SET NULL"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("fk_formulario_respuesta_prospecto", "formulario_respuesta", type_="foreignkey")
    op.drop_column("formulario_respuesta", "prospecto_id")
