from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Optional
from app.models.usuarios_clientes.usuario import Usuario
from app.models.roles_permisos.rol import Rol

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