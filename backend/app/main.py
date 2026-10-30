from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import auth, catalogo, usuario, cliente, poliza, dashboard, prospecto, formulario, formulario_publico, horario_usuario, empresa

app = FastAPI(
    title="JuanFer Seguros API V1",
    description="Api para gestión de pólizas",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(catalogo.router, prefix="/api/v1")
app.include_router(usuario.router, prefix="/api/v1")
app.include_router(cliente.router, prefix="/api/v1")
app.include_router(poliza.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(prospecto.router, prefix="/api/v1")
app.include_router(formulario.router, prefix="/api/v1")
app.include_router(formulario_publico.router, prefix="/api/v1")
app.include_router(horario_usuario.router, prefix="/api/v1")
app.include_router(empresa.router, prefix="/api/v1")

# Health check (útil para monitoreo)
@app.get("/health")
def health_check():
    return {"status": "ok"}