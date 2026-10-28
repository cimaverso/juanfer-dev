from sqlalchemy.orm import Session
from sqlalchemy import select, func
from datetime import datetime, timedelta, timezone
from typing import Optional
from app.models.formularios.formulario import Formulario
from app.models.formularios.formulario_respuesta import FormularioRespuesta
from app.models.formularios.constantes import CatalogoTipoCodigos, FormularioEstadoCodigos, RespuestaEstadoCodigos
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
        stmt = (
            select(FormularioRespuesta)
            .where(FormularioRespuesta.formulario_id == formulario_id)
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
    def _ya_respondio(db: Session, formulario_id: int, numero_documento: str) -> bool:
        estado_completada_id = CatalogoService.get_valor_id(
            db, CatalogoTipoCodigos.FORMULARIO_RESPUESTA_ESTADO, RespuestaEstadoCodigos.COMPLETADA
        )

        stmt = (
            select(func.count(FormularioRespuesta.id))
            .join(Cliente, FormularioRespuesta.cliente_id == Cliente.id)
            .where(
                FormularioRespuesta.formulario_id == formulario_id,
                FormularioRespuesta.estado_id == estado_completada_id,
                Cliente.numero_documento == numero_documento
            )
        )
        return db.execute(stmt).scalar_one() > 0

    @staticmethod
    def _extraer_campos_cliente(estructura: dict, respuestas: dict) -> dict:
        """
        Recorre las preguntas de la versión publicada con mapea_a.entidad ==
        'cliente' y toma su valor desde `respuestas` por su propio `codigo`
        (asume que son preguntas sueltas, no dentro de un grupo repetible —
        así están diseñadas hoy las preguntas del Tomador).
        """
        campos = {}

        for pregunta in estructura.get("preguntas", []):
            mapea_a = pregunta.get("mapea_a")

            if mapea_a and mapea_a.get("entidad") == "cliente":
                campos[mapea_a["campo"]] = respuestas.get(pregunta["codigo"])

        return campos

    @staticmethod
    def _validar_basico(estructura: dict, respuestas: dict) -> list[str]:
        """
        Valida requerida + tipo simple SOLO para preguntas sueltas
        (grupo_id es None). Las preguntas dentro de un grupo repetible
        (arrays en `respuestas`) no se validan campo por campo todavía
        (deuda explícita, ver docs/modulos/formularios.md).
        Devuelve la lista de `codigo` que fallaron.
        """
        errores = []

        for pregunta in estructura.get("preguntas", []):
            if pregunta.get("grupo_id") is not None:
                continue

            codigo = pregunta["codigo"]
            valor = respuestas.get(codigo)
            vacio = valor is None or valor == ""

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

        if FormularioRespuestaService._ya_respondio(db, formulario.id, numero_documento):
            return "ya_respondio"

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
                ciudad=campos_cliente.get("ciudad"),
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
