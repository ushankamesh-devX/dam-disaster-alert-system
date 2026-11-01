from secrets import compare_digest

from fastapi import Request
from fastapi.responses import JSONResponse

from app.common.config import Settings


def authenticate_service(request: Request, settings: Settings) -> JSONResponse | None:
    """Fail closed for every route except the explicit public allowlist."""
    scheme, _, token = request.headers.get("Authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        return JSONResponse(
            status_code=401,
            content={"detail": "Service authentication required"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    if settings.incoming_service_token is None:
        return JSONResponse(
            status_code=503,
            content={"detail": "Service authentication is not configured"},
        )
    expected = settings.incoming_service_token.get_secret_value()
    if not compare_digest(token.encode("utf-8"), expected.encode("utf-8")):
        return JSONResponse(
            status_code=401,
            content={"detail": "Invalid service credentials"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    return None
