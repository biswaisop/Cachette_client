from app import dependencies
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.db.session import get_db
from app.schema.user import UserCreate, UserLogin, UserOut, TokenResponse, ForgotPasswordRequest, ResetPasswordRequest
from app.service.auth_service import create_user, authenticate_user, create_refresh_token, create_tokens_for_user
from app.core.security import decode_token
from app.service.auth_service import get_user_by_email
from app.models.user import User
from app.dependencies import get_current_user, rate_limit, auth_limiter, general_limiter, rate_limit_user
from app.core.otp import generate_otp, store_otp, verify_and_consume_otp, check_and_increment_attempts
from app.core.redis_client import RedisClient
from app.core.security import hash_password
from app.service.email import send_otp_email



router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limit(auth_limiter, lambda r: r.client.host))])
async def signup(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    user = await create_user(db, user_data)
    return user

@router.post("/login", response_model=TokenResponse, dependencies=[Depends(rate_limit(auth_limiter, lambda r: r.client.host))])
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, credentials.email, credentials.password)
    return create_tokens_for_user(user)

@router.post("/refresh", response_model=TokenResponse, dependencies=[Depends(rate_limit(auth_limiter, lambda r: r.client.host))])
async def refresh(refresh_token: str, db: AsyncSession = Depends(get_db)):
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = UUID(payload["sub"])
    token_ver = payload.get("ver")
    result = await db.get(User, user_id)
    if not result or token_ver != result.token_version:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    return create_tokens_for_user(result)

@router.get("/me", response_model=UserOut, dependencies=[Depends(rate_limit_user(general_limiter))])
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password", dependencies=[Depends(rate_limit(auth_limiter, lambda r: r.client.host))])
async def forgot_password(
    body: ForgotPasswordRequest, 
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_by_email(db, body.email)
    if user:
        otp = generate_otp()
        redisclient = await RedisClient.get()
        await store_otp(body.email, otp, redisclient)
        await send_otp_email(body.email, otp)
    return {"message": "If an account exists with that email, a code has been sent."}

@router.post("/reset-password", dependencies=[Depends(rate_limit(auth_limiter, lambda r: r.client.host))])
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    redis_client = await RedisClient.get()

    if not await check_and_increment_attempts(body.email, redis_client):
        raise HTTPException(status_code=429, detail="Too many attempts. Request a new code.")
    
    if not await verify_and_consume_otp(body.email, body.otp, redis_client):
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    
    user = await get_user_by_email(db, body.email)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    
    user.hashed_password = hash_password(body.new_password)
    user.token_version += 1

    await db.commit()

    return {"message": "Password reset successful"}