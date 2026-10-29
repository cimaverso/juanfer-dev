from sqlalchemy.orm import Session
from sqlalchemy import select, func
from datetime import datetime, timedelta, timezone
from typing import Optional
from app.models.formularios.formulario import Formulario
from app.models.formularios.formulario_respuesta import FormularioRespuesta
from app.models.formularios.constantes import CatalogoTipoCodigos, FormularioEstadoCodigos, RespuestaEstadoCodigos, BranchingCodigos
from app.models.usuarios_clientes.cliente import Cliente
from app.services.catalogo import CatalogoService
from app.services.formulario import FormularioService
from app.schemas.formulario_respuesta import FormularioRespuestaCreate

# Límite de envíos del endpoint público (RF-010/RNF-003). Valores iniciales,
# ajustables sin cambio de esquema; no hay infraestructura de rate-limit
# aparte (ej. Redis), se resuelve con una consulta sobre formulario_respuesta.
ENVIOS_MAX_POR_IP = 5
VENTANA_MINUTOS_POR_IP = 60


class FormularioRespuestaService:

    @staticmethod
    def listar(db: Session, formulario_id: int) -> list[FormularioRespuesta]:
        """
        Incluye cliente_nombre/cliente_documento (no son columnas de
        FormularioRespuesta: se asignan como atributo de instancia tras el
        join, solo para que FormularioRespuestaRead los lea con
        from_attributes) para que el admin vea algo legible sin tener que
        resolver cliente_id a mano.
        """
        stmt = (
            select(FormularioRespuesta, Cliente.nombre_completo, Cliente.numero_documento)
            .outerjoin(Cliente, FormularioRespuesta.cliente_id == Cliente.id)
            .where(FormularioRespuesta.formulario_id == formulario_id)
            .order_by(FormularioRespuesta.iniciado_at.desc())
        )

        resultado = []
        for respuesta, nombre, documento in db.execute(stmt).all():
            respuesta.cliente_nombre = nombre
            respuesta.cliente_documento = documento
            resultado.append(respuesta)

        return resultado

    @staticmethod
    def metricas(db: Session, formulario_id: int) -> Optional[dict]:
        """
        Set básico de métricas (ver docs/modulos/formularios.md): total de
        respuestas, completadas vs en progreso, tasa de completitud y una
        serie diaria de respuestas iniciadas. Devuelve None si el
        formulario no existe.
        """
        if not FormularioService.obtener(db, formulario_id):
            return None

        completada_id = CatalogoService.get_valor_id(
            db, CatalogoTipoCodigos.FORMULARIO_RESPUESTA_ESTADO, RespuestaEstadoCodigos.COMPLETADA
        )
        en_progreso_id = CatalogoService.get_valor_id(
            db, CatalogoTipoCodigos.FORMULARIO_RESPUESTA_ESTADO, RespuestaEstadoCodigos.EN_PROGRESO
        )

        total = db.execute(
            select(func.count(FormularioRespuesta.id)).where(FormularioRespuesta.formulario_id == formulario_id)
        ).scalar_one()

        completadas = db.execute(
            select(func.count(FormularioRespuesta.id)).where(
                FormularioRespuesta.formulario_id == formulario_id,
                FormularioRespuesta.estado_id == completada_id
            )
        ).scalar_one()

        en_progreso = db.execute(
            select(func.count(FormularioRespuesta.id)).where(
                FormularioRespuesta.formulario_id == formulario_id,
                FormularioRespuesta.estado_id == en_progreso_id
            )
        ).scalar_one()

        tasa_completitud = (completadas / total) if total > 0 else 0.0

        dia = func.date(FormularioRespuesta.iniciado_at)
        stmt_serie = (
            select(dia, func.count(FormularioRespuesta.id))
            .where(FormularioRespuesta.formulario_id == formulario_id)
            .group_by(dia)
            .order_by(dia)
        )
        serie_diaria = [
            {"fecha": fecha, "total": total_dia}
            for fecha, total_dia in db.execute(stmt_serie).all()
        ]

        return {
            "total_respuestas": total,
            "completadas": completadas,
            "en_progreso": en_progreso,
            "tasa_completitud": round(tasa_completitud, 4),
            "serie_diaria": serie_diaria,
        }

    @staticmethod
    def listar_por_cliente(db: Session, cliente_id: int) -> list[FormularioRespuesta]:
        stmt = (
            select(FormularioRespuesta)
            .where(FormularioRespuesta.cliente_id == cliente_id)
            .order_by(FormularioRespuesta.iniciado_at.desc())
        )
        return db.execute(stmt).scalars().all()

    @staticmethod
    def listar_por_prospecto(db: Session, prospecto_id: int) -> list[FormularioRespuesta]:
        """Sin uso hoy desde el front (ver prospecto_id en el modelo y DT-020)."""
        stmt = (
            select(FormularioRespuesta)
            .where(FormularioRespuesta.prospecto_id == prospecto_id)
            .order_by(FormularioRespuesta.iniciado_at.desc())
        )
        return db.execute(stmt).scalars().all()

    @staticmethod
    def _excede_limite_ip(db: Session, formulario_id: int, ip: Optional[str]) -> bool:
        if not ip:
            return False

        desde = datetime.now(timezone.utc) - timedelta(minutes=VENTANA_MINUTOS_POR_IP)

        stmt = select(func.count(FormularioRespuesta.id)).where(
            FormularioRespuesta.formulario_id == formulario_id,
            FormularioRespuesta.metadatos["ip"].as_string() == ip,
            FormularioRespuesta.iniciado_at >= desde
        )
        return db.execute(stmt).scalar_one() >= ENVIOS_MAX_POR_IP

    @staticmethod
    def _extraer_campos_cliente(estructura: dict, respuestas: dict) -> dict:
        """
        Recorre las preguntas de la versión publicada con mapea_a.entidad ==
        'cliente' y toma su valor desde `respuestas` por su propio `codigo`
        (asume que son preguntas sueltas, no dentro de un grupo repetible —
        así están diseñadas hoy las preguntas del Tomador).

        Varias preguntas distintas pueden mapear al MISMO campo (ej. una
        "Número de documento" por cada tipo de documento, mostrada
        condicionalmente en el front según la respuesta de "Tipo de
        documento" — ver branching en docs/modulos/formularios.md). Solo
        una de ellas estará realmente diligenciada; una alternativa vacía
        nunca debe pisar un valor ya encontrado para ese mismo campo.
        """
        campos = {}

        for pregunta in estructura.get("preguntas", []):
            mapea_a = pregunta.get("mapea_a")

            if mapea_a and mapea_a.get("entidad") == "cliente":
                campo = mapea_a["campo"]
                valor = respuestas.get(pregunta["codigo"])

                if valor not in (None, ""):
                    campos[campo] = valor
                elif campo not in campos:
                    campos[campo] = valor

        return campos

    @staticmethod
    def _preguntas_controladas(estructura: dict) -> dict:
        """
        Igual criterio que el front (ver FormularioPublico.jsx,
        resolverPagina): una pregunta que es destino de alguna opción de
        otra pregunta tipo "opcion" queda controlada — solo es exigible
        cuando la respuesta de quien la controla coincide con esa opción
        (ej. "Número de documento" solo si "Tipo de documento" = CC).
        Devuelve {codigo_destino: [(codigo_controladora, valor), ...]}.
        """
        controladas = {}

        for pregunta in estructura.get("preguntas", []):
            if pregunta.get("tipo_codigo") != "opcion":
                continue

            branching = (pregunta.get("configuracion") or {}).get("branching") or {}

            for valor, destino in branching.items():
                if destino == BranchingCodigos.FIN:
                    continue
                controladas.setdefault(destino, []).append((pregunta["codigo"], valor))

        return controladas

    @staticmethod
    def _validar_basico(estructura: dict, respuestas: dict) -> list[str]:
        """
        Valida requerida + tipo simple SOLO para preguntas sueltas
        (grupo_id es None). Las preguntas dentro de un grupo repetible
        (arrays en `respuestas`) no se validan campo por campo todavía
        (deuda explícita, ver docs/modulos/formularios.md).

        Excluye las preguntas tipo "seccion" (son encabezados de página,
        no tienen valor que diligenciar) y, dentro de las controladas por
        branching, solo exige la que esté realmente activa según la
        respuesta actual de su controladora — las alternativas ocultas
        (ej. "NIT" cuando se eligió "CC") nunca deberían bloquear el envío.

        Devuelve la lista de `codigo` que fallaron.
        """
        errores = []
        controladas = FormularioRespuestaService._preguntas_controladas(estructura)

        for pregunta in estructura.get("preguntas", []):
            if pregunta.get("grupo_id") is not None:
                continue

            if pregunta.get("tipo_codigo") == "seccion":
                continue

            codigo = pregunta["codigo"]

            controladores = controladas.get(codigo)
            if controladores and not any(respuestas.get(c) == v for c, v in controladores):
                continue

            valor = respuestas.get(codigo)
            # valor == [] cubre una pregunta "opcion" con
            # configuracion.multiple=true sin ninguna opción marcada --
            # valor == "" no detecta ese caso porque [] != "".
            vacio = valor is None or valor == "" or valor == []

            if pregunta.get("requerida") and vacio:
                errores.append(codigo)
                continue

            if vacio:
                continue

            tipo = pregunta.get("tipo_codigo")

            if tipo == "numero":
                try:
                    float(valor)
                except (TypeError, ValueError):
                    errores.append(codigo)
            elif tipo == "email":
                if not isinstance(valor, str) or "@" not in valor:
                    errores.append(codigo)
            elif tipo == "fecha":
                try:
                    datetime.fromisoformat(str(valor))
                except ValueError:
                    errores.append(codigo)

        return errores

    @staticmethod
    def crear(db: Session, token_publico, data: FormularioRespuestaCreate, ip: Optional[str], user_agent: Optional[str]):
        formulario = FormularioService.obtener_por_token(db, token_publico)

        if not formulario:
            return "no_encontrado"

        if formulario.estado.codigo != FormularioEstadoCodigos.ACTIVO or formulario.version_activa_id is None:
            return "no_disponible"

        if FormularioRespuestaService._excede_limite_ip(db, formulario.id, ip):
            return "limite_ip"

        estructura = formulario.version_activa.estructura

        campos_cliente = FormularioRespuestaService._extraer_campos_cliente(estructura, data.respuestas)
        numero_documento = campos_cliente.get("numero_documento")

        if not numero_documento:
            return "faltan_campos_cliente"

        errores = FormularioRespuestaService._validar_basico(estructura, data.respuestas)

        if errores:
            return ("validacion", errores)

        cliente_stmt = select(Cliente).where(Cliente.numero_documento == numero_documento)
        cliente = db.execute(cliente_stmt).scalar_one_or_none()

        if not cliente:
            tipo_documento_id = CatalogoService.get_id_tipo_doc(campos_cliente.get("tipo_documento"), db)

            if tipo_documento_id is None:
                return "tipo_documento_invalido"

            cliente = Cliente(
                tipo_documento_id=tipo_documento_id,
                numero_documento=numero_documento,
                nombre_completo=campos_cliente.get("nombre_completo"),
                celular=campos_cliente.get("celular"),
                correo=campos_cliente.get("correo"),
                ocupacion=campos_cliente.get("ocupacion"),
                ubicacion=campos_cliente.get("ubicacion"),
                responsable_id=None
            )
            db.add(cliente)
            db.flush()  # para obtener cliente.id antes de crear la respuesta

        estado_completada_id = CatalogoService.get_valor_id(
            db, CatalogoTipoCodigos.FORMULARIO_RESPUESTA_ESTADO, RespuestaEstadoCodigos.COMPLETADA
        )

        metadatos = dict(data.metadatos or {})
        metadatos["ip"] = ip
        metadatos["user_agent"] = user_agent

        nueva_respuesta = FormularioRespuesta(
            formulario_id=formulario.id,
            formulario_version_id=formulario.version_activa_id,
            cliente_id=cliente.id,
            respuestas=data.respuestas,
            estado_id=estado_completada_id,
            metadatos=metadatos,
            completado_at=datetime.now(timezone.utc)
        )

        db.add(nueva_respuesta)
        db.commit()
        db.refresh(nueva_respuesta)

        return nueva_respuesta
