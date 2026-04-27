from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, catalogo, usuario, cliente

app = FastAPI(
    title="JuanFer Seguros API V1",
    description="Api para gestión de pólizas",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(catalogo.router, prefix="/api/v1")
app.include_router(usuario.router, prefix="/api/v1")
app.include_router(cliente.router, prefix="/api/v1")

# Ruta de prueba
@app.get("/")
def read_root():
    return {"message": "API funcionando correctamente 🚀"}

# Health check (útil para monitoreo)
@app.get("/health")
def health_check():
    return {"status": "ok"}