from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from typing import Optional
from datetime import datetime, timedelta, timezone
import secrets
from app.models.usuarios_clientes.usuario import Usuario
from app.models.roles_permisos.rol import Rol
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate
from app.core.security import get_password_hash, verify_password

ALFABETO_CODIGO_RESET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
LONGITUD_CODIGO_RESET = 8
MINUTOS_VIGENCIA_CODIGO_RESET = 60

class UsuarioService:

    @staticmethod
    def buscar_por_nombre(usu_name: str, db: Session) -> Optional[Usuario]:
        stmt = select(Usuario).where(Usuario.nombre == usu_name)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def buscar_usuario_activo(id_usuario: int, db: Session) -> Optional[Usuario]:
        stmt = select(Usuario).where((Usuario.id == id_usuario) & (Usuario.activo.is_(True)))
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def buscar_por_id(db: Session, usuario_id: int) -> Optional[Usuario]:
        stmt = select(Usuario).where(Usuario.id == usuario_id)
        return db.execute(stmt).scalar_one_or_none()
    
    @staticmethod
    def buscar_por_email(db: Session, email: str) -> Optional[Usuario]:
        stmt = select(Usuario).where(Usuario.email == email)
        return db.execute(stmt).scalar_one_or_none()
    
    @staticmethod
    def crear(db: Session, data: UsuarioCreate):
        """
        Devuelve "rol_invalido" si data.rol no es ADMIN/ASESOR (los únicos
        dos roles sembrados -- no hay catálogo editable para esto) o
        "email_duplicado" si ya existe un usuario con ese email.
        """
        stmt_rol = select(Rol).where(Rol.nombre == data.rol)
        rol = db.execute(stmt_rol).scalar_one_or_none()
        if rol is None:
            return "rol_invalido"

        nuevo_usuario = Usuario(
            nombre=data.nombre.strip(),
            email=data.email.lower(),
            password_hash=get_password_hash(data.password),
            rol_id=rol.id,
        )

        db.add(nuevo_usuario)

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            return "email_duplicado"

        db.refresh(nuevo_usuario)
        return nuevo_usuario

    @staticmethod
    def actualizar(db: Session, usuario_id: int, data: UsuarioUpdate):
        """
        Devuelve None si el usuario no existe, "rol_invalido"/"email_duplicado"
        igual que crear(). La contraseña NO se cambia por aquí -- sigue el
        flujo existente de "generar código de reset" (ver D-012).
        """
        usuario = UsuarioService.buscar_por_id(db, usuario_id)
        if usuario is None:
            return None

        if data.rol is not None:
            rol = db.execute(select(Rol).where(Rol.nombre == data.rol)).scalar_one_or_none()
            if rol is None:
                return "rol_invalido"
            usuario.rol_id = rol.id

        if data.nombre is not None:
            usuario.nombre = data.nombre.strip()

        if data.email is not None:
            usuario.email = data.email.lower()

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            return "email_duplicado"

        db.refresh(usuario)
        return usuario

    @staticmethod
    def eliminar(db: Session, usuario_id: int, solicitante_id: int):
        """
        Borrado lógico (activo=False), como el resto del sistema (ver
        DT-017: nunca hard-delete sobre filas con historia referenciada --
        Usuario tiene decenas de FKs desde historial/pólizas/auditoría).
        Devuelve None si no existe, "no_puede_eliminarse_a_si_mismo" si el
        admin intenta desactivar su propia cuenta (evita quedar bloqueado
        sin otro admin activo), o "ok".
        """
        if usuario_id == solicitante_id:
            return "no_puede_eliminarse_a_si_mismo"

        usuario = UsuarioService.buscar_por_id(db, usuario_id)
        if usuario is None:
            return None

        usuario.activo = False
        db.commit()
        return "ok"

    @staticmethod
    def listar_usuarios_activos(db: Session, user) -> Optional[list[Usuario]]:
        if user.rol == "ASESOR":
            stmt = (
                select(Usuario)
                .join(Rol)
                .where(Rol.nombre == "ASESOR", Usuario.activo.is_(True))
            )
        else:
            stmt = (
                select(Usuario)
                .where(Usuario.activo.is_(True))
            )

        return db.execute(stmt).scalars().all()

    @staticmethod
    def generar_codigo_reset(db: Session, usuario_id: int) -> Optional[str]:
        usuario = UsuarioService.buscar_por_id(db, usuario_id)
        if usuario is None:
            return None

        codigo = "".join(secrets.choice(ALFABETO_CODIGO_RESET) for _ in range(LONGITUD_CODIGO_RESET))
        usuario.reset_codigo_hash = get_password_hash(codigo)
        usuario.reset_codigo_expira_en = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=MINUTOS_VIGENCIA_CODIGO_RESET)
        db.commit()
        return codigo

    @staticmethod
    def _codigo_reset_valido(usuario: Optional[Usuario], codigo: str) -> bool:
        if usuario is None or not usuario.reset_codigo_hash or not usuario.reset_codigo_expira_en:
            return False
        if datetime.now(timezone.utc).replace(tzinfo=None) > usuario.reset_codigo_expira_en:
            return False
        return verify_password(codigo, usuario.reset_codigo_hash)

    @staticmethod
    def validar_codigo_reset(db: Session, email: str, codigo: str) -> bool:
        usuario = UsuarioService.buscar_por_email(db, email)
        return UsuarioService._codigo_reset_valido(usuario, codigo)

    @staticmethod
    def completar_reset_password(db: Session, email: str, codigo: str, nueva_password: str) -> bool:
        usuario = UsuarioService.buscar_por_email(db, email)
        if not UsuarioService._codigo_reset_valido(usuario, codigo):
            return False

        usuario.password_hash = get_password_hash(nueva_password)
        usuario.reset_codigo_hash = None
        usuario.reset_codigo_expira_en = None
        db.commit()
        return True