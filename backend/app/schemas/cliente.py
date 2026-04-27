from pydantic import BaseModel, Field

class ClienteBase(BaseModel):
    id: int
    nombre: str = Field(..., max_length=150)

class ClienteRead(ClienteBase):
    tipo_documento: str = Field(alias="tipo_de_documento")
    numero_documento: str
    celular: str