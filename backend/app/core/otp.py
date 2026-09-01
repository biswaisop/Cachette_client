from sqlalchemy import true
import secrets
import hashlib
from app.core.redis_client import RedisClient

OTP_TTL_SECONDS = 300 # 5 minutes
MAX_OTP_ATTEMPTS = 5

def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"

def hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode()).hexdigest()

async def store_otp(email: str, otp: str, redis_client: RedisClient):
    await redis_client.setex(f"otp:{email}", OTP_TTL_SECONDS, hash_otp(otp))

async def verify_and_consume_otp(email: str, submmitted_otp: str, redis_client: RedisClient) -> bool:
    key = f"otp:{email}"
    stored_hash = await redis_client.get(key)
    if stored_hash is None or stored_hash != hash_otp(submmitted_otp):
        return False
    await redis_client.delete(key)
    await redis_client.delete(f"otp_attempts:{email}")
    return True

async def check_and_increment_attempts(email: str, redis_client: RedisClient) -> bool:
    key = f"otp_attempts:{email}"
    attempts = await redis_client.incr(key)
    if attempts == 1:
        await redis_client.expire(key, OTP_TTL_SECONDS)
    return attempts <= MAX_OTP_ATTEMPTS