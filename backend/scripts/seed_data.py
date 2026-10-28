from sqlalchemy import text
from app.core.db import SessionLocal
from app.core.security import get_password_hash
from app.models.formularios.constantes import (
    CatalogoTipoCodigos,
    FormularioEstadoCodigos,
    FormularioCategoriaCodigos,
    PreguntaTipoCodigos,
    RespuestaEstadoCodigos,
)


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
                INSERT INTO estado_prospecto (id, nombre, color, orden) VALUES
                    (1,  'Primer contacto',    'contacto-1',  1),
                    (2,  'Segundo contacto',   'contacto-2',  2),
                    (3,  'Tercer contacto',    'contacto-3',  3),
                    (4,  'Cuarto contacto',    'contacto-4',  4),
                    (5,  'Quinto contacto',    'contacto-5',  5),
                    (6,  'Sexto contacto',     'contacto-6',  6),
                    (7,  'Séptimo contacto',   'contacto-7',  7),
                    (8,  'Cotización enviada', 'cotizacion',  8),
                    (9,  'En firma',           'firma',       9),
                    (10, 'En evaluación',      'evaluacion', 10),
                    (11, 'Convertido',         'convertido', 11),
                    (12, 'Descartado',         'descartado', 12)
                ON CONFLICT (id) DO UPDATE SET
                    nombre = EXCLUDED.nombre,
                    color  = EXCLUDED.color,
                    orden  = EXCLUDED.orden;
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
            # CATÁLOGOS DE FORMULARIOS DINÁMICOS
            # (catalogo_tipo / catalogo_valor genéricos)
            # ─────────────────────────────

            # 1) catalogo_tipo: una fila por "familia" de catálogo.
            #    Los codigo salen de CatalogoTipoCodigos para que nunca queden
            #    desincronizados de lo que el código de negocio espera encontrar.
            db.execute(
                text("""
                    INSERT INTO catalogo_tipo (codigo, nombre, descripcion)
                    VALUES (:codigo, :nombre, :descripcion)
                    ON CONFLICT (codigo) DO NOTHING;
                """),
                [
                    {
                        "codigo": CatalogoTipoCodigos.FORMULARIO_ESTADO,
                        "nombre": "Estado de formulario",
                        "descripcion": "Estados posibles de un formulario dinámico",
                    },
                    {
                        "codigo": CatalogoTipoCodigos.FORMULARIO_CATEGORIA,
                        "nombre": "Categoría de formulario",
                        "descripcion": "Clasificación de negocio del formulario (cotización/expedición)",
                    },
                    {
                        "codigo": CatalogoTipoCodigos.FORMULARIO_PREGUNTA_TIPO,
                        "nombre": "Tipo de pregunta",
                        "descripcion": "Tipos de pregunta soportados por el motor de formularios",
                    },
                    {
                        "codigo": CatalogoTipoCodigos.FORMULARIO_RESPUESTA_ESTADO,
                        "nombre": "Estado de respuesta",
                        "descripcion": "Estados posibles de una respuesta de formulario",
                    },
                ]
            )

            # 2) Recuperamos los id recién insertados (o ya existentes, si el
            #    seed corre más de una vez) para poder referenciarlos en
            #    catalogo_valor.
            formulario_estado_tipo_id = db.execute(
                text("SELECT id FROM catalogo_tipo WHERE codigo = :codigo"),
                {"codigo": CatalogoTipoCodigos.FORMULARIO_ESTADO}
            ).scalar()

            formulario_categoria_tipo_id = db.execute(
                text("SELECT id FROM catalogo_tipo WHERE codigo = :codigo"),
                {"codigo": CatalogoTipoCodigos.FORMULARIO_CATEGORIA}
            ).scalar()

            formulario_pregunta_tipo_id = db.execute(
                text("SELECT id FROM catalogo_tipo WHERE codigo = :codigo"),
                {"codigo": CatalogoTipoCodigos.FORMULARIO_PREGUNTA_TIPO}
            ).scalar()

            formulario_respuesta_estado_tipo_id = db.execute(
                text("SELECT id FROM catalogo_tipo WHERE codigo = :codigo"),
                {"codigo": CatalogoTipoCodigos.FORMULARIO_RESPUESTA_ESTADO}
            ).scalar()

            # 3) catalogo_valor: los valores concretos. Estos SÍ son
            #    editables por el admin desde la UI después (agregar,
            #    renombrar, reordenar, desactivar) sin volver a correr este
            #    seed ni hacer deploy.
            db.execute(
                text("""
                    INSERT INTO catalogo_valor (catalogo_tipo_id, codigo, nombre, orden)
                    VALUES (:tipo_id, :codigo, :nombre, :orden)
                    ON CONFLICT (catalogo_tipo_id, codigo) DO NOTHING;
                """),
                [
                    # --- formulario_estado ---
                    {"tipo_id": formulario_estado_tipo_id, "codigo": FormularioEstadoCodigos.BORRADOR, "nombre": "Borrador", "orden": 1},
                    {"tipo_id": formulario_estado_tipo_id, "codigo": FormularioEstadoCodigos.ACTIVO, "nombre": "Activo", "orden": 2},
                    {"tipo_id": formulario_estado_tipo_id, "codigo": FormularioEstadoCodigos.ARCHIVADO, "nombre": "Archivado", "orden": 3},

                    # --- formulario_categoria ---
                    {"tipo_id": formulario_categoria_tipo_id, "codigo": FormularioCategoriaCodigos.COTIZACION, "nombre": "Cotización", "orden": 1},
                    {"tipo_id": formulario_categoria_tipo_id, "codigo": FormularioCategoriaCodigos.EXPEDICION, "nombre": "Expedición", "orden": 2},

                    # --- formulario_pregunta_tipo ---
                    {"tipo_id": formulario_pregunta_tipo_id, "codigo": PreguntaTipoCodigos.TEXTO, "nombre": "Texto", "orden": 1},
                    {"tipo_id": formulario_pregunta_tipo_id, "codigo": PreguntaTipoCodigos.NUMERO, "nombre": "Número", "orden": 2},
                    {"tipo_id": formulario_pregunta_tipo_id, "codigo": PreguntaTipoCodigos.EMAIL, "nombre": "Email", "orden": 3},
                    {"tipo_id": formulario_pregunta_tipo_id, "codigo": PreguntaTipoCodigos.TELEFONO, "nombre": "Teléfono", "orden": 4},
                    {"tipo_id": formulario_pregunta_tipo_id, "codigo": PreguntaTipoCodigos.FECHA, "nombre": "Fecha", "orden": 5},
                    {"tipo_id": formulario_pregunta_tipo_id, "codigo": PreguntaTipoCodigos.OPCION, "nombre": "Opción múltiple", "orden": 6},
                    {"tipo_id": formulario_pregunta_tipo_id, "codigo": PreguntaTipoCodigos.NPS, "nombre": "NPS", "orden": 7},
                    {"tipo_id": formulario_pregunta_tipo_id, "codigo": PreguntaTipoCodigos.SECCION, "nombre": "Sección", "orden": 8},
                    {"tipo_id": formulario_pregunta_tipo_id, "codigo": PreguntaTipoCodigos.CALIFICACION, "nombre": "Calificación", "orden": 9},

                    # --- formulario_respuesta_estado ---
                    {"tipo_id": formulario_respuesta_estado_tipo_id, "codigo": RespuestaEstadoCodigos.EN_PROGRESO, "nombre": "En progreso", "orden": 1},
                    {"tipo_id": formulario_respuesta_estado_tipo_id, "codigo": RespuestaEstadoCodigos.COMPLETADA, "nombre": "Completada", "orden": 2},
                ]
            )

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