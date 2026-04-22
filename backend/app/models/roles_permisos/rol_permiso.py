from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String, ForeignKey
from app.db.base import Base

class RolPermiso(Base):
    __tablename__ = "rol_permiso"

    rol_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("rol.id", ondelete="CASCADE"),
        primary_key=True
    )

    permiso_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("permiso.id", ondelete="CASCADE"),
        primary_key=True
    )