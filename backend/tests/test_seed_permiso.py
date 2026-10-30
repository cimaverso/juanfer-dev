"""
Regresión de la migración 25bebc173ff7: `permiso` ya tiene UNIQUE en
(modulo, accion). Antes de esta migración no existía ningún constraint
ahí, así que el seed (con `ON CONFLICT DO NOTHING` sin columnas, que no
tenía nada contra qué chocar) insertaba los mismos permisos otra vez en
cada corrida -- ver docs/DEUDA.md.
"""
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text
import pytest


def test_permiso_modulo_accion_es_unico(db_session):
    existente = db_session.execute(
        text("SELECT modulo, accion FROM permiso LIMIT 1")
    ).first()
    assert existente is not None, "el seed debería haber dejado al menos un permiso"

    with pytest.raises(IntegrityError):
        db_session.execute(
            text("INSERT INTO permiso (modulo, accion) VALUES (:m, :a)"),
            {"m": existente.modulo, "a": existente.accion},
        )
        db_session.flush()
