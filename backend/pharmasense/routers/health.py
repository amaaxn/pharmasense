from fastapi import APIRouter

from pharmasense.schemas.common import ApiResponse

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health_check() -> ApiResponse[dict]:
    return ApiResponse.ok({"status": "healthy", "version": "1.0.0"})
