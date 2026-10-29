"""renombrar cliente ciudad a ubicacion y ampliar titulo pregunta

Revision ID: 834cf4d93a7d
Revises: 45ae545b4c4f
Create Date: 2026-10-29 11:55:14.551578

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '834cf4d93a7d'
down_revision: Union[str, Sequence[str], None] = '45ae545b4c4f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Rename real (no add+drop) para no perder los datos que ya existan
    # en cliente.ciudad -- autogenerate lo detecta como columna nueva +
    # columna eliminada porque no sabe que es el mismo dato.
    op.alter_column('cliente', 'ciudad', new_column_name='ubicacion')
    # Text, no String(500): hay preguntas reales (cláusulas de habeas
    # data del importador de MS Forms) de hasta ~1800 caracteres, ver
    # docs/ESTADO.md.
    op.alter_column('formulario_pregunta', 'titulo',
               existing_type=sa.VARCHAR(length=500),
               type_=sa.Text(),
               existing_nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    # No se vuelve a VARCHAR(500): si ya se importaron formularios reales
    # con cláusulas largas, el downgrade truncaría datos existentes en
    # vez de fallar en silencio. Si hace falta volver a VARCHAR, hacerlo
    # a mano después de revisar los datos.
    op.alter_column('formulario_pregunta', 'titulo',
               existing_type=sa.Text(),
               type_=sa.Text(),
               existing_nullable=False)
    op.alter_column('cliente', 'ubicacion', new_column_name='ciudad')
