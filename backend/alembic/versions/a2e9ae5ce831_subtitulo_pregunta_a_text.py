"""subtitulo pregunta a text

Revision ID: a2e9ae5ce831
Revises: 834cf4d93a7d
Create Date: 2026-10-29 12:46:07.836462

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a2e9ae5ce831'
down_revision: Union[str, Sequence[str], None] = '834cf4d93a7d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('formulario_pregunta', 'subtitulo',
               existing_type=sa.VARCHAR(length=1000),
               type_=sa.Text(),
               existing_nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    # No se vuelve a VARCHAR(1000): mismo motivo que la migración de
    # titulo (834cf4d93a7d) -- truncaría datos reales ya importados en
    # vez de fallar en silencio.
    op.alter_column('formulario_pregunta', 'subtitulo',
               existing_type=sa.Text(),
               type_=sa.Text(),
               existing_nullable=True)
