from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.security import decode_token
from app.models.user import User
from app.service.s3_service import S3Service
from app.core.rate_limiter import Token_Bucket_Rate_Limiter


security_scheme = HTTPBearer(auto_error=False)

async def get_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
        db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate":"Bearer"}
    )

    if credentials is None:
        raise credentials_exception


    token = credentials.credentials
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise credentials_exception

    user_id = payload.get("sub")
    token_ver = payload.get("ver")
    if user_id is None:
        raise credentials_exception

    user = await db.get(User, user_id)
    if user is None or token_ver != user.token_version:
        raise credentials_exception

    return user

def get_s3_service() -> S3Service:
    return S3Service()

def rate_limit(limiter: Token_Bucket_Rate_Limiter, get_identifier):
    async def dependency(request: Request):
        identifier = get_identifier(request)
        if not await limiter.check(identifier):
            raise HTTPException(status_code=429, detail="Too many requests", headers={"Retry-After": "1"})
    return dependency


def rate_limit_user(limiter: Token_Bucket_Rate_Limiter):
    async def dependency(current_user: User = Depends(get_current_user)):
        if not await limiter.check(str(current_user.id)):
            raise HTTPException(status_code=429, detail="Too many requests", headers={"Retry-After": "1"})
    return dependency


# capacity 5, refills 1 token every 60s — tight, since this guards brute-force/enumeration
auth_limiter = Token_Bucket_Rate_Limiter(capacity=5, refill_rate=1 / 60, key_prefix="ratelimit:auth")

# capacity 60, refills 1 token/sec — generous general-purpose limit for authenticated users
general_limiter = Token_Bucket_Rate_Limiter(capacity=40, refill_rate=1/2, key_prefix="ratelimit:user")