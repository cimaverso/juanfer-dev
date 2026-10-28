from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import time
from app.models.usuarios_clientes.horario_usuario import HorarioUsuario, DIAS_SEMANA
from app.models.usuarios_clientes.usuario import Usuario

DIAS_INACTIVOS_DEFAULT = ("sabado", "domingo")
HORA_DESDE_DEFAULT = time(8, 0)
HORA_HASTA_DEFAULT = time(17, 0)


def _horario_default() -> list[HorarioUsuario]:
    return [
        HorarioUsuario(
            dia_semana=dia,
            activo=dia not in DIAS_INACTIVOS_DEFAULT,
            hora_desde=HORA_DESDE_DEFAULT,
            hora_hasta=HORA_HASTA_DEFAULT,
        )
        for dia in DIAS_SEMANA
    ]


class HorarioUsuarioService:

    @staticmethod
    def obtener_horario(db: Session, usuario_id: int) -> list[HorarioUsuario]:
        stmt = select(HorarioUsuario).where(HorarioUsuario.usuario_id == usuario_id)
        dias = db.execute(stmt).scalars().all()
        return dias if dias else _horario_default()

    @staticmethod
    def actualizar_horario(db: Session, usuario_id: int, dias_data: list[dict]) -> list[HorarioUsuario] | str:
        codigos = [d["dia_semana"] for d in dias_data]

        if set(codigos) != set(DIAS_SEMANA) or len(codigos) != len(DIAS_SEMANA):
            return "dias_invalidos"

        stmt = select(HorarioUsuario).where(HorarioUsuario.usuario_id == usuario_id)
        existentes = {h.dia_semana: h for h in db.execute(stmt).scalars().all()}

        resultado = []
        for dia_data in dias_data:
            dia = existentes.get(dia_data["dia_semana"])
            if dia is None:
                dia = HorarioUsuario(usuario_id=usuario_id, dia_semana=dia_data["dia_semana"])
                db.add(dia)
            dia.activo = dia_data["activo"]
            dia.hora_desde = dia_data["hora_desde"]
            dia.hora_hasta = dia_data["hora_hasta"]
            resultado.append(dia)

        db.commit()
        return sorted(resultado, key=lambda d: DIAS_SEMANA.index(d.dia_semana))

    @staticmethod
    def listar_equipo(db: Session) -> list[dict]:
        usuarios = db.execute(select(Usuario).where(Usuario.activo.is_(True))).scalars().all()
        return [
            {
                "usuario_id": u.id,
                "nombre": u.nombre,
                "rol": u.rol_name,
                "dias": HorarioUsuarioService.obtener_horario(db, u.id),
            }
            for u in usuarios
        ]
