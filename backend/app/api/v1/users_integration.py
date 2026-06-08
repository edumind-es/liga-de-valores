from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, HttpUrl
from typing import Optional

from app.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.core.cryptography import crypto
from app.services.nextcloud_service import NextcloudService

router = APIRouter()

# Schemas
class NextcloudConfigRead(BaseModel):
    nextcloud_url: Optional[str]
    nextcloud_user: Optional[str]
    is_configured: bool

class NextcloudConfigUpdate(BaseModel):
    nextcloud_url: str
    nextcloud_user: str
    nextcloud_password: str # Plain text from frontend, will be encrypted

class TestConnectionRequest(BaseModel):
    nextcloud_url: str
    nextcloud_user: str
    nextcloud_password: str

@router.get("/me/integration/nextcloud", response_model=NextcloudConfigRead)
async def get_nextcloud_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene la configuración actual de Nextcloud del usuario (sin contraseña)."""
    # Recargar usuario para asegurar datos frescos
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    
    is_configured = bool(user.nextcloud_url and user.nextcloud_user and user.nextcloud_password_enc)
    
    return NextcloudConfigRead(
        nextcloud_url=user.nextcloud_url,
        nextcloud_user=user.nextcloud_user,
        is_configured=is_configured
    )

@router.put("/me/integration/nextcloud", response_model=NextcloudConfigRead)
async def update_nextcloud_config(
    config: NextcloudConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Actualiza la configuración de Nextcloud y encripta la contraseña."""
    
    # Validar URL básica
    if not config.nextcloud_url.startswith("http"):
        raise HTTPException(status_code=400, detail="La URL debe comenzar con http:// o https://")
        
    # Encriptar contraseña
    encrypted_password = crypto.encrypt(config.nextcloud_password)
    
    # Actualizar usuario via consulta directa
    # (Evitamos usar el objeto current_user directamente por si está detached)
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    
    user.nextcloud_url = config.nextcloud_url
    user.nextcloud_user = config.nextcloud_user
    user.nextcloud_password_enc = encrypted_password
    
    await db.commit()
    await db.refresh(user)
    
    return NextcloudConfigRead(
        nextcloud_url=user.nextcloud_url,
        nextcloud_user=user.nextcloud_user,
        is_configured=True
    )

@router.post("/me/integration/nextcloud/test")
async def test_nextcloud_connection(
    config: TestConnectionRequest,
    current_user: User = Depends(get_current_user)
):
    """Prueba la conexión con credenciales proporcionadas (sin guardarlas)."""
    
    # Instanciar servicio temporal
    service = NextcloudService(
        username=config.nextcloud_user,
        password=config.nextcloud_password,
        url=config.nextcloud_url
    )
    
    # Intentar verificar/crear una carpeta de prueba
    test_path = "Evidencias_Liga/TEST_CONEXION"
    success = await service.ensure_folder_exists(test_path)
    
    if success:
        return {"status": "success", "message": "Conexión exitosa. Se pudo acceder a la carpeta de evidencias."}
    else:
        raise HTTPException(
            status_code=400, 
            detail="No se pudo conectar. Verifica la URL y las credenciales. Asegúrate de que la URL termine en /remote.php/dav/files/USUARIO/"
        )

@router.delete("/me/integration/nextcloud", status_code=status.HTTP_204_NO_CONTENT)
async def delete_nextcloud_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Elimina la configuración de Nextcloud del usuario."""
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    
    user.nextcloud_url = None
    user.nextcloud_user = None
    user.nextcloud_password_enc = None
    
    await db.commit()
    return None
