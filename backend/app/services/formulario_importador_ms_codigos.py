"""
Diccionario trackingId -> codigo base de campo, construido a mano revisando
los JSON reales de Microsoft Forms (ver docs/ESTADO.md). No todos los
trackingId son estables entre formularios distintos -- solo lo son para
copias del mismo campo DENTRO de un mismo formulario (ej. "Nombres y
apellidos del asegurado #1/#2/#3/#4" comparten trackingId) y para un grupo
de campos que el equipo de la aseguradora reutilizó copiando entre
formularios (tipo de documento, numero de documento, nombre completo,
correo, celular, genero, parentesco, fecha de nacimiento del asegurado).

Cuando un trackingId no está acá, formulario_importador_ms.py cae a derivar
el codigo desde el titulo y lo reporta en "sin_mapear" para revisión manual
-- nunca falla el parseo por un campo nuevo.

Clave: trackingId tal como aparece en el JSON de MS Forms.
Valor: nombre base del campo (snake_case, sin el prefijo de rol). El parser
antepone el rol detectado (tomador/asegurado/delegado/titular_cuenta/...)
para formar el `codigo` final, ej. "tomador.numero_documento".
"""

CODIGOS_POR_TRACKING_ID: dict[str, str] = {
    "d99859ff5335475e963ad57c006deb8d": "tipo_documento",
    "2e123c175b9b4d2784e7ed7ebb1751ed": "numero_documento",
    "b5655d1e843e4e3b81de0e97fb4bb3db": "nombre_completo",
    "a5904e26ac6e42fcb0f7d27706bf7b19": "nombre_completo",
    "91809df1af61477185835f233b0602e2": "correo",
    "54a368ed15274604b85d6169f38bc257": "celular",
    "203338b99a6b45b9bef8e4fe91bf024b": "direccion",
    "f0d5e213216f40778399bc7d47fbf406": "pais_departamento_ciudad",
    "8ab7cae2919540d9b3dea6f4dd44135f": "ocupacion_detalle",
    "9e1b7fdd9cf24d0ca661f4274b5693bb": "genero",
    "ae93c084309042bb91f9997258f8463d": "parentesco_con_tomador",
    "fc95f3c332344844a41e24f54995ec3e": "fecha_nacimiento",
    "0ea6558530ca44a896925d72454e9d03": "fecha_expedicion_documento",
    "744c3e293c3249c4affc2c9e20a51594": "calificacion_servicio",
    "9db9ddb9199840f4b180b002f3740f31": "nps",
    "f038ca4a1dab45db807d0cdb7f5bd6ad": "mensaje_cierre",
    "8d8274cbaa08484abcf1dbb7d3c34848": "referido",
    # Secciones y controles de MS Forms que se repiten idénticos en todos
    # los formularios revisados (ver docs/ESTADO.md):
    "3e0e398a96d2478fac01a3802318c052": "encabezado_tomador",
    "138942b93f524ed0b7ee392c7c573d15": "fin_formulario",
    "1c4ad56178944543864267091e1ee4fb": "encabezado_asegurado",
    "36f2d143343d41059229457c5e756e15": "otro_asegurado",
    "600594da5d9148248a9b3f7040ac8a68": "asegurado_principal_es_tomador",
}

# Campos NOT NULL de Cliente (ver docs/modulos/formularios.md "Regla de
# negocio clave": toda respuesta pública se resuelve a un Cliente real por
# estos 4 campos). Toda pregunta SUELTA (sin grupo) del rol "tomador" cuyo
# codigo base coincida con una de estas claves se vincula automáticamente
# a Cliente (mapea_a) y su tipo se fuerza al correcto -- igual que si un
# admin la vinculara a mano desde el builder. Debe mantenerse igual a
# CAMPOS_CLIENTE en frontend/src/pages/formularios/FormularioBuilder.jsx;
# si se agrega un campo ahí, agregarlo también aquí.
CAMPOS_CLIENTE_CRITICOS: dict[str, dict] = {
    "tipo_documento": {"campo": "tipo_documento", "tipo_forzado": "opcion"},
    "numero_documento": {"campo": "numero_documento", "tipo_forzado": "texto"},
    "nombre_completo": {"campo": "nombre_completo", "tipo_forzado": "texto"},
    "celular": {"campo": "celular", "tipo_forzado": "telefono"},
}

# trackingId de preguntas que son solo el control de "¿quieres otro
# asegurado/delegado?" del patrón de repeticion de MS Forms. El parser las
# sigue incluyendo en el resultado (no se descartan solas, eso es una
# decision que debe confirmar quien revise), pero las marca con
# `_posible_control_repeticion=True` en vez de intentar adivinar.
PATRON_CONTROL_REPETICION = r"(?i)\b(otro|completar registro|registrar)\b.*\b(asegurado|delegado)\b"

# Palabras que identifican una entidad repetible dentro de una sección
# (ColumnGroup). Si una sección menciona alguna de estas palabras junto a
# "#N", se asume que es una repetición N de esa entidad.
PATRON_ENTIDAD_NUMERADA = r"(?i)\b(ASEGURADOS?|DELEGADOS?)\b.*?#\s*(\d+)"

# Frases a remover del título antes de generar un codigo por slug (fallback
# cuando no hay trackingId conocido), para no terminar con codigos como
# "nombre_completo_del_asegurado_1" en vez de "nombre_completo".
FRASES_A_REMOVER_DEL_TITULO = [
    r"(?i)del\s+tomador",
    r"(?i)del\s*/?\s*los?\s+asegurados?\s*/?\s*s?",
    r"(?i)del\s+asegurado\s*#?\s*\d*",
    r"(?i)del\s+delegado",
    r"(?i)del\s+titular\s+de\s+la\s+cuenta\s+o\s+tarjeta",
    r"(?i)con\s+el\s+tomador",
    r"#\s*\d+",
    r"(?i)\.\s*elija\s+una\s+opci[oó]n\.?",
    r"(?i)sin\s+puntos,?\s*comas,?\s*ni\s+espacios\.?",
]
