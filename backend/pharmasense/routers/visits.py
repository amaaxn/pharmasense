from fastapi import APIRouter, Depends

from pharmasense.dependencies.auth import AuthenticatedUser, get_current_user, require_role
from pharmasense.schemas.common import ApiResponse

router = APIRouter(prefix="/api/visits", tags=["visits"])


@router.post("")
async def create_visit(user: AuthenticatedUser = Depends(require_role("clinician"))) -> ApiResponse[dict]:
    return ApiResponse.ok({})


@router.get("")
async def list_visits(user: AuthenticatedUser = Depends(get_current_user)) -> ApiResponse[list]:
    return ApiResponse.ok([])


@router.get("/{visit_id}")
async def get_visit(visit_id: str, user: AuthenticatedUser = Depends(get_current_user)) -> ApiResponse[dict]:
    return ApiResponse.ok({"visit_id": visit_id})


@router.put("/{visit_id}")
async def update_visit(visit_id: str, user: AuthenticatedUser = Depends(require_role("clinician"))) -> ApiResponse[dict]:
    return ApiResponse.ok({"visit_id": visit_id})


@router.post("/{visit_id}/extract")
async def extract_visit(visit_id: str, user: AuthenticatedUser = Depends(require_role("clinician"))) -> ApiResponse[dict]:
    return ApiResponse.ok({"visit_id": visit_id})
