from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Optional
from app.models.usuarios_clientes.usuario import Usuario

class UsuarioService: 

    @staticmethod
    def buscar_por_email(db: Session, usuario_id: int) -> Optional[Usuario]:
        stmt = select(Usuario).where(Usuario.id == usuario_id)
        return db.execute(stmt).scalar_one_or_none()
    
    @staticmethod
    def buscar_por_email(db: Session, email: str) -> Optional[Usuario]:
        stmt = select(Usuario).where(Usuario.email == email)
        return db.execute(stmt).scalar_one_or_none()
    
    @staticmethod
    def listar_usuarios_activos(db: Session) -> Optional[list[Usuario]]:
        stmt = select(Usuario).where(Usuario.activo == True)
        return db.execute(stmt).scalars().all()