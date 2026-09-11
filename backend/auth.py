import os
import jwt
from fastapi import Header, HTTPException
from jwt import PyJWKClient

CLERK_JWKS_URL = os.environ.get("CLERK_JWKS_URL", "")  # Clerk dashboard > API Keys > "JWKS URL"
_jwk_client = PyJWKClient(CLERK_JWKS_URL) if CLERK_JWKS_URL else None

def get_current_user(authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing auth token")
    token = authorization.removeprefix("Bearer ").strip()
    if not _jwk_client:
        raise HTTPException(500, "CLERK_JWKS_URL not configured on backend")
    try:
        key = _jwk_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(token, key.key, algorithms=["RS256"], options={"verify_aud": False})
        return payload["sub"]  # Clerk user id
    except Exception as exc:
        raise HTTPException(401, f"Invalid token: {exc}") from exc