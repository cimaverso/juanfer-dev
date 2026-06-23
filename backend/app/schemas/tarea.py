from pydantic import BaseModel

class TareaBase(BaseModel):
    id: int
    descripcion: str

    class Config:
        from_attributes = True

class TareaRead(BaseModel):
    pass