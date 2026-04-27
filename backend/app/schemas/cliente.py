from pydantic import BaseModel, Field

class ClienteBase(BaseModel):
    nombre_completo: str = Field(..., max_length=150)
    numero_documento: str

    class Config:
        populate_by_name = True

class ClienteCreate(ClienteBase):
    tipo_documento_id: int
    celular: str = Field(..., max_length=20)
    responsable_id: int  

class ClienteRead(ClienteBase):
    id: int
    celular: str
    tipo_de_documento: str = Field(..., alias="tipo_de_documento")

    class Config:
        from_attributes = True