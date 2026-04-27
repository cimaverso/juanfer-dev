from pydantic import BaseModel

class CatalogoBase(BaseModel):
    id: int
    nombre: str

class EstadoPolizaRead(CatalogoBase):
    color: str

class AseguradoraRead(CatalogoBase):
    pass

class ProductoRead(CatalogoBase):
    pass

class RamoRead(CatalogoBase):
    codigo: str

class TiposDocumentoRead(CatalogoBase):
    pass