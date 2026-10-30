"""permiso unique modulo accion

Revision ID: 25bebc173ff7
Revises: 924f6a4adb55
Create Date: 2026-10-29 21:38:23.719582

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '25bebc173ff7'
down_revision: Union[str, Sequence[str], None] = '924f6a4adb55'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    `permiso` nunca tuvo UNIQUE en (modulo, accion): el seed_data.py usaba
    `ON CONFLICT DO NOTHING` sin columnas, que no tiene contra qué chocar
    sin esa constraint -- cada corrida del seed insertaba los permisos de
    nuevo (ver docs/DEUDA.md). Antes de agregar la constraint, dedupe:
    para cada (modulo, accion) deja solo la fila de menor id; las
    `rol_permiso` que apuntaban a las filas borradas se eliminan en
    cascada (ON DELETE CASCADE ya existente), sin perder la relación
    rol-permiso real (el id que queda ya tiene su propia fila en
    rol_permiso).
    """
    op.execute("""
        DELETE FROM permiso p
        WHERE p.id NOT IN (
            SELECT MIN(id) FROM permiso GROUP BY modulo, accion
        );
    """)
    op.create_unique_constraint("uq_permiso_modulo_accion", "permiso", ["modulo", "accion"])


def downgrade() -> None:
    op.drop_constraint("uq_permiso_modulo_accion", "permiso", type_="unique")
