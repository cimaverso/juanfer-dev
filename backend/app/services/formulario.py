from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select, func
from app.models.formularios.formulario import Formulario
from app.models.formularios.formulario_version import FormularioVersion
from app.models.formularios.formulario_grupo_pregunta import FormularioGrupoPregunta
from app.models.formularios.formulario_pregunta import FormularioPregunta
from app.models.formularios.constantes import CatalogoTipoCodigos, FormularioEstadoCodigos
from app.services.catalogo import CatalogoService
from app.schemas.formulario import (
    FormularioCreate, FormularioUpdate,
    FormularioGrupoPreguntaCreate, FormularioGrupoPreguntaUpdate,
    FormularioPreguntaCreate, FormularioPreguntaUpdate
)
from typing import Optional
from decimal import Decimal


class FormularioService:

    @staticmethod
    def listar(db: Session) -> list[Formulario]:
        stmt = select(Formulario).order_by(Formulario.created_at.desc())
        return db.execute(stmt).scalars().all()

    @staticmethod
    def obtener(db: Session, id: int) -> Optional[Formulario]:
        stmt = select(Formulario).where(Formulario.id == id)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def obtener_por_token(db: Session, token_publico) -> Optional[Formulario]:
        stmt = select(Formulario).where(Formulario.token_publico == token_publico)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def crear(db: Session, data: FormularioCreate) -> Formulario:
        estado_id = CatalogoService.get_valor_id(
            db,
            CatalogoTipoCodigos.FORMULARIO_ESTADO,
            FormularioEstadoCodigos.BORRADOR
        )

        nuevo_formulario = Formulario(
            titulo=data.titulo.strip(),
            descripcion=data.descripcion,
            estado_id=estado_id,
            configuracion=data.configuracion
        )

        db.add(nuevo_formulario)
        db.commit()
        db.refresh(nuevo_formulario)

        return nuevo_formulario

    @staticmethod
    def actualizar(db: Session, id: int, data: FormularioUpdate) -> Optional[Formulario]:
        formulario = FormularioService.obtener(db, id)

        if not formulario:
            return None

        if data.titulo is not None:
            formulario.titulo = data.titulo.strip()

        if data.descripcion is not None:
            formulario.descripcion = data.descripcion

        if data.estado_id is not None:
            formulario.estado_id = data.estado_id

        if data.configuracion is not None:
            formulario.configuracion = data.configuracion

        db.commit()
        db.refresh(formulario)

        return formulario

    @staticmethod
    def eliminar(db: Session, id: int):
        """
        Devuelve None si no existe, "tiene_respuestas" si el borrado choca con
        el ON DELETE RESTRICT de formulario_respuesta (no se puede borrar un
        formulario que ya tiene respuestas, aunque esté en borrador), o True
        si se eliminó.
        """
        formulario = FormularioService.obtener(db, id)

        if not formulario:
            return None

        try:
            db.delete(formulario)
            db.commit()
        except IntegrityError:
            db.rollback()
            return "tiene_respuestas"

        return True


class FormularioVersionService:

    @staticmethod
    def listar(db: Session, formulario_id: int) -> list[FormularioVersion]:
        stmt = (
            select(FormularioVersion)
            .where(FormularioVersion.formulario_id == formulario_id)
            .order_by(FormularioVersion.numero_version.desc())
        )
        return db.execute(stmt).scalars().all()

    @staticmethod
    def _construir_estructura(db: Session, formulario: Formulario) -> dict:
        """
        Snapshot inmutable de grupos + preguntas tal como están en el
        momento de publicar. `tipo_codigo` (no `tipo_id`) para que la
        versión no dependa de que el id de catalogo_valor no cambie.
        `orden` se guarda como string (Decimal no es serializable a JSON).
        """
        grupos = FormularioGrupoPreguntaService.listar(db, formulario.id)
        preguntas = FormularioPreguntaService.listar(db, formulario.id)

        return {
            "titulo": formulario.titulo,
            "descripcion": formulario.descripcion,
            "configuracion": formulario.configuracion,
            "grupos": [
                {
                    "id": grupo.id,
                    "codigo": grupo.codigo,
                    "titulo_template": grupo.titulo_template,
                    "minimo_repeticiones": grupo.minimo_repeticiones,
                    "maximo_repeticiones": grupo.maximo_repeticiones,
                    "entidad_destino": grupo.entidad_destino,
                    "orden": str(grupo.orden)
                }
                for grupo in grupos
            ],
            "preguntas": [
                {
                    "id": pregunta.id,
                    "grupo_id": pregunta.grupo_id,
                    "codigo": pregunta.codigo,
                    "tipo_codigo": pregunta.tipo.codigo,
                    "titulo": pregunta.titulo,
                    "subtitulo": pregunta.subtitulo,
                    "requerida": pregunta.requerida,
                    "orden": str(pregunta.orden),
                    "configuracion": pregunta.configuracion,
                    "mapea_a": pregunta.mapea_a
                }
                for pregunta in preguntas
            ]
        }

    @staticmethod
    def publicar(db: Session, formulario_id: int) -> Optional[FormularioVersion]:
        formulario = FormularioService.obtener(db, formulario_id)

        if not formulario:
            return None

        stmt = select(func.max(FormularioVersion.numero_version)).where(
            FormularioVersion.formulario_id == formulario_id
        )
        ultimo_numero = db.execute(stmt).scalar_one_or_none()
        siguiente_numero = (ultimo_numero + 1) if ultimo_numero is not None else 1

        nueva_version = FormularioVersion(
            formulario_id=formulario_id,
            numero_version=siguiente_numero,
            estructura=FormularioVersionService._construir_estructura(db, formulario)
        )

        db.add(nueva_version)
        db.flush()  # para obtener nueva_version.id antes de apuntar version_activa_id

        formulario.version_activa_id = nueva_version.id
        formulario.estado_id = CatalogoService.get_valor_id(
            db,
            CatalogoTipoCodigos.FORMULARIO_ESTADO,
            FormularioEstadoCodigos.ACTIVO
        )

        db.commit()
        db.refresh(nueva_version)

        return nueva_version


class FormularioGrupoPreguntaService:

    @staticmethod
    def listar(db: Session, formulario_id: int) -> list[FormularioGrupoPregunta]:
        stmt = (
            select(FormularioGrupoPregunta)
            .where(FormularioGrupoPregunta.formulario_id == formulario_id)
            .order_by(FormularioGrupoPregunta.orden)
        )
        return db.execute(stmt).scalars().all()

    @staticmethod
    def obtener(db: Session, id: int) -> Optional[FormularioGrupoPregunta]:
        stmt = select(FormularioGrupoPregunta).where(FormularioGrupoPregunta.id == id)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def _siguiente_orden(db: Session, formulario_id: int) -> Decimal:
        stmt = select(func.max(FormularioGrupoPregunta.orden)).where(
            FormularioGrupoPregunta.formulario_id == formulario_id
        )
        maximo = db.execute(stmt).scalar_one_or_none()
        return (maximo + 1) if maximo is not None else Decimal("1")

    @staticmethod
    def crear(db: Session, formulario_id: int, data: FormularioGrupoPreguntaCreate):
        nuevo_grupo = FormularioGrupoPregunta(
            formulario_id=formulario_id,
            codigo=data.codigo.strip(),
            titulo_template=data.titulo_template,
            minimo_repeticiones=data.minimo_repeticiones,
            maximo_repeticiones=data.maximo_repeticiones,
            entidad_destino=data.entidad_destino,
            orden=data.orden if data.orden is not None else FormularioGrupoPreguntaService._siguiente_orden(db, formulario_id)
        )

        db.add(nuevo_grupo)

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            return "codigo_duplicado"

        db.refresh(nuevo_grupo)
        return nuevo_grupo

    @staticmethod
    def actualizar(db: Session, id: int, data: FormularioGrupoPreguntaUpdate):
        grupo = FormularioGrupoPreguntaService.obtener(db, id)

        if not grupo:
            return None

        if data.codigo is not None:
            grupo.codigo = data.codigo.strip()

        if data.titulo_template is not None:
            grupo.titulo_template = data.titulo_template

        if data.minimo_repeticiones is not None:
            grupo.minimo_repeticiones = data.minimo_repeticiones

        if data.maximo_repeticiones is not None:
            grupo.maximo_repeticiones = data.maximo_repeticiones

        if data.entidad_destino is not None:
            grupo.entidad_destino = data.entidad_destino

        if data.orden is not None:
            grupo.orden = data.orden

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            return "codigo_duplicado"

        db.refresh(grupo)
        return grupo

    @staticmethod
    def eliminar(db: Session, id: int) -> Optional[bool]:
        grupo = FormularioGrupoPreguntaService.obtener(db, id)

        if not grupo:
            return None

        db.delete(grupo)
        db.commit()

        return True


class FormularioPreguntaService:

    @staticmethod
    def listar(db: Session, formulario_id: int) -> list[FormularioPregunta]:
        stmt = (
            select(FormularioPregunta)
            .where(FormularioPregunta.formulario_id == formulario_id)
            .order_by(FormularioPregunta.orden)
        )
        return db.execute(stmt).scalars().all()

    @staticmethod
    def obtener(db: Session, id: int) -> Optional[FormularioPregunta]:
        stmt = select(FormularioPregunta).where(FormularioPregunta.id == id)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def _siguiente_orden(db: Session, formulario_id: int) -> Decimal:
        stmt = select(func.max(FormularioPregunta.orden)).where(
            FormularioPregunta.formulario_id == formulario_id
        )
        maximo = db.execute(stmt).scalar_one_or_none()
        return (maximo + 1) if maximo is not None else Decimal("1")

    @staticmethod
    def _validar_grupo(db: Session, formulario_id: int, grupo_id: Optional[int]) -> bool:
        """True si grupo_id es None o pertenece al mismo formulario."""
        if grupo_id is None:
            return True

        stmt = select(FormularioGrupoPregunta.formulario_id).where(FormularioGrupoPregunta.id == grupo_id)
        grupo_formulario_id = db.execute(stmt).scalar_one_or_none()

        return grupo_formulario_id == formulario_id

    @staticmethod
    def crear(db: Session, formulario_id: int, data: FormularioPreguntaCreate):
        if not FormularioPreguntaService._validar_grupo(db, formulario_id, data.grupo_id):
            return "grupo_no_pertenece"

        tipo_id = CatalogoService.get_valor_id(
            db,
            CatalogoTipoCodigos.FORMULARIO_PREGUNTA_TIPO,
            data.tipo_codigo
        )

        if tipo_id is None:
            return "tipo_invalido"

        nueva_pregunta = FormularioPregunta(
            formulario_id=formulario_id,
            grupo_id=data.grupo_id,
            codigo=data.codigo.strip(),
            tipo_id=tipo_id,
            titulo=data.titulo,
            subtitulo=data.subtitulo,
            requerida=data.requerida,
            orden=data.orden if data.orden is not None else FormularioPreguntaService._siguiente_orden(db, formulario_id),
            configuracion=data.configuracion,
            mapea_a=data.mapea_a
        )

        db.add(nueva_pregunta)

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            return "codigo_duplicado"

        db.refresh(nueva_pregunta)
        return nueva_pregunta

    @staticmethod
    def actualizar(db: Session, id: int, data: FormularioPreguntaUpdate):
        pregunta = FormularioPreguntaService.obtener(db, id)

        if not pregunta:
            return None

        if data.grupo_id is not None:
            if not FormularioPreguntaService._validar_grupo(db, pregunta.formulario_id, data.grupo_id):
                return "grupo_no_pertenece"
            pregunta.grupo_id = data.grupo_id

        if data.tipo_codigo is not None:
            tipo_id = CatalogoService.get_valor_id(
                db,
                CatalogoTipoCodigos.FORMULARIO_PREGUNTA_TIPO,
                data.tipo_codigo
            )

            if tipo_id is None:
                return "tipo_invalido"

            pregunta.tipo_id = tipo_id

        if data.codigo is not None:
            pregunta.codigo = data.codigo.strip()

        if data.titulo is not None:
            pregunta.titulo = data.titulo

        if data.subtitulo is not None:
            pregunta.subtitulo = data.subtitulo

        if data.requerida is not None:
            pregunta.requerida = data.requerida

        if data.orden is not None:
            pregunta.orden = data.orden

        if data.configuracion is not None:
            pregunta.configuracion = data.configuracion

        if data.mapea_a is not None:
            pregunta.mapea_a = data.mapea_a

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            return "codigo_duplicado"

        db.refresh(pregunta)
        return pregunta

    @staticmethod
    def eliminar(db: Session, id: int) -> Optional[bool]:
        pregunta = FormularioPreguntaService.obtener(db, id)

        if not pregunta:
            return None

        db.delete(pregunta)
        db.commit()

        return True
