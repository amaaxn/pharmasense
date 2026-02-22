import logging

from fastapi import FastAPI, Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("pharmasense")


class ResourceNotFoundError(Exception):
    def __init__(self, resource: str, identifier: str | None = None):
        self.resource = resource
        self.identifier = identifier
        msg = f"{resource} not found"
        if identifier:
            msg += f": {identifier}"
        super().__init__(msg)


class SafetyBlockError(Exception):
    def __init__(self, reason: str, details: dict | None = None):
        self.reason = reason
        self.details = details or {}
        super().__init__(reason)


class ValidationError(Exception):
    def __init__(self, message: str, field: str | None = None):
        self.message = message
        self.field = field
        super().__init__(message)


def _error_response(
    status: int,
    code: str,
    message: str,
    details: dict | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={
            "success": False,
            "data": None,
            "error": {
                "code": code,
                "message": message,
                "details": details,
            },
        },
    )


def register_exception_handlers(app: FastAPI) -> None:

    @app.exception_handler(ResourceNotFoundError)
    async def not_found_handler(_req: Request, exc: ResourceNotFoundError):
        return _error_response(404, "NOT_FOUND", str(exc))

    @app.exception_handler(ValidationError)
    async def validation_handler(_req: Request, exc: ValidationError):
        return _error_response(400, "VALIDATION_FAILED", exc.message)

    @app.exception_handler(SafetyBlockError)
    async def safety_handler(_req: Request, exc: SafetyBlockError):
        return _error_response(422, "SAFETY_BLOCKED", exc.reason, exc.details)

    @app.exception_handler(RequestValidationError)
    async def request_validation_handler(_req: Request, exc: RequestValidationError):
        return _error_response(400, "INVALID_REQUEST", str(exc))

    @app.exception_handler(StarletteHTTPException)
    async def starlette_http_handler(_req: Request, exc: StarletteHTTPException):
        code_map = {401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "NOT_FOUND"}
        code = code_map.get(exc.status_code, f"HTTP_{exc.status_code}")
        detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
        return _error_response(exc.status_code, code, detail)

    @app.exception_handler(HTTPException)
    async def http_handler(_req: Request, exc: HTTPException):
        code_map = {401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "NOT_FOUND"}
        code = code_map.get(exc.status_code, f"HTTP_{exc.status_code}")
        return _error_response(exc.status_code, code, exc.detail or "")

    @app.exception_handler(Exception)
    async def catch_all_handler(_req: Request, exc: Exception):
        logger.exception("Unhandled exception: %s", exc)
        return _error_response(500, "INTERNAL_ERROR", "An unexpected error occurred.")
