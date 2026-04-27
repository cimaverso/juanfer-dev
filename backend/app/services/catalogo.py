from app.core.security import verify_password, create_access_token
from app.services.usuario import UsuarioService
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.catalogos.estado_poliza import EstadoPoliza
from app.models.catalogos.aseguradora import Aseguradora
from app.models.catalogos.producto import Producto
from app.models.catalogos.ramo import Ramo
from app.models.catalogos.tipo_documento import TipoDocumento

class CatalogoService:

    @staticmethod
    def get_estados_poliza(db: Session):
        stmt = select(EstadoPoliza).order_by(EstadoPoliza.id)
        return db.execute(stmt).scalars().all()
    
    @staticmethod
    def get_aseguradoras(db: Session):
        stmt = select(Aseguradora).order_by(Aseguradora.id)
        return db.execute(stmt).scalars().all()
    
    @staticmethod
    def get_productos(db: Session):
        stmt = select(Producto).order_by(Producto.id)
        return db.execute(stmt).scalars().all()
    
    @staticmethod
    def get_ramos(db: Session):
        stmt = select(Ramo).order_by(Ramo.id)
        return db.execute(stmt).scalars().all()
    
    @staticmethod
    def get_tipos_documento(db: Session):
        stmt = select(TipoDocumento).order_by(TipoDocumento.id)
        return db.execute(stmt).scalars().all()