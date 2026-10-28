from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.usuarios_clientes.empresa import Empresa


class EmpresaService:

    @staticmethod
    def obtener(db: Session) -> Empresa:
        empresa = db.execute(select(Empresa)).scalars().first()
        return empresa if empresa else Empresa()

    @staticmethod
    def actualizar(db: Session, datos: dict) -> Empresa:
        empresa = db.execute(select(Empresa)).scalars().first()
        if empresa is None:
            empresa = Empresa()
            db.add(empresa)

        for campo, valor in datos.items():
            setattr(empresa, campo, valor)

        db.commit()
        db.refresh(empresa)
        return empresa
