from pydantic import BaseModel, Field, EmailStr, ConfigDict

class UsuarioBase(BaseModel):
    id: int
    nombre: str = Field(..., max_length=100)
    email: EmailStr
    rol: str = Field(validation_alias="rol_name")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class UsuarioRead(UsuarioBase):
    iniciales: str

    class Config:
        populate_by_name = True
        from_attributes = True