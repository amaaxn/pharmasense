import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class SafetyBlockError(Exception):
    """Raised when Gemini's promptFeedback.blockReason is non-null."""

    def __init__(self, reason: str = "Content blocked by safety filters"):
        self.reason = reason
        super().__init__(self.reason)


class ValidationError(Exception):
    """Raised when parsed Gemini output fails business-rule validation."""

    def __init__(self, field: str, message: str, operation: str = ""):
        self.field = field
        self.message = message
        self.operation = operation
        super().__init__(f"[{operation}] Validation failed on '{field}': {message}")


class ResourceNotFoundError(Exception):
    """Raised when a requested resource does not exist."""

    def __init__(self, resource: str, identifier: str = ""):
        self.resource = resource
        self.identifier = identifier
        msg = f"{resource} not found"
        if identifier:
            msg = f"{resource} '{identifier}' not found"
        super().__init__(msg)


def _error_response(status_code: int, error: str, error_code: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "data": None,
            "error": error,
            "error_code": error_code,
        },
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Wire all custom and built-in exceptions to the standard ApiResponse envelope."""

    @app.exception_handler(ResourceNotFoundError)
    async def _not_found(request: Request, exc: ResourceNotFoundError) -> JSONResponse:
        return _error_response(404, str(exc), "NOT_FOUND")

    @app.exception_handler(ValidationError)
    async def _validation(request: Request, exc: ValidationError) -> JSONResponse:
        return _error_response(400, str(exc), "VALIDATION_FAILED")

    @app.exception_handler(SafetyBlockError)
    async def _safety_block(request: Request, exc: SafetyBlockError) -> JSONResponse:
        return _error_response(422, exc.reason, "SAFETY_BLOCKED")

    @app.exception_handler(RequestValidationError)
    async def _request_validation(request: Request, exc: RequestValidationError) -> JSONResponse:
        return _error_response(400, str(exc), "INVALID_REQUEST")

    @app.exception_handler(HTTPException)
    async def _http_exception(request: Request, exc: HTTPException) -> JSONResponse:
        code_map = {
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            422: "SAFETY_BLOCKED",
        }
        error_code = code_map.get(exc.status_code, "HTTP_ERROR")
        return _error_response(exc.status_code, exc.detail or "HTTP error", error_code)

    @app.exception_handler(Exception)
    async def _catch_all(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled exception: %s", exc)
        return _error_response(500, "An internal error occurred", "INTERNAL_ERROR")
