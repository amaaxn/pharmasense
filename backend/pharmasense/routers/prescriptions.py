from fastapi import APIRouter, Depends

from pharmasense.dependencies.auth import AuthenticatedUser, get_current_user, require_role
from pharmasense.schemas.common import ApiResponse
from pharmasense.schemas.recommendation import RecommendationRequest, RecommendationResponse
from pharmasense.schemas.validation import ValidationRequest, ValidationResponse
from pharmasense.schemas.receipt import PrescriptionReceipt

router = APIRouter(prefix="/api/prescriptions", tags=["prescriptions"])


@router.post("/recommend")
async def recommend(
    body: RecommendationRequest,
    user: AuthenticatedUser = Depends(require_role("clinician")),
) -> ApiResponse[RecommendationResponse]:
    return ApiResponse.ok(
        RecommendationResponse(
            visit_id=body.visit_id,
            recommendations=[],
        )
    )


@router.post("/validate")
async def validate(
    body: ValidationRequest,
    user: AuthenticatedUser = Depends(require_role("clinician")),
) -> ApiResponse[ValidationResponse]:
    return ApiResponse.ok(
        ValidationResponse(
            visit_id=body.visit_id,
            patient_id=body.patient_id,
            all_passed=True,
            results=[],
            blocked=False,
        )
    )


@router.post("/approve")
async def approve(user: AuthenticatedUser = Depends(require_role("clinician"))) -> ApiResponse[dict]:
    return ApiResponse.ok({})


@router.post("/reject")
async def reject(user: AuthenticatedUser = Depends(require_role("clinician"))) -> ApiResponse[dict]:
    return ApiResponse.ok({})


@router.get("")
async def list_prescriptions(user: AuthenticatedUser = Depends(get_current_user)) -> ApiResponse[list]:
    return ApiResponse.ok([])


@router.get("/{prescription_id}")
async def get_prescription(
    prescription_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
) -> ApiResponse[dict]:
    return ApiResponse.ok({"prescription_id": prescription_id})


@router.get("/{prescription_id}/receipt")
async def get_receipt(
    prescription_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
) -> ApiResponse[PrescriptionReceipt | None]:
    return ApiResponse.ok(None)


@router.post("/{prescription_id}/patient-pack")
async def generate_patient_pack(
    prescription_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
) -> ApiResponse[dict]:
    return ApiResponse.ok({"prescription_id": prescription_id})
