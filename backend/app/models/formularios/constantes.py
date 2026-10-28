"""
Constantes de los `codigo` esperados dentro de cada catalogo_tipo del
módulo de formularios. NO son un Enum de base de datos: la fuente de
verdad de qué valores existen es la tabla catalogo_valor, editable por el
admin sin deploy.

Estas constantes existen solo para el código de negocio (servicios,
motor de branching, validadores) que necesita comparar contra un `codigo`
específico para decidir un comportamiento — por ejemplo, el motor de
branching necesita saber que una pregunta es de tipo 'opcion' para saber
que sus respuestas posibles vienen de `configuracion.choices`, o el
servicio de publicación necesita saber cuál codigo corresponde a
'activo' para no permitir dos formularios activos con el mismo slug.

Agregar un valor nuevo en catalogo_valor (ej. un tipo de pregunta
'archivo') NO requiere tocar este archivo a menos que el motor de
formularios deba darle un tratamiento especial en código; si el valor
nuevo es puramente informativo (ej. un estado adicional que solo se
muestra como etiqueta), no hace falta declararlo aquí.
"""


class CatalogoTipoCodigos:
    FORMULARIO_ESTADO = "formulario_estado"
    FORMULARIO_CATEGORIA = "formulario_categoria"
    FORMULARIO_PREGUNTA_TIPO = "formulario_pregunta_tipo"
    FORMULARIO_RESPUESTA_ESTADO = "formulario_respuesta_estado"


class FormularioEstadoCodigos:
    BORRADOR = "borrador"
    ACTIVO = "activo"
    ARCHIVADO = "archivado"


class FormularioCategoriaCodigos:
    COTIZACION = "cotizacion"
    EXPEDICION = "expedicion"


class PreguntaTipoCodigos:
    TEXTO = "texto"
    NUMERO = "numero"
    EMAIL = "email"
    TELEFONO = "telefono"
    FECHA = "fecha"
    OPCION = "opcion"
    NPS = "nps"
    SECCION = "seccion"
    CALIFICACION = "calificacion"


class BranchingCodigos:
    # goto_codigo reservado dentro de FormularioPregunta.configuracion.branching
    # para saltar directo al final del formulario (equivalente a BranchInfo:
    # {"ToTheEnd": true} en el export de Microsoft Forms), sin apuntar a una
    # pregunta real.
    FIN = "__fin__"


class RespuestaEstadoCodigos:
    EN_PROGRESO = "en_progreso"
    COMPLETADA = "completada"