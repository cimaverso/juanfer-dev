# app/models/__init__.py

# 1. Auditoria
from app.models.auditoria import auditoria

# 2. Catalogos
from app.models.catalogos import (
    aseguradora, banco, catalogo_tipo, catalogo_valor, categoria_mensaje,
    estado_cambio_intermediario, estado_cotizacion, estado_poliza,
    estado_prospecto, estado_tramite_banco, nivel_alerta, producto, ramo,
    tipo_documento
)

# 3. Dashboard Alertas
from app.models.dashboard_alertas import config_alerta

# 4. Formularios
from app.models.formularios import (
    formulario, formulario_grupo_pregunta, formulario_pregunta,
    formulario_respuesta, formulario_version
)

# 5. Historial
from app.models.historial import historial_responsable_cliente, historial_responsable

# 6. Modulos de Negocio
from app.models.modulos_negocio import cotizacion, nota_prospecto, poliza, prospecto, tarea

# 7. Operaciones
from app.models.operaciones import cambio_intermediario, cancelacion, endoso_banco, conversacion, mensaje

# 8. Plantillas de Conocimiento
from app.models.plantillas_conocimiento import link_proceso, plantilla_mensaje

# 9. Roles y Permisos
from app.models.roles_permisos import permiso, rol_permiso, rol

# 10. Usuarios y Clientes
from app.models.usuarios_clientes import cliente, usuario, horario_usuario, empresa