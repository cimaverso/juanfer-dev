"""
Corre el seed inicial (scripts/seed_data.py) solo si la base está vacía
-- pensado para el primer arranque del contenedor en un despliegue nuevo.
Se ata al estado real de la DB (tabla "rol" sin filas), no a "primera vez
que arranca el contenedor": así sigue siendo seguro aunque el contenedor
se reinicie o redeploye muchas veces después del primer arranque real.
"""
from sqlalchemy import text
from app.core.db import SessionLocal
from scripts.seed_data import seed


def main():
    db = SessionLocal()
    try:
        hay_datos = db.execute(text("SELECT 1 FROM rol LIMIT 1")).first() is not None
    finally:
        db.close()

    if hay_datos:
        print("Datos base ya existen -- seed omitido (no es el primer arranque).")
        return

    print("Base vacía -- corriendo seed inicial...")
    seed()


if __name__ == "__main__":
    main()
