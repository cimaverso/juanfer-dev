from sqlalchemy import text
from app.core.db import SessionLocal
from app.core.security import get_password_hash


def seed():
    print("🌱 Iniciando seed...")

    db = SessionLocal()
    try:
        # ─────────────────────────────
        # TRANSACCIÓN MANUAL
        # ─────────────────────────────
        with db.begin():

            # ─────────────────────────────
            # TIPOS DOCUMENTO
            # ─────────────────────────────
            db.execute(text("""
                INSERT INTO tipo_documento (nombre)
                VALUES ('CC'), ('CE'), ('NIT'), ('TI')
                ON CONFLICT (nombre) DO NOTHING;
            """))

            # ─────────────────────────────
            # ESTADOS PÓLIZA
            # ─────────────────────────────
            db.execute(text("""
                INSERT INTO estado_poliza (nombre, color)
                VALUES
                ('Expedido', 'expedido'),
                ('En proceso de firma', 'proceso'),
                ('Evaluación médica', 'evaluacion'),
                ('Declinado', 'declinado'),
                ('Pospuesto', 'pospuesto'),
                ('Cancelado', 'cancelado'),
                ('Pendiente de complemento', 'pendiente')
                ON CONFLICT (nombre) DO NOTHING;
            """))

            # ─────────────────────────────
            # CATÁLOGOS
            # ─────────────────────────────
            db.execute(text("""
                INSERT INTO estado_cotizacion (nombre)
                VALUES ('Enviada'), ('Sin respuesta'), ('Aceptada'), ('Rechazada'), ('Promovida')
                ON CONFLICT (nombre) DO NOTHING;
            """))

            db.execute(text("""
                INSERT INTO estado_prospecto (nombre)
                VALUES ('Primer contacto'), ('Cotización enviada'), ('Negociación'), ('Ganado'), ('Perdido')
                ON CONFLICT (nombre) DO NOTHING;
            """))

            db.execute(text("""
                INSERT INTO aseguradora (nombre)
                VALUES ('Sura'), ('Bolívar'), ('TravelKit'), ('Aria'), ('Allianz'), ('Nasa Fulcán')
                ON CONFLICT (nombre) DO NOTHING;
            """))

            db.execute(text("""
                INSERT INTO ramo (codigo, nombre)
                VALUES
                ('012', 'Cumplimiento'),
                ('013', 'Responsabilidad Civil'),
                ('021', 'Salud Familiar'),
                ('031', 'Vida Individual'),
                ('041', 'SOAT')
                ON CONFLICT (codigo) DO NOTHING;
            """))

            # ─────────────────────────────
            # ROLES
            # ─────────────────────────────
            db.execute(text("""
                INSERT INTO rol (nombre)
                VALUES ('ADMIN'), ('ASESOR')
                ON CONFLICT (nombre) DO NOTHING;
            """))

            admin_id = db.execute(
                text("SELECT id FROM rol WHERE nombre='ADMIN'")
            ).scalar()

            asesor_id = db.execute(
                text("SELECT id FROM rol WHERE nombre='ASESOR'")
            ).scalar()

            # ─────────────────────────────
            # PERMISOS
            # ─────────────────────────────
            permisos = [
                # ─────────────── Producción
                ('produccion', 'ver_todas'),
                ('produccion', 'ver_propias'),
                ('produccion', 'crear'),
                ('produccion', 'editar'),
                ('produccion', 'eliminar'),
                ('produccion', 'importar'),
                ('produccion', 'exportar'),
                ('produccion', 'traspasar'),

                # ─────────────── Cotizaciones
                ('cotizaciones', 'ver_todas'),
                ('cotizaciones', 'ver_propias'),
                ('cotizaciones', 'crear'),
                ('cotizaciones', 'editar'),

                # ─────────────── Prospectos
                ('prospectos', 'ver_todas'),
                ('prospectos', 'ver_propias'),
                ('prospectos', 'crear'),
                ('prospectos', 'editar'),

                # ─────────────── Dashboard
                ('dashboard', 'ver_global'),
                ('dashboard', 'ver_propio'),

                # ─────────────── Admin
                ('admin', 'catalogos'),
                ('admin', 'usuarios'),
            ]

            db.execute(
                text("""
                    INSERT INTO permiso (modulo, accion)
                    VALUES (:mod, :acc)
                    ON CONFLICT DO NOTHING;
                """),
                [{"mod": m, "acc": a} for m, a in permisos]
            )

            # ─────────────────────────────
            # PERMISOS ADMIN
            # ─────────────────────────────
            db.execute(text("""
                INSERT INTO rol_permiso (rol_id, permiso_id)
                SELECT :admin_id, id FROM permiso
                ON CONFLICT DO NOTHING;
            """), {"admin_id": admin_id})
            
            db.execute(text("""
                INSERT INTO rol_permiso (rol_id, permiso_id)
                SELECT :asesor_id, id FROM permiso
                WHERE accion IN ('ver_propias', 'crear', 'editar', 'exportar')
                OR accion = 'ver_propio'
                ON CONFLICT DO NOTHING;
            """), {"asesor_id": asesor_id})

            # ─────────────────────────────
            # USUARIOS
            # ─────────────────────────────
            password_hash = get_password_hash("123456")

            db.execute(text("""
                INSERT INTO usuario (nombre, email, password_hash, rol_id, activo)
                VALUES
                ('Dani Rodríguez', 'dani@juanfer.com', :pwd, :admin, TRUE),
                ('Juan Fernández', 'juan@juanfer.com', :pwd, :admin, TRUE),
                ('Gina López', 'gina@juanfer.com', :pwd, :asesor, TRUE),
                ('Diego Martínez', 'diego@juanfer.com', :pwd, :asesor, TRUE),
                ('Dilma Suárez', 'dilma@juanfer.com', :pwd, :asesor, TRUE),
                ('Julieta Mora', 'julieta@juanfer.com', :pwd, :asesor, TRUE),
                ('Lina Castro', 'lina@juanfer.com', :pwd, :asesor, TRUE)
                ON CONFLICT (email) DO NOTHING;
            """), {
                "pwd": password_hash,
                "admin": admin_id,
                "asesor": asesor_id
            })

        print("✅ Seed completado correctamente.")

    except Exception as e:
        db.rollback()
        print(f"❌ Error en seed: {e}")

    finally:
        db.close()


if __name__ == "__main__":
    seed()